from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .db import get_db
from .models import User
from .security import read_token


def user_from_header(authorization: str | None, db: Session) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Sign in required")
    data = read_token("auth", authorization[7:], 60 * 60 * 24 * 7)
    user = db.get(User, data["uid"]) if data else None
    if not user:
        raise HTTPException(401, "Session expired, sign in again")
    if user.suspended:
        raise HTTPException(403, "Account suspended")
    return user


def current_user(authorization: str | None = Header(None), db: Session = Depends(get_db)) -> User:
    return user_from_header(authorization, db)


def require_organiser(user: User = Depends(current_user)) -> User:
    if user.role not in ("organiser", "admin"):
        raise HTTPException(403, "Organiser access required")
    return user


def require_admin(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Admin access required")
    return user
