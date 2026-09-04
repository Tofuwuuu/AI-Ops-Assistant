from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.deps import AuthContext, get_current_auth, get_optional_auth
from app.models import Contact, Ticket, TicketStatus
from app.redis_client import check_rate_limit, enqueue_ticket
from app.schemas import TicketCreate, TicketListOut, TicketOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tickets", tags=["tickets"])


def _link_or_create_contact(db: Session, account_id: UUID | None, email: str, subject: str) -> UUID | None:
    if not account_id:
        return None
    contact = (
        db.query(Contact)
        .filter(Contact.account_id == account_id, Contact.email == email)
        .first()
    )
    if contact:
        return contact.id
    contact = Contact(account_id=account_id, name=email.split("@")[0], email=email, tags="ticket")
    db.add(contact)
    db.flush()
    return contact.id


@router.post("", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: TicketCreate,
    request: Request,
    auth: AuthContext | None = Depends(get_optional_auth),
    db: Session = Depends(get_db),
) -> Ticket:
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
        )

    account_id = auth.account.id if auth else None
    email = str(payload.requester_email).lower()
    contact_id = _link_or_create_contact(db, account_id, email, payload.subject)

    ticket = Ticket(
        account_id=account_id,
        contact_id=contact_id,
        subject=payload.subject.strip(),
        body=payload.body.strip(),
        requester_email=email,
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
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> list[Ticket]:
    query = db.query(Ticket).filter(Ticket.account_id == auth.account.id).order_by(Ticket.created_at.desc())
    if status_filter is not None:
        query = query.filter(Ticket.status == status_filter)
    return query.limit(100).all()


@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(
    ticket_id: UUID,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> Ticket:
    ticket = (
        db.query(Ticket)
        .options(joinedload(Ticket.drafts), joinedload(Ticket.logs))
        .filter(Ticket.id == ticket_id, Ticket.account_id == auth.account.id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.logs.sort(key=lambda log: log.created_at)
    ticket.drafts.sort(key=lambda d: d.version)
    return ticket


@router.patch("/{ticket_id}/approve", response_model=TicketOut)
def approve_ticket(
    ticket_id: UUID,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> Ticket:
    ticket = (
        db.query(Ticket)
        .filter(Ticket.id == ticket_id, Ticket.account_id == auth.account.id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status != TicketStatus.needs_review:
        raise HTTPException(
            status_code=400,
            detail=f"Ticket must be needs_review to approve (current: {ticket.status.value})",
        )
    ticket.status = TicketStatus.approved
    db.commit()
    return get_ticket(ticket_id, auth, db)


@router.patch("/{ticket_id}/reject", response_model=TicketOut)
def reject_ticket(
    ticket_id: UUID,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> Ticket:
    ticket = (
        db.query(Ticket)
        .filter(Ticket.id == ticket_id, Ticket.account_id == auth.account.id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status != TicketStatus.needs_review:
        raise HTTPException(
            status_code=400,
            detail=f"Ticket must be needs_review to reject (current: {ticket.status.value})",
        )
    ticket.status = TicketStatus.rejected
    db.commit()
    return get_ticket(ticket_id, auth, db)


@router.post("/{ticket_id}/retry", response_model=TicketOut)
def retry_ticket(
    ticket_id: UUID,
    auth: AuthContext | None = Depends(get_optional_auth),
    db: Session = Depends(get_db),
) -> Ticket:
    query = db.query(Ticket).filter(Ticket.id == ticket_id)
    if auth:
        query = query.filter(Ticket.account_id == auth.account.id)
    ticket = query.first()
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
    if auth:
        return get_ticket(ticket_id, auth, db)
    return ticket
