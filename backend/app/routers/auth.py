from __future__ import annotations

import re
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import create_access_token, hash_password, verify_password
from app.db import get_db
from app.deps import AuthContext, get_current_auth
from app.models import Account, AccountMember, AccountType, AppSettings, MemberRole, User
from app.schemas import (
    AccountOut,
    AccountUpdate,
    AuthMeOut,
    AuthUserOut,
    LoginRequest,
    SignupRequest,
    SubAccountCreate,
    TokenOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _slugify(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "account"
    return f"{base}-{str(uuid4())[:8]}"


@router.post("/signup", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> TokenOut:
    email = str(payload.email).lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=email,
        hashed_password=hash_password(payload.password),
        display_name=payload.display_name or email.split("@")[0],
    )
    account = Account(
        name=payload.account_name.strip(),
        slug=_slugify(payload.account_name),
        type=AccountType.agency,
        branding_json={"name": payload.account_name.strip(), "primaryColor": "#2563eb"},
    )
    db.add(user)
    db.add(account)
    db.flush()
    membership = AccountMember(user_id=user.id, account_id=account.id, role=MemberRole.owner)
    settings = AppSettings(id=AppSettings.next_id(db), account_id=account.id)
    db.add(membership)
    db.add(settings)
    db.commit()
    db.refresh(user)
    db.refresh(account)

    token = create_access_token(user_id=user.id, account_id=account.id, email=user.email)
    return TokenOut(
        access_token=token,
        user=AuthUserOut.model_validate(user),
        account=AccountOut.model_validate(account),
        role=MemberRole.owner.value,
    )


@router.post("/login", response_model=TokenOut)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenOut:
    email = str(payload.email).lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    membership = (
        db.query(AccountMember)
        .filter(AccountMember.user_id == user.id)
        .order_by(AccountMember.role.asc())
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="User has no account membership")

    account = db.query(Account).filter(Account.id == membership.account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    token = create_access_token(user_id=user.id, account_id=account.id, email=user.email)
    return TokenOut(
        access_token=token,
        user=AuthUserOut.model_validate(user),
        account=AccountOut.model_validate(account),
        role=membership.role.value,
    )


@router.get("/me", response_model=AuthMeOut)
def me(auth: AuthContext = Depends(get_current_auth), db: Session = Depends(get_db)) -> AuthMeOut:
    memberships = db.query(AccountMember).filter(AccountMember.user_id == auth.user.id).all()
    account_ids = [m.account_id for m in memberships]
    accounts = db.query(Account).filter(Account.id.in_(account_ids)).all() if account_ids else []
    return AuthMeOut(
        user=AuthUserOut.model_validate(auth.user),
        account=AccountOut.model_validate(auth.account),
        role=auth.role,
        accounts=[AccountOut.model_validate(a) for a in accounts],
    )


@router.put("/account", response_model=AccountOut)
def update_account(
    payload: AccountUpdate,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> Account:
    if auth.role not in {MemberRole.owner.value, MemberRole.admin.value}:
        raise HTTPException(status_code=403, detail="Only owners/admins can update branding")
    account = auth.account
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(account, key, value)
    db.commit()
    db.refresh(account)
    return account


@router.post("/sub-accounts", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def create_sub_account(
    payload: SubAccountCreate,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> Account:
    if auth.account.type != AccountType.agency:
        raise HTTPException(status_code=400, detail="Only agency accounts can create sub-accounts")
    if auth.role not in {MemberRole.owner.value, MemberRole.admin.value}:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    slug = payload.slug or _slugify(payload.name)
    if db.query(Account).filter(Account.slug == slug).first():
        slug = _slugify(payload.name)

    sub = Account(
        name=payload.name.strip(),
        slug=slug,
        type=AccountType.sub_account,
        parent_account_id=auth.account.id,
        branding_json={"name": payload.name.strip(), "primaryColor": "#2563eb"},
    )
    db.add(sub)
    db.flush()
    db.add(AccountMember(user_id=auth.user.id, account_id=sub.id, role=MemberRole.owner))
    db.add(AppSettings(id=AppSettings.next_id(db), account_id=sub.id))
    db.commit()
    db.refresh(sub)
    return sub


@router.get("/sub-accounts", response_model=list[AccountOut])
def list_sub_accounts(
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> list[Account]:
    return (
        db.query(Account)
        .filter(Account.parent_account_id == auth.account.id)
        .order_by(Account.created_at.desc())
        .all()
    )


@router.post("/switch/{account_id}", response_model=TokenOut)
def switch_account(
    account_id: str,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> TokenOut:
    membership = (
        db.query(AccountMember)
        .filter(AccountMember.user_id == auth.user.id, AccountMember.account_id == account_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of that account")
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    token = create_access_token(user_id=auth.user.id, account_id=account.id, email=auth.user.email)
    return TokenOut(
        access_token=token,
        user=AuthUserOut.model_validate(auth.user),
        account=AccountOut.model_validate(account),
        role=membership.role.value,
    )
