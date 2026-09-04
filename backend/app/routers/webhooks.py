import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models import Ticket, TicketStatus
from app.redis_client import enqueue_ticket

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


class N8nCallback(BaseModel):
    ticket_id: UUID
    action: str  # retry | ack | notify
    detail: str | None = None


@router.post("/n8n")
def n8n_callback(
    payload: N8nCallback,
    db: Session = Depends(get_db),
    x_webhook_secret: str | None = Header(default=None),
) -> dict[str, Any]:
    settings = get_settings()
    if x_webhook_secret != settings.n8n_webhook_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook secret")

    ticket = db.query(Ticket).filter(Ticket.id == payload.ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if payload.action == "retry":
        ticket.status = TicketStatus.pending
        db.commit()
        enqueue_ticket(str(ticket.id))
        logger.info("n8n requested retry for ticket %s", ticket.id)
        return {"ok": True, "action": "retry", "ticket_id": str(ticket.id)}

    logger.info("n8n callback %s for ticket %s: %s", payload.action, ticket.id, payload.detail)
    return {"ok": True, "action": payload.action, "ticket_id": str(ticket.id)}
