import enum
import uuid
from datetime import date, datetime, time
from typing import Any

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


# ── Existing enums ──────────────────────────────────────────────────────────


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


# ── Phase 0: Accounts / Auth ────────────────────────────────────────────────


class AccountType(str, enum.Enum):
    agency = "agency"
    sub_account = "sub_account"


class MemberRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    member = "member"


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    type: Mapped[AccountType] = mapped_column(
        Enum(AccountType, name="account_type", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=AccountType.agency,
    )
    parent_account_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )
    branding_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    custom_domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    members: Mapped[list["AccountMember"]] = relationship(back_populates="account")
    parent: Mapped["Account | None"] = relationship(remote_side=[id])


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    memberships: Mapped[list["AccountMember"]] = relationship(back_populates="user")


class AccountMember(Base):
    __tablename__ = "account_members"
    __table_args__ = (UniqueConstraint("user_id", "account_id", name="uq_user_account"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[MemberRole] = mapped_column(
        Enum(MemberRole, name="member_role", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=MemberRole.member,
    )

    user: Mapped["User"] = relationship(back_populates="memberships")
    account: Mapped["Account"] = relationship(back_populates="members")


# ── Phase 1: CRM ────────────────────────────────────────────────────────────


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    contacts: Mapped[list["Contact"]] = relationship(back_populates="company")


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("companies.id", ondelete="SET NULL"), nullable=True
    )
    tags: Mapped[str | None] = mapped_column(String(512), nullable=True)
    custom_fields: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    company: Mapped["Company | None"] = relationship(back_populates="contacts")
    deals: Mapped[list["Deal"]] = relationship(back_populates="contact")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="contact")


class Pipeline(Base):
    __tablename__ = "pipelines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    stages: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    deals: Mapped[list["Deal"]] = relationship(back_populates="pipeline")


class DealStatus(str, enum.Enum):
    open = "open"
    won = "won"
    lost = "lost"


class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    contact_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True
    )
    pipeline_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    stage: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[DealStatus] = mapped_column(
        Enum(DealStatus, name="deal_status", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=DealStatus.open,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    contact: Mapped["Contact | None"] = relationship(back_populates="deals")
    pipeline: Mapped["Pipeline"] = relationship(back_populates="deals")


# ── Phase 2: Calendar ───────────────────────────────────────────────────────


class AppointmentStatus(str, enum.Enum):
    booked = "booked"
    cancelled = "cancelled"
    completed = "completed"


class CalendarSlotRule(Base):
    __tablename__ = "calendar_slot_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    weekday: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Mon … 6=Sun
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    contact_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, name="appointment_status", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=AppointmentStatus.booked,
    )
    meeting_link: Mapped[str | None] = mapped_column(String(512), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    guest_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    guest_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    contact: Mapped["Contact | None"] = relationship(back_populates="appointments")


# ── Phase 3: Campaigns ──────────────────────────────────────────────────────


class CampaignChannel(str, enum.Enum):
    email = "email"
    sms = "sms"


class CampaignStatus(str, enum.Enum):
    draft = "draft"
    sending = "sending"
    sent = "sent"
    failed = "failed"


class RecipientStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    failed = "failed"


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    channel: Mapped[CampaignChannel] = mapped_column(
        Enum(CampaignChannel, name="campaign_channel", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body_template: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[CampaignStatus] = mapped_column(
        Enum(CampaignStatus, name="campaign_status", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=CampaignStatus.draft,
    )
    audience_filter: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    recipients: Mapped[list["CampaignRecipient"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )


class CampaignRecipient(Base):
    __tablename__ = "campaign_recipients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    contact_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[RecipientStatus] = mapped_column(
        Enum(RecipientStatus, name="recipient_status", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=RecipientStatus.pending,
    )
    provider_message_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    campaign: Mapped["Campaign"] = relationship(back_populates="recipients")


# ── Phase 4: Payments ───────────────────────────────────────────────────────


class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    open = "open"
    paid = "paid"
    void = "void"


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    contact_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True
    )
    deal_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("deals.id", ondelete="SET NULL"), nullable=True
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="usd")
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus, name="invoice_status", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=InvoiceStatus.draft,
    )
    stripe_checkout_session_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    line_items: Mapped[list["InvoiceLineItem"]] = relationship(
        back_populates="invoice", cascade="all, delete-orphan"
    )


class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False
    )
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_amount: Mapped[float] = mapped_column(Float, nullable=False)

    invoice: Mapped["Invoice"] = relationship(back_populates="line_items")


# ── Phase 5: Funnels ────────────────────────────────────────────────────────


class FunnelPage(Base):
    __tablename__ = "funnel_pages"
    __table_args__ = (UniqueConstraint("account_id", "slug", name="uq_funnel_account_slug"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    blocks_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    submissions: Mapped[list["FunnelSubmission"]] = relationship(
        back_populates="funnel_page", cascade="all, delete-orphan"
    )


class FunnelSubmission(Base):
    __tablename__ = "funnel_submissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    funnel_page_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("funnel_pages.id", ondelete="CASCADE"), nullable=False, index=True
    )
    contact_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True
    )
    payload_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    funnel_page: Mapped["FunnelPage"] = relationship(back_populates="submissions")


# ── Existing core tables (now account-scoped) ───────────────────────────────


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), nullable=True, index=True
    )
    contact_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True
    )
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
    """One settings row per account."""

    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), nullable=True, unique=True, index=True
    )
    notify_email: Mapped[bool] = mapped_column(default=True, nullable=False)
    notify_slack: Mapped[bool] = mapped_column(default=False, nullable=False)
    require_human_review: Mapped[bool] = mapped_column(default=True, nullable=False)
    ask_clarifying_threshold: Mapped[float] = mapped_column(Float, default=0.45, nullable=False)
    bug_escalate_threshold: Mapped[float] = mapped_column(Float, default=0.7, nullable=False)
    sentiment_priority_threshold: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    tier_ticket_share_threshold: Mapped[float] = mapped_column(Float, default=0.2, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    @staticmethod
    def next_id(db) -> int:
        from sqlalchemy import func as sa_func

        current = db.query(sa_func.max(AppSettings.id)).scalar()
        return int(current or 0) + 1


class KbDoc(Base):
    __tablename__ = "kb_docs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[str | None] = mapped_column(String(512), nullable=True)
    search_vector: Mapped[Any | None] = mapped_column(TSVECTOR, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
