from __future__ import annotations

import json
import logging
import re

from app.agent.llm_adapter import LLMAdapter
from app.agent.retrieve import KbHit
from app.models import TicketCategory

logger = logging.getLogger(__name__)


def reason_decision(
    category: TicketCategory,
    classify_confidence: float,
    hits: list[KbHit],
    ask_clarifying_threshold: float = 0.45,
    bug_escalate_threshold: float = 0.7,
) -> str:
    """Decide: answer_directly | ask_clarifying | escalate.

    Thresholds are configurable via Settings (Workflow page) and loaded from
    AppSettings in loop.py — defaults here preserve original v1 behavior.
    """
    if classify_confidence < ask_clarifying_threshold or category == TicketCategory.unknown:
        return "ask_clarifying"
    if category == TicketCategory.bug and classify_confidence < bug_escalate_threshold:
        return "escalate"
    if not hits and classify_confidence < 0.65:
        return "ask_clarifying"
    if category == TicketCategory.bug and not hits:
        return "escalate"
    return "answer_directly"


def generate_draft(
    subject: str,
    body: str,
    category: TicketCategory,
    decision: str,
    hits: list[KbHit],
    llm: LLMAdapter,
) -> tuple[str, float]:
    context_blocks = []
    for hit in hits[:3]:
        snippet = hit.content[:800]
        context_blocks.append(f"### {hit.title}\n{snippet}")
    context = "\n\n".join(context_blocks) if context_blocks else "(no knowledge base matches)"

    guidance = {
        "answer_directly": "Write a helpful, complete reply using the knowledge base context.",
        "ask_clarifying": "Ask 1-3 clarifying questions; do not invent facts.",
        "escalate": "Acknowledge the issue, summarize what you understood, and say a human specialist will follow up.",
    }.get(decision, "Write a careful, helpful reply.")

    prompt = (
        f"Category: {category.value}\nDecision: {decision}\nGuidance: {guidance}\n\n"
        f"Ticket subject: {subject}\nTicket body:\n{body}\n\n"
        f"Knowledge base context:\n{context}\n\n"
        "Respond with JSON only: "
        '{"draft":"...","confidence":0.0-1.0}\n'
        "Do not invent policy. Do not include secrets. Be concise and professional."
    )
    raw = llm.generate(
        [
            {
                "role": "system",
                "content": (
                    "You are an AI Ops support assistant drafting replies for human review. "
                    "Never claim the message was already sent."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
    )

    try:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        data = json.loads(match.group(0) if match else raw)
        draft = str(data.get("draft", "")).strip()
        confidence = float(data.get("confidence", 0.5))
        if not draft:
            raise ValueError("empty draft")
        return draft, max(0.0, min(confidence, 1.0))
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to parse generate response: %s", exc)
        fallback = raw.strip() or (
            "Thank you for contacting us. A team member will review your request shortly."
        )
        return fallback, 0.4
