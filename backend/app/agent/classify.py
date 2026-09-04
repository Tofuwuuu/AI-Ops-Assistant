from __future__ import annotations

import json
import logging
import re

from app.agent.llm_adapter import LLMAdapter
from app.models import TicketCategory

logger = logging.getLogger(__name__)

CATEGORY_KEYWORDS: dict[TicketCategory, list[str]] = {
    TicketCategory.billing: ["bill", "invoice", "payment", "refund", "charge", "subscription"],
    TicketCategory.bug: ["bug", "error", "crash", "broken", "fail", "issue", "not working"],
    TicketCategory.feature: ["feature", "request", "wishlist", "enhancement", "add support"],
    TicketCategory.how_to: ["how do", "how to", "help me", "guide", "reset", "where can"],
}


def _rule_classify(text: str) -> tuple[TicketCategory, float] | None:
    lower = text.lower()
    scores: dict[TicketCategory, int] = {cat: 0 for cat in CATEGORY_KEYWORDS}
    for cat, words in CATEGORY_KEYWORDS.items():
        for word in words:
            if word in lower:
                scores[cat] += 1
    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return None
    confidence = min(0.55 + 0.1 * scores[best], 0.9)
    return best, confidence


def classify_ticket(subject: str, body: str, llm: LLMAdapter) -> tuple[TicketCategory, float]:
    combined = f"{subject}\n{body}"
    ruled = _rule_classify(combined)
    if ruled and ruled[1] >= 0.75:
        return ruled

    prompt = (
        "Classify this support ticket into exactly one category: "
        "bug, billing, how-to, or feature.\n"
        "Respond with JSON only: {\"category\":\"...\",\"confidence\":0.0-1.0}\n\n"
        f"Subject: {subject}\nBody: {body}"
    )
    raw = llm.generate(
        [
            {"role": "system", "content": "You are a support ticket classifier. Reply with JSON only."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.0,
    )
    try:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        data = json.loads(match.group(0) if match else raw)
        category_raw = str(data.get("category", "unknown")).lower().replace("_", "-")
        confidence = float(data.get("confidence", 0.5))
        mapping = {
            "bug": TicketCategory.bug,
            "billing": TicketCategory.billing,
            "how-to": TicketCategory.how_to,
            "howto": TicketCategory.how_to,
            "feature": TicketCategory.feature,
        }
        category = mapping.get(category_raw, TicketCategory.unknown)
        return category, max(0.0, min(confidence, 1.0))
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to parse classify response: %s | raw=%s", exc, raw[:200])
        if ruled:
            return ruled
        return TicketCategory.unknown, 0.3
