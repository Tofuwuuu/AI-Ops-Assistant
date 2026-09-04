from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models import (
    AgentStep,
    AppointmentStatus,
    CampaignChannel,
    CampaignStatus,
    DealStatus,
    InvoiceStatus,
    TicketCategory,
    TicketStatus,
)


# ── Tickets ─────────────────────────────────────────────────────────────────


class TicketCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=255)
    body: str = Field(..., min_length=1, max_length=10000)
    requester_email: EmailStr


class DraftOut(BaseModel):
    id: UUID
    content: str
    confidence: float
    version: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AgentLogOut(BaseModel):
    id: UUID
    step: AgentStep
    input_json: dict | None = None
    output_json: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TicketOut(BaseModel):
    id: UUID
    subject: str
    body: str
    requester_email: str
    category: TicketCategory | None = None
    status: TicketStatus
    confidence: float | None = None
    reason_decision: str | None = None
    contact_id: UUID | None = None
    created_at: datetime
    updated_at: datetime
    drafts: list[DraftOut] = []
    logs: list[AgentLogOut] = []

    model_config = {"from_attributes": True}


class TicketListOut(BaseModel):
    id: UUID
    subject: str
    requester_email: str
    category: TicketCategory | None = None
    status: TicketStatus
    confidence: float | None = None
    reason_decision: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TicketStatusUpdate(BaseModel):
    detail: str | None = None


class HealthOut(BaseModel):
    status: str
    app: str


# ── Settings ────────────────────────────────────────────────────────────────


class SettingsOut(BaseModel):
    notify_email: bool
    notify_slack: bool
    require_human_review: bool
    ask_clarifying_threshold: float
    bug_escalate_threshold: float
    sentiment_priority_threshold: float
    tier_ticket_share_threshold: float
    updated_at: datetime

    model_config = {"from_attributes": True}


class SettingsUpdate(BaseModel):
    notify_email: bool | None = None
    notify_slack: bool | None = None
    ask_clarifying_threshold: float | None = Field(default=None, ge=0.0, le=1.0)
    bug_escalate_threshold: float | None = Field(default=None, ge=0.0, le=1.0)
    sentiment_priority_threshold: float | None = Field(default=None, ge=0.0, le=1.0)
    tier_ticket_share_threshold: float | None = Field(default=None, ge=0.0, le=1.0)


class KbSourceOut(BaseModel):
    title: str
    snippet: str
    tags: str | None = None
    relevance: int


class AssistantAskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)


class AssistantAskResponse(BaseModel):
    answer: str
    confidence: float
    sources: list[KbSourceOut]


