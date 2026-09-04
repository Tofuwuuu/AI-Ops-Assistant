from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import AuthContext, get_current_auth
from app.models import AppSettings
from app.schemas import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


def _get_or_create(db: Session, account_id) -> AppSettings:
    row = db.query(AppSettings).filter(AppSettings.account_id == account_id).first()
    if not row:
        # Fallback for legacy singleton row (id=1, account_id null)
        legacy = db.query(AppSettings).filter(AppSettings.account_id.is_(None)).first()
        if legacy:
            legacy.account_id = account_id
            db.commit()
            db.refresh(legacy)
            return legacy
        row = AppSettings(id=AppSettings.next_id(db), account_id=account_id)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@router.get("", response_model=SettingsOut)
def get_settings_row(
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> AppSettings:
    return _get_or_create(db, auth.account.id)


@router.put("", response_model=SettingsOut)
def update_settings_row(
    payload: SettingsUpdate,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> AppSettings:
    row = _get_or_create(db, auth.account.id)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row
