from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import AuthContext, get_current_auth
from app.models import (
    Account,
    AccountType,
    Appointment,
    Campaign,
    Contact,
    Deal,
    FunnelPage,
    FunnelSubmission,
    Invoice,
    Ticket,
)
from app.schemas import AgencyStatsOut

router = APIRouter(prefix="/agency", tags=["agency"])


@router.get("/stats", response_model=list[AgencyStatsOut])
def agency_stats(auth: AuthContext = Depends(get_current_auth), db: Session = Depends(get_db)):
    if auth.account.type != AccountType.agency:
        raise HTTPException(status_code=400, detail="Only agency accounts have sub-account stats")

    subs = (
        db.query(Account)
        .filter(Account.parent_account_id == auth.account.id)
        .order_by(Account.name)
        .all()
    )
    accounts = [auth.account, *subs]
    result: list[AgencyStatsOut] = []
    for acc in accounts:
        sub_count = (
            db.query(FunnelSubmission)
            .join(FunnelPage, FunnelSubmission.funnel_page_id == FunnelPage.id)
            .filter(FunnelPage.account_id == acc.id)
            .count()
        )
        result.append(
            AgencyStatsOut(
                account_id=acc.id,
                account_name=acc.name,
                tickets=db.query(Ticket).filter(Ticket.account_id == acc.id).count(),
                contacts=db.query(Contact).filter(Contact.account_id == acc.id).count(),
                deals=db.query(Deal).filter(Deal.account_id == acc.id).count(),
                appointments=db.query(Appointment).filter(Appointment.account_id == acc.id).count(),
                campaigns=db.query(Campaign).filter(Campaign.account_id == acc.id).count(),
                invoices=db.query(Invoice).filter(Invoice.account_id == acc.id).count(),
                funnel_submissions=sub_count,
            )
        )
    return result
