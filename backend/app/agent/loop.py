from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.agent.classify import classify_ticket
from app.agent.generate import generate_draft, reason_decision
from app.agent.llm_adapter import get_llm_adapter
from app.agent.tools import tool_save_draft, tool_search_knowledge_base
from app.agent.validate import validate_draft
from app.logging_conf import redact_dict
from app.models import AgentLog, AgentStep, AppSettings, Ticket, TicketStatus
from app.n8n_client import notify_n8n

logger = logging.getLogger(__name__)


def _log_step(
    db: Session,
    ticket_id: UUID,
    step: AgentStep,
    input_data: dict[str, Any] | None,
    output_data: dict[str, Any] | None,
) -> None:
    row = AgentLog(
        ticket_id=ticket_id,
        step=step,
        input_json=redact_dict(input_data),
        output_json=redact_dict(output_data),
    )
    db.add(row)
    db.commit()


def run_agent_loop(db: Session, ticket_id: str | UUID) -> Ticket:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise ValueError(f"Ticket {ticket_id} not found")

    llm = get_llm_adapter()
    settings_row = db.query(AppSettings).filter(AppSettings.id == 1).first()
    ask_threshold = settings_row.ask_clarifying_threshold if settings_row else 0.45
    bug_escalate_threshold = settings_row.bug_escalate_threshold if settings_row else 0.7

    # 1. Ingest
    _log_step(
        db,
        ticket.id,
        AgentStep.ingest,
        {"subject": ticket.subject, "body": ticket.body, "email": ticket.requester_email},
        {"status": "received"},
    )

    try:
        # 2. Classify
        category, class_conf = classify_ticket(ticket.subject, ticket.body, llm)
        ticket.category = category
        ticket.status = TicketStatus.classified
        ticket.confidence = class_conf
        db.commit()
        _log_step(
            db,
            ticket.id,
            AgentStep.classify,
            {"subject": ticket.subject},
            {"category": category.value, "confidence": class_conf},
        )

        # 3. Retrieve
        query = f"{category.value} {ticket.subject}"
        hits = tool_search_knowledge_base(db, query)
        _log_step(
            db,
            ticket.id,
            AgentStep.retrieve,
            {"query": query},
            {
                "hit_count": len(hits),
                "titles": [h.title for h in hits],
            },
        )

        # 4. Reason
        decision = reason_decision(
            category, class_conf, hits, ask_threshold, bug_escalate_threshold
        )
        ticket.reason_decision = decision
        db.commit()
        _log_step(
            db,
            ticket.id,
            AgentStep.reason,
            {"category": category.value, "confidence": class_conf, "hit_count": len(hits)},
            {"decision": decision},
        )

        # 5. Generate
        draft_text, gen_conf = generate_draft(
            ticket.subject, ticket.body, category, decision, hits, llm
        )
        ticket.status = TicketStatus.drafted
        ticket.confidence = gen_conf
        db.commit()
        _log_step(
            db,
            ticket.id,
            AgentStep.generate,
            {"decision": decision},
            {"draft_preview": draft_text[:300], "confidence": gen_conf},
        )

        # 6. Validate
        validation = validate_draft(draft_text)
        _log_step(
            db,
            ticket.id,
            AgentStep.validate,
            {"draft_len": len(draft_text)},
            {"ok": validation.ok, "reasons": validation.reasons},
        )
        if not validation.ok:
            ticket.status = TicketStatus.failed
            db.commit()
            notify_n8n(
                {
                    "ticket_id": str(ticket.id),
                    "status": ticket.status.value,
                    "event": "validation_failed",
                    "reasons": validation.reasons,
                }
            )
            _log_step(
                db,
                ticket.id,
                AgentStep.handoff,
                {"event": "validation_failed"},
                {"notified": True},
            )
            return ticket

        # 7. Persist
        draft = tool_save_draft(db, ticket.id, draft_text, gen_conf)
        ticket.status = TicketStatus.needs_review
        db.commit()
        _log_step(
            db,
            ticket.id,
            AgentStep.persist,
            {"draft_id": str(draft.id)},
            {"version": draft.version, "status": ticket.status.value},
        )

        # 8. Handoff
        notified = notify_n8n(
            {
                "ticket_id": str(ticket.id),
                "status": ticket.status.value,
                "category": category.value,
                "decision": decision,
                "confidence": gen_conf,
                "subject": ticket.subject,
                "event": "needs_review",
            }
        )
        _log_step(
            db,
            ticket.id,
            AgentStep.handoff,
            {"event": "needs_review"},
            {"notified": notified},
        )
        db.refresh(ticket)
        return ticket

    except Exception as exc:  # noqa: BLE001
        logger.exception("Agent loop failed for ticket %s", ticket_id)
        ticket.status = TicketStatus.failed
        db.commit()
        _log_step(
            db,
            ticket.id,
            AgentStep.handoff,
            {"event": "error"},
            {"error": str(exc)},
        )
        notify_n8n(
            {
                "ticket_id": str(ticket.id),
                "status": "failed",
                "event": "agent_error",
                "error": str(exc),
            }
        )
        return ticket
