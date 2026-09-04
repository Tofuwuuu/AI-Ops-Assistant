from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models import Ticket, TicketStatus
from app.redis_client import check_rate_limit, enqueue_ticket
from app.schemas import TicketCreate, TicketListOut, TicketOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post("", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: TicketCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> Ticket:
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
        )

    ticket = Ticket(
        subject=payload.subject.strip(),
        body=payload.body.strip(),
        requester_email=str(payload.requester_email).lower(),
        status=TicketStatus.pending,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    enqueue_ticket(str(ticket.id))
    logger.info("Created ticket %s and enqueued for agent", ticket.id)
    return ticket


@router.get("", response_model=list[TicketListOut])
def list_tickets(
    status_filter: TicketStatus | None = None,
    db: Session = Depends(get_db),
) -> list[Ticket]:
    query = db.query(Ticket).order_by(Ticket.created_at.desc())
    if status_filter is not None:
        query = query.filter(Ticket.status == status_filter)
    return query.limit(100).all()


@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(ticket_id: UUID, db: Session = Depends(get_db)) -> Ticket:
    ticket = (
        db.query(Ticket)
        .options(joinedload(Ticket.drafts), joinedload(Ticket.logs))
        .filter(Ticket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    # Sort logs chronologically for the timeline UI
    ticket.logs.sort(key=lambda log: log.created_at)
    ticket.drafts.sort(key=lambda d: d.version)
    return ticket


@router.patch("/{ticket_id}/approve", response_model=TicketOut)
def approve_ticket(ticket_id: UUID, db: Session = Depends(get_db)) -> Ticket:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status != TicketStatus.needs_review:
        raise HTTPException(
            status_code=400,
            detail=f"Ticket must be needs_review to approve (current: {ticket.status.value})",
        )
    ticket.status = TicketStatus.approved
    db.commit()
    db.refresh(ticket)
    return get_ticket(ticket_id, db)


@router.patch("/{ticket_id}/reject", response_model=TicketOut)
def reject_ticket(ticket_id: UUID, db: Session = Depends(get_db)) -> Ticket:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status != TicketStatus.needs_review:
        raise HTTPException(
            status_code=400,
            detail=f"Ticket must be needs_review to reject (current: {ticket.status.value})",
        )
    ticket.status = TicketStatus.rejected
    db.commit()
    db.refresh(ticket)
    return get_ticket(ticket_id, db)


@router.post("/{ticket_id}/retry", response_model=TicketOut)
def retry_ticket(ticket_id: UUID, db: Session = Depends(get_db)) -> Ticket:
    """Re-enqueue a failed ticket for another agent run (used by n8n retries)."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status not in {TicketStatus.failed, TicketStatus.pending}:
        raise HTTPException(
            status_code=400,
            detail=f"Only failed/pending tickets can be retried (current: {ticket.status.value})",
        )
    ticket.status = TicketStatus.pending
    db.commit()
    enqueue_ticket(str(ticket.id))
    db.refresh(ticket)
    return get_ticket(ticket_id, db)
