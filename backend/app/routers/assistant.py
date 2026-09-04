from __future__ import annotations

import json
import logging
import re

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.agent.llm_adapter import get_llm_adapter
from app.agent.tools import tool_search_knowledge_base
from app.db import get_db
from app.schemas import AssistantAskRequest, AssistantAskResponse, KbSourceOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/assistant", tags=["assistant"])

# Relevance is displayed as a descending heuristic bucket per rank position,
# since raw Postgres ts_rank magnitudes aren't meaningful as a percentage.
_RELEVANCE_BUCKETS = [92, 78, 64, 50, 38]


@router.post("/ask", response_model=AssistantAskResponse)
def ask_assistant(
    payload: AssistantAskRequest,
    db: Session = Depends(get_db),
) -> AssistantAskResponse:
    """Ad-hoc question answering — reuses the real retrieve + generate agent steps,
    independent of any ticket. Used by the AI Assistant page."""
    question = payload.question.strip()
    hits = tool_search_knowledge_base(db, question)

    context_blocks = []
    for hit in hits[:4]:
        context_blocks.append(f"### {hit.title}\n{hit.content[:800]}")
    context = "\n\n".join(context_blocks) if context_blocks else "(no knowledge base matches)"

    llm = get_llm_adapter()
    prompt = (
        f"User question: {question}\n\n"
        f"Knowledge base context:\n{context}\n\n"
        "Respond with JSON only: {\"draft\":\"...\",\"confidence\":0.0-1.0}\n"
        "Answer using only the knowledge base context. If the context doesn't cover it, say so. "
        "Do not invent policy. Do not include secrets. Be concise and professional."
    )
    raw = llm.generate(
        [
            {
                "role": "system",
                "content": (
                    "You are an AI Ops support assistant answering ad-hoc questions for "
                    "human agents. Never claim the message was already sent to a customer."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
    )

    try:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        data = json.loads(match.group(0) if match else raw)
        answer = str(data.get("draft", "")).strip() or raw.strip()
        confidence = max(0.0, min(float(data.get("confidence", 0.5)), 1.0))
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to parse assistant response: %s", exc)
        answer = raw.strip() or "No answer could be generated from the knowledge base."
        confidence = 0.3

    sources = [
        KbSourceOut(
            title=hit.title,
            snippet=hit.content.strip().split("\n", 1)[-1][:180].strip(),
            tags=hit.tags,
            relevance=_RELEVANCE_BUCKETS[i] if i < len(_RELEVANCE_BUCKETS) else 25,
        )
        for i, hit in enumerate(hits[:5])
    ]

    return AssistantAskResponse(answer=answer, confidence=confidence, sources=sources)
