"""Bring the database to the latest Alembic revision.

    python -m app.migrate

Docker Compose runs this before the API starts. A database that only ever saw
Base.metadata.create_all has the tables but no alembic_version row; it is
stamped at 004_ghl_expansion (the last revision create_all covered), and the
idempotent 005_ghl_tables then fills in anything still missing. Every other
database just runs `alembic upgrade head`.

The API's own startup still calls create_all, which is a no-op once this has
run, so hosts that do not run this command behave as before.
"""

from __future__ import annotations

import logging
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.db import engine

logger = logging.getLogger("migrate")

LEGACY_STAMP = "004_ghl_expansion"
ALEMBIC_INI = Path(__file__).resolve().parents[1] / "alembic.ini"


def migrate() -> None:
    cfg = Config(str(ALEMBIC_INI))
    cfg.set_main_option("script_location", str(ALEMBIC_INI.parent / "alembic"))
    tables = set(inspect(engine).get_table_names())
    if "alembic_version" not in tables and "tickets" in tables:
        logger.warning("Tables exist without alembic_version; stamping %s", LEGACY_STAMP)
        command.stamp(cfg, LEGACY_STAMP)
    command.upgrade(cfg, "head")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    migrate()
    print("Database is at the latest migration.")
