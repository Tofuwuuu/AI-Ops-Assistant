from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models import AgentStep, TicketCategory, TicketStatus


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


class SettingsOut(BaseModel):
    notify_email: bool
    notify_slack: bool
    require_human_review: bool
    ask_clarifying_threshold: float
    bug_escalate_threshold: float
    updated_at: datetime

    model_config = {"from_attributes": True}


class SettingsUpdate(BaseModel):
    notify_email: bool | None = None
    notify_slack: bool | None = None
    ask_clarifying_threshold: float | None = Field(default=None, ge=0.0, le=1.0)
    bug_escalate_threshold: float | None = Field(default=None, ge=0.0, le=1.0)
    # require_human_review is intentionally not editable — enforced safety gate.


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
