import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.agent.retrieve import seed_kb_docs
from app.config import get_settings
from app.db import Base, SessionLocal, engine
from app.logging_conf import setup_logging
from app.routers import assistant, settings as settings_router, tickets, webhooks
from app.schemas import HealthOut

setup_logging()
logger = logging.getLogger(__name__)
settings = get_settings()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    # Ensure tsvector index exists even if create_all skipped migration nuances
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_kb_docs_search_vector
                ON kb_docs USING GIN (search_vector)
                """
            )
        )
    with SessionLocal() as db:
        seed_kb_docs(db)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("Starting %s", settings.app_name)
    init_db()
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

app.include_router(tickets.router)
app.include_router(webhooks.router)
app.include_router(settings_router.router)
app.include_router(assistant.router)


@app.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    return HealthOut(status="ok", app=settings.app_name)
