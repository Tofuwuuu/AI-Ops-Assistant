"""Redis queue worker: BLPOP ticket IDs and run the agent loop."""

from __future__ import annotations

import logging
import signal
import sys
import time

from sqlalchemy import text

from app.agent.loop import run_agent_loop
from app.agent.retrieve import seed_kb_docs
from app.config import get_settings
from app.db import Base, SessionLocal, engine
from app.logging_conf import setup_logging
from app.redis_client import get_redis

setup_logging()
logger = logging.getLogger("worker")

_running = True


def _handle_signal(signum: int, _frame: object) -> None:
    global _running
    logger.info("Received signal %s — shutting down", signum)
    _running = False


def _ensure_schema() -> None:
    """Create tables if the API has not run migrations/create_all yet."""
    for attempt in range(30):
        try:
            Base.metadata.create_all(bind=engine)
            with engine.begin() as conn:
                conn.execute(
                    text(
                        """
                        CREATE INDEX IF NOT EXISTS ix_kb_docs_search_vector
                        ON kb_docs USING GIN (search_vector)
                        """
                    )
                )
            return
        except Exception as exc:  # noqa: BLE001
            logger.warning("Waiting for database (attempt %s): %s", attempt + 1, exc)
            time.sleep(2)
    raise RuntimeError("Database not ready after retries")


def main() -> None:
    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    settings = get_settings()
    redis = get_redis()
    queue = settings.agent_queue_key

    _ensure_schema()

    with SessionLocal() as db:
        seeded = seed_kb_docs(db)
        if seeded:
            logger.info("KB seed complete (%s docs)", seeded)

    logger.info("Worker listening on Redis queue '%s'", queue)

    while _running:
        try:
            item = redis.blpop(queue, timeout=5)
            if not item:
                continue
            _, ticket_id = item
            logger.info("Processing ticket %s", ticket_id)
            with SessionLocal() as db:
                ticket = run_agent_loop(db, ticket_id)
                logger.info("Ticket %s finished with status=%s", ticket.id, ticket.status.value)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Worker iteration error: %s", exc)
            time.sleep(2)

    logger.info("Worker stopped")
    sys.exit(0)


if __name__ == "__main__":
    main()
