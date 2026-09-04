from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import AuthContext, get_current_auth
from app.models import Account, Appointment, AppointmentStatus, CalendarSlotRule, Contact
from app.schemas import (
    AppointmentCreate,
    AppointmentOut,
    AvailabilitySlot,
    PublicBookRequest,
    SlotRuleCreate,
    SlotRuleOut,
)

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/rules", response_model=list[SlotRuleOut])
def list_rules(auth: AuthContext = Depends(get_current_auth), db: Session = Depends(get_db)):
    return (
        db.query(CalendarSlotRule)
        .filter(CalendarSlotRule.account_id == auth.account.id)
        .order_by(CalendarSlotRule.weekday, CalendarSlotRule.start_time)
        .all()
    )


@router.post("/rules", response_model=SlotRuleOut, status_code=201)
def create_rule(
    payload: SlotRuleCreate,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")
    row = CalendarSlotRule(
        account_id=auth.account.id,
        weekday=payload.weekday,
        start_time=payload.start_time,
        end_time=payload.end_time,
        duration_minutes=payload.duration_minutes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/rules/{rule_id}", status_code=204)
def delete_rule(
    rule_id: UUID,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    row = (
        db.query(CalendarSlotRule)
        .filter(CalendarSlotRule.id == rule_id, CalendarSlotRule.account_id == auth.account.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(row)
    db.commit()


@router.get("/appointments", response_model=list[AppointmentOut])
def list_appointments(
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    return (
        db.query(Appointment)
        .filter(Appointment.account_id == auth.account.id)
        .order_by(Appointment.starts_at.desc())
        .limit(200)
        .all()
    )


@router.post("/appointments", response_model=AppointmentOut, status_code=201)
def create_appointment(
    payload: AppointmentCreate,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    if payload.ends_at <= payload.starts_at:
        raise HTTPException(status_code=400, detail="ends_at must be after starts_at")
    conflict = (
        db.query(Appointment)
        .filter(
            Appointment.account_id == auth.account.id,
            Appointment.status == AppointmentStatus.booked,
            Appointment.starts_at < payload.ends_at,
            Appointment.ends_at > payload.starts_at,
        )
        .first()
    )
    if conflict:
        raise HTTPException(status_code=409, detail="Time slot conflicts with an existing booking")
    row = Appointment(
        account_id=auth.account.id,
        contact_id=payload.contact_id,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        guest_name=payload.guest_name,
        guest_email=str(payload.guest_email).lower() if payload.guest_email else None,
        notes=payload.notes,
        meeting_link=payload.meeting_link,
        status=AppointmentStatus.booked,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/appointments/{appointment_id}/cancel", response_model=AppointmentOut)
def cancel_appointment(
    appointment_id: UUID,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    row = (
        db.query(Appointment)
        .filter(Appointment.id == appointment_id, Appointment.account_id == auth.account.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Appointment not found")
    row.status = AppointmentStatus.cancelled
    db.commit()
    db.refresh(row)
    return row


def _compute_slots(db: Session, account_id: UUID, days: int = 14) -> list[AvailabilitySlot]:
    rules = db.query(CalendarSlotRule).filter(CalendarSlotRule.account_id == account_id).all()
    if not rules:
        return []
    now = datetime.now(timezone.utc)
    existing = (
        db.query(Appointment)
        .filter(
            Appointment.account_id == account_id,
            Appointment.status == AppointmentStatus.booked,
            Appointment.starts_at >= now,
        )
        .all()
    )
    slots: list[AvailabilitySlot] = []
    for day_offset in range(days):
        day = (now + timedelta(days=day_offset)).date()
        weekday = day.weekday()
        day_rules = [r for r in rules if r.weekday == weekday]
        for rule in day_rules:
            cursor = datetime.combine(day, rule.start_time, tzinfo=timezone.utc)
            end = datetime.combine(day, rule.end_time, tzinfo=timezone.utc)
            step = timedelta(minutes=rule.duration_minutes)
            while cursor + step <= end:
                if cursor >= now:
                    conflict = any(
                        a.starts_at < cursor + step and a.ends_at > cursor for a in existing
                    )
                    if not conflict:
                        slots.append(AvailabilitySlot(starts_at=cursor, ends_at=cursor + step))
                cursor += step
    return slots[:100]


@router.get("/availability", response_model=list[AvailabilitySlot])
def availability(
    days: int = Query(default=14, ge=1, le=60),
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    return _compute_slots(db, auth.account.id, days)


@router.get("/public/{account_slug}/availability", response_model=list[AvailabilitySlot])
def public_availability(
    account_slug: str,
    days: int = Query(default=14, ge=1, le=60),
    db: Session = Depends(get_db),
):
    account = db.query(Account).filter(Account.slug == account_slug).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return _compute_slots(db, account.id, days)


@router.post("/public/{account_slug}/book", response_model=AppointmentOut, status_code=201)
def public_book(
    account_slug: str,
    payload: PublicBookRequest,
    db: Session = Depends(get_db),
):
    account = db.query(Account).filter(Account.slug == account_slug).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    slots = _compute_slots(db, account.id, days=30)
    match = next((s for s in slots if s.starts_at == payload.starts_at), None)
    if not match:
        # Also accept if exact match by iso comparison soft check
        match = next(
            (s for s in slots if abs((s.starts_at - payload.starts_at).total_seconds()) < 1),
            None,
        )
    if not match:
        raise HTTPException(status_code=409, detail="Selected slot is no longer available")

    email = str(payload.guest_email).lower()
    contact = (
        db.query(Contact)
        .filter(Contact.account_id == account.id, Contact.email == email)
        .first()
    )
    if not contact:
        contact = Contact(account_id=account.id, name=payload.guest_name, email=email, tags="booking")
        db.add(contact)
        db.flush()

    row = Appointment(
        account_id=account.id,
        contact_id=contact.id,
        starts_at=match.starts_at,
        ends_at=match.ends_at,
        guest_name=payload.guest_name,
        guest_email=email,
        notes=payload.notes,
        status=AppointmentStatus.booked,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
