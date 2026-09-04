import logging
import os
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.agent.retrieve import seed_kb_docs
from app.auth import hash_password
from app.config import get_settings
from app.db import Base, SessionLocal, engine
from app.logging_conf import setup_logging
from app.models import Account, AccountMember, AccountType, AppSettings, MemberRole, User
from app.routers import (
    agency,
    assistant,
    auth,
    calendar,
    campaigns,
    crm,
    funnels,
    payments,
    settings as settings_router,
    tickets,
    webhooks,
)
from app.schemas import HealthOut

setup_logging()
logger = logging.getLogger(__name__)
settings = get_settings()


def _ensure_columns() -> None:
    """Idempotent ALTER TABLE for existing DBs that predate account scoping."""
    alters = [
        "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS account_id UUID",
        "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS contact_id UUID",
        "ALTER TABLE kb_docs ADD COLUMN IF NOT EXISTS account_id UUID",
        "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS account_id UUID",
        "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS sentiment_priority_threshold DOUBLE PRECISION DEFAULT 0.5",
        "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS tier_ticket_share_threshold DOUBLE PRECISION DEFAULT 0.2",
    ]
    with engine.begin() as conn:
        for stmt in alters:
            try:
                conn.execute(text(stmt))
            except Exception as exc:  # noqa: BLE001
                logger.warning("Schema alter skipped: %s (%s)", stmt, exc)
        conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_kb_docs_search_vector
                ON kb_docs USING GIN (search_vector)
                """
            )
        )


def _bootstrap_default_account() -> None:
    """Ensure at least one agency account + demo user exist; backfill orphan tickets."""
    with SessionLocal() as db:
        account = db.query(Account).order_by(Account.created_at).first()
        if not account:
            account = Account(
                name="Demo Agency",
                slug="demo-agency",
                type=AccountType.agency,
                branding_json={"name": "Archivist", "primaryColor": "#2563eb"},
            )
            db.add(account)
            db.flush()
            user = db.query(User).filter(User.email == "admin@demo.example.com").first()
            if not user:
                user = User(
                    email="admin@demo.example.com",
                    hashed_password=hash_password("demo1234"),
                    display_name="Demo Admin",
                )
                db.add(user)
                db.flush()
            if not (
                db.query(AccountMember)
                .filter(AccountMember.user_id == user.id, AccountMember.account_id == account.id)
                .first()
            ):
                db.add(
                    AccountMember(
                        user_id=user.id, account_id=account.id, role=MemberRole.owner
                    )
                )
            if not db.query(AppSettings).filter(AppSettings.account_id == account.id).first():
                legacy = db.query(AppSettings).filter(AppSettings.account_id.is_(None)).first()
                if legacy:
                    legacy.account_id = account.id
                else:
                    db.add(AppSettings(id=AppSettings.next_id(db), account_id=account.id))
            db.commit()
            logger.info("Bootstrapped demo agency account slug=demo-agency user=admin@demo.example.com")
        else:
            db.commit()

        # Backfill orphan tickets / kb / settings
        db.execute(
            text("UPDATE tickets SET account_id = :aid WHERE account_id IS NULL"),
            {"aid": str(account.id)},
        )
        db.execute(
            text("UPDATE kb_docs SET account_id = :aid WHERE account_id IS NULL"),
            {"aid": str(account.id)},
        )
        db.execute(
            text("UPDATE app_settings SET account_id = :aid WHERE account_id IS NULL"),
            {"aid": str(account.id)},
        )
        db.commit()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_columns()
    _bootstrap_default_account()
    with SessionLocal() as db:
        seed_kb_docs(db)


def _maybe_start_inprocess_worker() -> None:
    """Run the agent-queue worker loop on a background thread inside the API
    process. Used on single-service free-tier hosts (e.g. Render's free web
    plan has no free background-worker tier) via RUN_WORKER_INPROCESS=true.
    Local docker-compose runs a dedicated `worker` service instead and leaves
    this unset."""
    if os.environ.get("RUN_WORKER_INPROCESS", "false").lower() != "true":
        return

    def _run() -> None:
        from app.worker import main as worker_main

        try:
            worker_main()
        except Exception:  # noqa: BLE001
            logger.exception("In-process worker thread crashed")

    thread = threading.Thread(target=_run, name="agent-worker", daemon=True)
    thread.start()
    logger.info("Started in-process agent worker thread")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("Starting %s", settings.app_name)
    init_db()
    _maybe_start_inprocess_worker()
    yield
    logger.info("Shutting down %s", settings.app_name)


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tickets.router)
app.include_router(webhooks.router)
app.include_router(settings_router.router)
app.include_router(assistant.router)
app.include_router(crm.router)
app.include_router(calendar.router)
app.include_router(campaigns.router)
app.include_router(payments.router)
app.include_router(funnels.router)
app.include_router(agency.router)


@app.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    return HealthOut(status="ok", app=settings.app_name)
