from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.deps import AuthContext, get_current_auth
from app.integrations.email_adapter import get_email_adapter
from app.integrations.sms_adapter import get_sms_adapter
from app.models import (
    Campaign,
    CampaignChannel,
    CampaignRecipient,
    CampaignStatus,
    Contact,
    RecipientStatus,
)
from app.redis_client import get_redis
from app.schemas import CampaignCreate, CampaignOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/campaigns", tags=["campaigns"])


def _to_out(c: Campaign) -> CampaignOut:
    return CampaignOut(
        id=c.id,
        name=c.name,
        channel=c.channel,
        subject=c.subject,
        body_template=c.body_template,
        status=c.status,
        audience_filter=c.audience_filter,
        created_at=c.created_at,
        recipient_count=len(c.recipients) if c.recipients is not None else 0,
    )


@router.get("", response_model=list[CampaignOut])
def list_campaigns(auth: AuthContext = Depends(get_current_auth), db: Session = Depends(get_db)):
    rows = (
        db.query(Campaign)
        .filter(Campaign.account_id == auth.account.id)
        .order_by(Campaign.created_at.desc())
        .all()
    )
    return [_to_out(c) for c in rows]


@router.post("", response_model=CampaignOut, status_code=201)
def create_campaign(
    payload: CampaignCreate,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    if payload.channel == CampaignChannel.email and not payload.subject:
        raise HTTPException(status_code=400, detail="Email campaigns require a subject")

    contacts_q = db.query(Contact).filter(Contact.account_id == auth.account.id)
    if payload.contact_ids:
        contacts_q = contacts_q.filter(Contact.id.in_(payload.contact_ids))
    contacts = contacts_q.all()
    if not contacts:
        raise HTTPException(status_code=400, detail="No contacts match audience")

    campaign = Campaign(
        account_id=auth.account.id,
        name=payload.name,
        channel=payload.channel,
        subject=payload.subject,
        body_template=payload.body_template,
        audience_filter=payload.audience_filter,
        status=CampaignStatus.draft,
    )
    db.add(campaign)
    db.flush()
    for contact in contacts:
        db.add(
            CampaignRecipient(
                campaign_id=campaign.id,
                contact_id=contact.id,
                status=RecipientStatus.pending,
            )
        )
    db.commit()
    db.refresh(campaign)
    return _to_out(campaign)


@router.post("/{campaign_id}/send", response_model=CampaignOut)
def send_campaign(
    campaign_id: UUID,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    campaign = (
        db.query(Campaign)
        .filter(Campaign.id == campaign_id, Campaign.account_id == auth.account.id)
        .first()
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status == CampaignStatus.sending:
        raise HTTPException(status_code=400, detail="Campaign already sending")

    campaign.status = CampaignStatus.sending
    db.commit()

    # Enqueue for async worker; also process immediately for demo reliability
    try:
        settings = get_settings()
        get_redis().rpush(settings.campaign_queue_key, str(campaign.id))
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not enqueue campaign: %s", exc)

    _process_campaign(db, campaign)
    db.refresh(campaign)
    return _to_out(campaign)


def _process_campaign(db: Session, campaign: Campaign) -> None:
    email_adapter = get_email_adapter()
    sms_adapter = get_sms_adapter()
    recipients = (
        db.query(CampaignRecipient)
        .filter(
            CampaignRecipient.campaign_id == campaign.id,
            CampaignRecipient.status == RecipientStatus.pending,
        )
        .all()
    )
    failed = 0
    for recipient in recipients:
        contact = db.query(Contact).filter(Contact.id == recipient.contact_id).first()
        if not contact:
            recipient.status = RecipientStatus.failed
            recipient.error = "Contact missing"
            failed += 1
            continue
        try:
            body = campaign.body_template.replace("{{name}}", contact.name or "")
            if campaign.channel == CampaignChannel.email:
                if not contact.email:
                    raise ValueError("Contact has no email")
                msg_id = email_adapter.send(
                    to=contact.email,
                    subject=campaign.subject or campaign.name,
                    body=body,
                )
            else:
                if not contact.phone:
                    raise ValueError("Contact has no phone")
                msg_id = sms_adapter.send(to=contact.phone, body=body)
            recipient.status = RecipientStatus.sent
            recipient.provider_message_id = msg_id
        except Exception as exc:  # noqa: BLE001
            recipient.status = RecipientStatus.failed
            recipient.error = str(exc)
            failed += 1
    campaign.status = CampaignStatus.failed if failed and failed == len(recipients) else CampaignStatus.sent
    db.commit()
