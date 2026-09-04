from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.agent.retrieve import KbHit, search_knowledge_base
from app.models import Draft, Ticket


def tool_search_knowledge_base(db: Session, query: str) -> list[KbHit]:
    return search_knowledge_base(db, query)


def tool_get_ticket(db: Session, ticket_id: str | UUID) -> Ticket | None:
    return db.query(Ticket).filter(Ticket.id == ticket_id).first()


def tool_save_draft(
    db: Session,
    ticket_id: str | UUID,
    draft: str,
    confidence: float,
) -> Draft:
    ticket = tool_get_ticket(db, ticket_id)
    if not ticket:
        raise ValueError(f"Ticket {ticket_id} not found")

    version = len(ticket.drafts) + 1
    row = Draft(ticket_id=ticket.id, content=draft, confidence=confidence, version=version)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
