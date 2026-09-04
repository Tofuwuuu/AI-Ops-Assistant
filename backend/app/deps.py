from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth import decode_access_token
from app.db import get_db
from app.models import Account, AccountMember, User

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class AuthContext:
    user: User
    account: Account
    role: str
    membership: AccountMember


def get_current_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    x_account_id: str | None = Header(default=None, alias="X-Account-Id"),
    db: Session = Depends(get_db),
) -> AuthContext:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    user_id = payload.get("sub")
    token_account_id = payload.get("account_id")
    if not user_id or not token_account_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    account_id = x_account_id or token_account_id
    membership = (
        db.query(AccountMember)
        .filter(AccountMember.user_id == user.id, AccountMember.account_id == account_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this account")

    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    return AuthContext(user=user, account=account, role=membership.role.value, membership=membership)


def get_current_account(auth: AuthContext = Depends(get_current_auth)) -> Account:
    return auth.account


def get_optional_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    x_account_id: str | None = Header(default=None, alias="X-Account-Id"),
    db: Session = Depends(get_db),
) -> AuthContext | None:
    if credentials is None or not credentials.credentials:
        return None
    try:
        return get_current_auth(credentials, x_account_id, db)
    except HTTPException:
        return None


def resolve_account_id(auth: AuthContext) -> UUID:
    return auth.account.id
