from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AppSettings
from app.schemas import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])

SETTINGS_ROW_ID = 1


def _get_or_create(db: Session) -> AppSettings:
    row = db.query(AppSettings).filter(AppSettings.id == SETTINGS_ROW_ID).first()
    if not row:
        row = AppSettings(id=SETTINGS_ROW_ID)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@router.get("", response_model=SettingsOut)
def get_settings_row(db: Session = Depends(get_db)) -> AppSettings:
    return _get_or_create(db)


@router.put("", response_model=SettingsOut)
def update_settings_row(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
) -> AppSettings:
    row = _get_or_create(db)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row
