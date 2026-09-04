from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import KbDoc

logger = logging.getLogger(__name__)


@dataclass
class KbHit:
    id: str
    title: str
    content: str
    tags: str | None
    rank: float


def seed_kb_docs(db: Session) -> int:
    """Load markdown files from KB_DOCS_PATH into kb_docs if table is empty."""
    existing = db.query(KbDoc).count()
    if existing > 0:
        return 0

    settings = get_settings()
    kb_path = Path(settings.kb_docs_path)
    if not kb_path.exists():
        logger.warning("KB path %s does not exist; skipping seed", kb_path)
        return 0

    count = 0
    for md_file in sorted(kb_path.glob("*.md")):
        raw = md_file.read_text(encoding="utf-8")
        title = md_file.stem.replace("-", " ").title()
        title_match = re.search(r"^#\s+(.+)$", raw, re.MULTILINE)
        if title_match:
            title = title_match.group(1).strip()
        tags_match = re.search(r"^Tags:\s*(.+)$", raw, re.MULTILINE | re.IGNORECASE)
        tags = tags_match.group(1).strip() if tags_match else None

        doc = KbDoc(id=uuid4(), title=title, content=raw, tags=tags)
        db.add(doc)
        db.flush()
        db.execute(
            text(
                "UPDATE kb_docs SET search_vector = "
                "to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'') || ' ' || coalesce(tags,'')) "
                "WHERE id = :id"
            ),
            {"id": str(doc.id)},
        )
        count += 1

    db.commit()
    logger.info("Seeded %s knowledge base documents", count)
    return count


def search_knowledge_base(db: Session, query: str, limit: int = 5) -> list[KbHit]:
    """Keyword / full-text search over kb_docs."""
    q = (query or "").strip()
    if not q:
        return []

    # Prefer shorter, high-signal terms for FTS (drop punctuation noise).
    terms = re.findall(r"[A-Za-z0-9]{3,}", q.lower())
    # Deduplicate while preserving order
    seen: set[str] = set()
    clean_terms: list[str] = []
    for t in terms:
        if t not in seen:
            seen.add(t)
            clean_terms.append(t)
    fts_query = " ".join(clean_terms[:12]) or q

    rows = db.execute(
        text(
            """
            SELECT id::text, title, content, tags,
                   ts_rank(search_vector, plainto_tsquery('english', :q)) AS rank
            FROM kb_docs
            WHERE search_vector @@ plainto_tsquery('english', :q)
            ORDER BY rank DESC
            LIMIT :limit
            """
        ),
        {"q": fts_query, "limit": limit},
    ).fetchall()

    if not rows and clean_terms:
        # OR-match individual keywords via ILIKE
        clauses = " OR ".join(
            f"(title ILIKE :t{i} OR content ILIKE :t{i} OR coalesce(tags,'') ILIKE :t{i})"
            for i in range(min(len(clean_terms), 6))
        )
        params: dict[str, object] = {"limit": limit}
        for i, term in enumerate(clean_terms[:6]):
            params[f"t{i}"] = f"%{term}%"
        rows = db.execute(
            text(
                f"""
                SELECT id::text, title, content, tags, 0.1 AS rank
                FROM kb_docs
                WHERE {clauses}
                LIMIT :limit
                """
            ),
            params,
        ).fetchall()

    return [
        KbHit(id=r[0], title=r[1], content=r[2], tags=r[3], rank=float(r[4] or 0))
        for r in rows
    ]
