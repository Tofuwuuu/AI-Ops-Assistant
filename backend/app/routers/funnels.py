from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import AuthContext, get_current_auth
from app.models import Account, Contact, FunnelPage, FunnelSubmission
from app.schemas import FunnelCreate, FunnelOut, FunnelSubmitRequest, FunnelUpdate

router = APIRouter(tags=["funnels"])


def _to_out(page: FunnelPage) -> FunnelOut:
    return FunnelOut(
        id=page.id,
        title=page.title,
        slug=page.slug,
        blocks_json=page.blocks_json or [],
        published=page.published,
        created_at=page.created_at,
        updated_at=page.updated_at,
        submission_count=len(page.submissions) if page.submissions is not None else 0,
    )


@router.get("/funnels", response_model=list[FunnelOut])
def list_funnels(auth: AuthContext = Depends(get_current_auth), db: Session = Depends(get_db)):
    rows = (
        db.query(FunnelPage)
        .filter(FunnelPage.account_id == auth.account.id)
        .order_by(FunnelPage.updated_at.desc())
        .all()
    )
    return [_to_out(r) for r in rows]


@router.post("/funnels", response_model=FunnelOut, status_code=201)
def create_funnel(
    payload: FunnelCreate,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    slug = payload.slug.strip().lower().replace(" ", "-")
    exists = (
        db.query(FunnelPage)
        .filter(FunnelPage.account_id == auth.account.id, FunnelPage.slug == slug)
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="Slug already used")
    page = FunnelPage(
        account_id=auth.account.id,
        title=payload.title,
        slug=slug,
        blocks_json=payload.blocks_json or [],
        published=payload.published,
    )
    db.add(page)
    db.commit()
    db.refresh(page)
    return _to_out(page)


@router.put("/funnels/{funnel_id}", response_model=FunnelOut)
def update_funnel(
    funnel_id: UUID,
    payload: FunnelUpdate,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    page = (
        db.query(FunnelPage)
        .filter(FunnelPage.id == funnel_id, FunnelPage.account_id == auth.account.id)
        .first()
    )
    if not page:
        raise HTTPException(status_code=404, detail="Funnel not found")
    data = payload.model_dump(exclude_unset=True)
    if "slug" in data and data["slug"]:
        data["slug"] = data["slug"].strip().lower().replace(" ", "-")
    for key, value in data.items():
        setattr(page, key, value)
    db.commit()
    db.refresh(page)
    return _to_out(page)


@router.get("/public/funnels/{account_slug}/{page_slug}", response_model=FunnelOut)
def public_get_funnel(account_slug: str, page_slug: str, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.slug == account_slug).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    page = (
        db.query(FunnelPage)
        .filter(
            FunnelPage.account_id == account.id,
            FunnelPage.slug == page_slug,
            FunnelPage.published.is_(True),
        )
        .first()
    )
    if not page:
        raise HTTPException(status_code=404, detail="Funnel page not found")
    return _to_out(page)


@router.post("/public/funnels/{account_slug}/{page_slug}/submit", status_code=201)
def public_submit_funnel(
    account_slug: str,
    page_slug: str,
    payload: FunnelSubmitRequest,
    db: Session = Depends(get_db),
):
    account = db.query(Account).filter(Account.slug == account_slug).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    page = (
        db.query(FunnelPage)
        .filter(
            FunnelPage.account_id == account.id,
            FunnelPage.slug == page_slug,
            FunnelPage.published.is_(True),
        )
        .first()
    )
    if not page:
        raise HTTPException(status_code=404, detail="Funnel page not found")

    email = str(payload.email).lower()
    contact = (
        db.query(Contact)
        .filter(Contact.account_id == account.id, Contact.email == email)
        .first()
    )
    if not contact:
        contact = Contact(
            account_id=account.id,
            name=payload.name,
            email=email,
            phone=payload.phone,
            tags="funnel-lead",
        )
        db.add(contact)
        db.flush()
    else:
        contact.name = payload.name or contact.name
        if payload.phone:
            contact.phone = payload.phone

    submission = FunnelSubmission(
        funnel_page_id=page.id,
        contact_id=contact.id,
        payload_json=payload.payload or {"name": payload.name, "email": email, "phone": payload.phone},
    )
    db.add(submission)
    db.commit()
    return {"ok": True, "contact_id": str(contact.id), "submission_id": str(submission.id)}