# ── Auth / Accounts ─────────────────────────────────────────────────────────


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    display_name: str | None = None
    account_name: str = Field(..., min_length=1, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AccountOut(BaseModel):
    id: UUID
    name: str
    slug: str
    type: str
    parent_account_id: UUID | None = None
    branding_json: dict | None = None
    custom_domain: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AccountUpdate(BaseModel):
    name: str | None = None
    branding_json: dict | None = None
    custom_domain: str | None = None


class SubAccountCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str | None = None


class AuthUserOut(BaseModel):
    id: UUID
    email: str
    display_name: str | None = None

    model_config = {"from_attributes": True}


class AuthMeOut(BaseModel):
    user: AuthUserOut
    account: AccountOut
    role: str
    accounts: list[AccountOut]


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUserOut
    account: AccountOut
    role: str


# ── CRM ─────────────────────────────────────────────────────────────────────


class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    domain: str | None = None


class CompanyOut(BaseModel):
    id: UUID
    name: str
    domain: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr | None = None
    phone: str | None = None
    company_id: UUID | None = None
    tags: str | None = None
    custom_fields: dict | None = None


class ContactUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    company_id: UUID | None = None
    tags: str | None = None
    custom_fields: dict | None = None


class ContactOut(BaseModel):
    id: UUID
    name: str
    email: str | None = None
    phone: str | None = None
    company_id: UUID | None = None
    tags: str | None = None
    custom_fields: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PipelineCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    stages: list[str] = Field(default_factory=lambda: ["Lead", "Qualified", "Proposal", "Won"])


class PipelineOut(BaseModel):
    id: UUID
    name: str
    stages: list
    created_at: datetime

    model_config = {"from_attributes": True}


class DealCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    pipeline_id: UUID
    stage: str
    contact_id: UUID | None = None
    value: float = 0.0
    status: DealStatus = DealStatus.open


class DealUpdate(BaseModel):
    title: str | None = None
    stage: str | None = None
    contact_id: UUID | None = None
    value: float | None = None
    status: DealStatus | None = None


class DealOut(BaseModel):
    id: UUID
    title: str
    pipeline_id: UUID
    stage: str
    contact_id: UUID | None = None
    value: float
    status: DealStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Calendar ────────────────────────────────────────────────────────────────


class SlotRuleCreate(BaseModel):
    weekday: int = Field(..., ge=0, le=6)
    start_time: time
    end_time: time
    duration_minutes: int = Field(default=30, ge=5, le=480)


class SlotRuleOut(BaseModel):
    id: UUID
    weekday: int
    start_time: time
    end_time: time
    duration_minutes: int

    model_config = {"from_attributes": True}


class AppointmentCreate(BaseModel):
    starts_at: datetime
    ends_at: datetime
    contact_id: UUID | None = None
    guest_name: str | None = None
    guest_email: EmailStr | None = None
    notes: str | None = None
    meeting_link: str | None = None


class AppointmentOut(BaseModel):
    id: UUID
    starts_at: datetime
    ends_at: datetime
    status: AppointmentStatus
    contact_id: UUID | None = None
    guest_name: str | None = None
    guest_email: str | None = None
    notes: str | None = None
    meeting_link: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PublicBookRequest(BaseModel):
    starts_at: datetime
    guest_name: str = Field(..., min_length=1)
    guest_email: EmailStr
    notes: str | None = None


class AvailabilitySlot(BaseModel):
    starts_at: datetime
    ends_at: datetime


# ── Campaigns ───────────────────────────────────────────────────────────────


class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    channel: CampaignChannel
    subject: str | None = None
    body_template: str = Field(..., min_length=1)
    audience_filter: dict | None = None
    contact_ids: list[UUID] | None = None


class CampaignOut(BaseModel):
    id: UUID
    name: str
    channel: CampaignChannel
    subject: str | None = None
    body_template: str
    status: CampaignStatus
    audience_filter: dict | None = None
    created_at: datetime
    recipient_count: int = 0

    model_config = {"from_attributes": True}


# ── Payments ────────────────────────────────────────────────────────────────


class InvoiceLineCreate(BaseModel):
    description: str
    quantity: int = 1
    unit_amount: float


class InvoiceCreate(BaseModel):
    contact_id: UUID | None = None
    deal_id: UUID | None = None
    currency: str = "usd"
    due_date: date | None = None
    description: str | None = None
    line_items: list[InvoiceLineCreate] = Field(default_factory=list)


class InvoiceLineOut(BaseModel):
    id: UUID
    description: str
    quantity: int
    unit_amount: float

    model_config = {"from_attributes": True}


class InvoiceOut(BaseModel):
    id: UUID
    contact_id: UUID | None = None
    deal_id: UUID | None = None
    amount: float
    currency: str
    status: InvoiceStatus
    stripe_checkout_session_id: str | None = None
    due_date: date | None = None
    description: str | None = None
    created_at: datetime
    line_items: list[InvoiceLineOut] = []
    checkout_url: str | None = None

    model_config = {"from_attributes": True}


# ── Funnels ─────────────────────────────────────────────────────────────────


class FunnelCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=100)
    blocks_json: list = Field(default_factory=list)
    published: bool = True


class FunnelUpdate(BaseModel):
    title: str | None = None
    slug: str | None = None
    blocks_json: list | None = None
    published: bool | None = None


class FunnelOut(BaseModel):
    id: UUID
    title: str
    slug: str
    blocks_json: list
    published: bool
    created_at: datetime
    updated_at: datetime
    submission_count: int = 0

    model_config = {"from_attributes": True}


class FunnelSubmitRequest(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    phone: str | None = None
    payload: dict | None = None


class AgencyStatsOut(BaseModel):
    account_id: UUID
    account_name: str
    tickets: int
    contacts: int
    deals: int
    appointments: int
    campaigns: int
    invoices: int
    funnel_submissions: int
