from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.db import get_db
from app.deps import AuthContext, get_current_auth
from app.integrations.stripe_client import create_checkout_session, verify_webhook
from app.models import Invoice, InvoiceLineItem, InvoiceStatus
from app.schemas import InvoiceCreate, InvoiceOut

router = APIRouter(prefix="/payments", tags=["payments"])


def _to_out(inv: Invoice, checkout_url: str | None = None) -> InvoiceOut:
    return InvoiceOut(
        id=inv.id,
        contact_id=inv.contact_id,
        deal_id=inv.deal_id,
        amount=inv.amount,
        currency=inv.currency,
        status=inv.status,
        stripe_checkout_session_id=inv.stripe_checkout_session_id,
        due_date=inv.due_date,
        description=inv.description,
        created_at=inv.created_at,
        line_items=inv.line_items,
        checkout_url=checkout_url,
    )


@router.get("/invoices", response_model=list[InvoiceOut])
def list_invoices(auth: AuthContext = Depends(get_current_auth), db: Session = Depends(get_db)):
    rows = (
        db.query(Invoice)
        .options(joinedload(Invoice.line_items))
        .filter(Invoice.account_id == auth.account.id)
        .order_by(Invoice.created_at.desc())
        .all()
    )
    return [_to_out(r) for r in rows]


@router.post("/invoices", response_model=InvoiceOut, status_code=201)
def create_invoice(
    payload: InvoiceCreate,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    if not payload.line_items:
        raise HTTPException(status_code=400, detail="At least one line item required")
    amount = sum(li.quantity * li.unit_amount for li in payload.line_items)
    inv = Invoice(
        account_id=auth.account.id,
        contact_id=payload.contact_id,
        deal_id=payload.deal_id,
        amount=amount,
        currency=payload.currency.lower(),
        due_date=payload.due_date,
        description=payload.description,
        status=InvoiceStatus.open,
    )
    db.add(inv)
    db.flush()
    for li in payload.line_items:
        db.add(
            InvoiceLineItem(
                invoice_id=inv.id,
                description=li.description,
                quantity=li.quantity,
                unit_amount=li.unit_amount,
            )
        )
    db.commit()
    db.refresh(inv)

    settings = get_settings()
    session_id, url, pi = create_checkout_session(
        invoice_id=str(inv.id),
        amount=inv.amount,
        currency=inv.currency,
        description=inv.description or f"Invoice {inv.id}",
        success_url=f"{settings.frontend_public_url}/invoices?paid={inv.id}",
        cancel_url=f"{settings.frontend_public_url}/invoices?cancelled={inv.id}",
    )
    inv.stripe_checkout_session_id = session_id
    inv.stripe_payment_intent_id = str(pi) if pi else None
    db.commit()
    db.refresh(inv)
    inv = (
        db.query(Invoice)
        .options(joinedload(Invoice.line_items))
        .filter(Invoice.id == inv.id)
        .first()
    )
    return _to_out(inv, checkout_url=url)


@router.post("/invoices/{invoice_id}/checkout", response_model=InvoiceOut)
def recreate_checkout(
    invoice_id: UUID,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    inv = (
        db.query(Invoice)
        .options(joinedload(Invoice.line_items))
        .filter(Invoice.id == invoice_id, Invoice.account_id == auth.account.id)
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if inv.status == InvoiceStatus.paid:
        raise HTTPException(status_code=400, detail="Invoice already paid")

    settings = get_settings()
    session_id, url, pi = create_checkout_session(
        invoice_id=str(inv.id),
        amount=inv.amount,
        currency=inv.currency,
        description=inv.description or f"Invoice {inv.id}",
        success_url=f"{settings.frontend_public_url}/invoices?paid={inv.id}",
        cancel_url=f"{settings.frontend_public_url}/invoices?cancelled={inv.id}",
    )
    inv.stripe_checkout_session_id = session_id
    inv.stripe_payment_intent_id = str(pi) if pi else None
    inv.status = InvoiceStatus.open
    db.commit()
    db.refresh(inv)
    return _to_out(inv, checkout_url=url)


@router.post("/invoices/{invoice_id}/mark-paid", response_model=InvoiceOut)
def mark_paid_mock(
    invoice_id: UUID,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    """Mark paid for mock Stripe checkouts / manual reconciliation."""
    inv = (
        db.query(Invoice)
        .options(joinedload(Invoice.line_items))
        .filter(Invoice.id == invoice_id, Invoice.account_id == auth.account.id)
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv.status = InvoiceStatus.paid
    db.commit()
    db.refresh(inv)
    return _to_out(inv)


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = verify_webhook(payload, sig)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Webhook error: {exc}") from exc

    event_type = event.get("type") if isinstance(event, dict) else getattr(event, "type", None)
    data_object = None
    if isinstance(event, dict):
        data_object = event.get("data", {}).get("object", {})
    else:
        data_object = event["data"]["object"]

    if event_type == "checkout.session.completed":
        invoice_id = (data_object.get("metadata") or {}).get("invoice_id")
        session_id = data_object.get("id")
        inv = None
        if invoice_id:
            inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not inv and session_id:
            inv = db.query(Invoice).filter(Invoice.stripe_checkout_session_id == session_id).first()
        if inv:
            inv.status = InvoiceStatus.paid
            if data_object.get("payment_intent"):
                inv.stripe_payment_intent_id = str(data_object["payment_intent"])
            db.commit()
    return {"received": True}
