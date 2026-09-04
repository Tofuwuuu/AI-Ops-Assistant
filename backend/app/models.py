import enum
import uuid
from datetime import datetime

from typing import Any

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class TicketStatus(str, enum.Enum):
    pending = "pending"
    classified = "classified"
    drafted = "drafted"
    needs_review = "needs_review"
    approved = "approved"
    rejected = "rejected"
    failed = "failed"


class TicketCategory(str, enum.Enum):
    bug = "bug"
    billing = "billing"
    how_to = "how-to"
    feature = "feature"
    unknown = "unknown"


class AgentStep(str, enum.Enum):
    ingest = "ingest"
    classify = "classify"
    retrieve = "retrieve"
    reason = "reason"
    generate = "generate"
    validate = "validate"
    persist = "persist"
    handoff = "handoff"


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    requester_email: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[TicketCategory | None] = mapped_column(
        Enum(TicketCategory, name="ticket_category", values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    status: Mapped[TicketStatus] = mapped_column(
        Enum(TicketStatus, name="ticket_status", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=TicketStatus.pending,
    )
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    reason_decision: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    drafts: Mapped[list["Draft"]] = relationship(back_populates="ticket", cascade="all, delete-orphan")
    logs: Mapped[list["AgentLog"]] = relationship(back_populates="ticket", cascade="all, delete-orphan")


class Draft(Base):
    __tablename__ = "drafts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ticket: Mapped["Ticket"] = relationship(back_populates="drafts")


class AgentLog(Base):
    __tablename__ = "agent_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    step: Mapped[AgentStep] = mapped_column(
        Enum(AgentStep, name="agent_step", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    input_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    output_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ticket: Mapped["Ticket"] = relationship(back_populates="logs")


class AppSettings(Base):
    """Singleton settings row (id always 1) — real, persisted app configuration."""

    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    notify_email: Mapped[bool] = mapped_column(default=True, nullable=False)
    notify_slack: Mapped[bool] = mapped_column(default=False, nullable=False)
    require_human_review: Mapped[bool] = mapped_column(default=True, nullable=False)
    ask_clarifying_threshold: Mapped[float] = mapped_column(Float, default=0.45, nullable=False)
    bug_escalate_threshold: Mapped[float] = mapped_column(Float, default=0.7, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class KbDoc(Base):
    __tablename__ = "kb_docs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[str | None] = mapped_column(String(512), nullable=True)
    search_vector: Mapped[Any | None] = mapped_column(TSVECTOR, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
