from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import AuthContext, get_current_auth
from app.models import Company, Contact, Deal, Pipeline, Ticket
from app.schemas import (
    CompanyCreate,
    CompanyOut,
    ContactCreate,
    ContactOut,
    ContactUpdate,
    DealCreate,
    DealOut,
    DealUpdate,
    PipelineCreate,
    PipelineOut,
    TicketListOut,
)

router = APIRouter(tags=["crm"])


@router.get("/companies", response_model=list[CompanyOut])
def list_companies(auth: AuthContext = Depends(get_current_auth), db: Session = Depends(get_db)):
    return (
        db.query(Company)
        .filter(Company.account_id == auth.account.id)
        .order_by(Company.name)
        .all()
    )


@router.post("/companies", response_model=CompanyOut, status_code=201)
def create_company(
    payload: CompanyCreate,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    row = Company(account_id=auth.account.id, name=payload.name.strip(), domain=payload.domain)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/contacts", response_model=list[ContactOut])
def list_contacts(
    q: str | None = Query(default=None),
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    query = db.query(Contact).filter(Contact.account_id == auth.account.id)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (Contact.name.ilike(like)) | (Contact.email.ilike(like)) | (Contact.phone.ilike(like))
        )
    return query.order_by(Contact.created_at.desc()).limit(200).all()


@router.post("/contacts", response_model=ContactOut, status_code=201)
def create_contact(
    payload: ContactCreate,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    row = Contact(
        account_id=auth.account.id,
        name=payload.name.strip(),
        email=str(payload.email).lower() if payload.email else None,
        phone=payload.phone,
        company_id=payload.company_id,
        tags=payload.tags,
        custom_fields=payload.custom_fields,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/contacts/{contact_id}", response_model=ContactOut)
def get_contact(
    contact_id: UUID,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    row = (
        db.query(Contact)
        .filter(Contact.id == contact_id, Contact.account_id == auth.account.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Contact not found")
    return row


@router.put("/contacts/{contact_id}", response_model=ContactOut)
def update_contact(
    contact_id: UUID,
    payload: ContactUpdate,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    row = (
        db.query(Contact)
        .filter(Contact.id == contact_id, Contact.account_id == auth.account.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Contact not found")
    data = payload.model_dump(exclude_unset=True)
    if "email" in data and data["email"]:
        data["email"] = str(data["email"]).lower()
    for key, value in data.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@router.get("/contacts/{contact_id}/tickets", response_model=list[TicketListOut])
def contact_tickets(
    contact_id: UUID,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    return (
        db.query(Ticket)
        .filter(Ticket.account_id == auth.account.id, Ticket.contact_id == contact_id)
        .order_by(Ticket.created_at.desc())
        .all()
    )


@router.get("/pipelines", response_model=list[PipelineOut])
def list_pipelines(auth: AuthContext = Depends(get_current_auth), db: Session = Depends(get_db)):
    rows = (
        db.query(Pipeline)
        .filter(Pipeline.account_id == auth.account.id)
        .order_by(Pipeline.created_at)
        .all()
    )
    if not rows:
        default = Pipeline(
            account_id=auth.account.id,
            name="Sales Pipeline",
            stages=["Lead", "Qualified", "Proposal", "Won"],
        )
        db.add(default)
        db.commit()
        db.refresh(default)
        rows = [default]
    return rows


@router.post("/pipelines", response_model=PipelineOut, status_code=201)
def create_pipeline(
    payload: PipelineCreate,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    row = Pipeline(account_id=auth.account.id, name=payload.name, stages=payload.stages)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/deals", response_model=list[DealOut])
def list_deals(
    pipeline_id: UUID | None = None,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    query = db.query(Deal).filter(Deal.account_id == auth.account.id)
    if pipeline_id:
        query = query.filter(Deal.pipeline_id == pipeline_id)
    return query.order_by(Deal.updated_at.desc()).all()


@router.post("/deals", response_model=DealOut, status_code=201)
def create_deal(
    payload: DealCreate,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    pipeline = (
        db.query(Pipeline)
        .filter(Pipeline.id == payload.pipeline_id, Pipeline.account_id == auth.account.id)
        .first()
    )
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    row = Deal(
        account_id=auth.account.id,
        title=payload.title,
        pipeline_id=payload.pipeline_id,
        stage=payload.stage,
        contact_id=payload.contact_id,
        value=payload.value,
        status=payload.status,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/deals/{deal_id}", response_model=DealOut)
def update_deal(
    deal_id: UUID,
    payload: DealUpdate,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    row = db.query(Deal).filter(Deal.id == deal_id, Deal.account_id == auth.account.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Deal not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row
