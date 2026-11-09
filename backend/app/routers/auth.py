from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import current_user
from ..models import User
from ..security import hash_password, make_token, verify_password

router = APIRouter(prefix="/api/auth")


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    name: str = Field(default="", max_length=120)


class LoginIn(BaseModel):
    email: str
    password: str


def user_dict(u: User) -> dict:
    return {"id": u.id, "email": u.email, "name": u.name, "role": u.role, "approved": u.approved}


def session_for(u: User) -> dict:
    return {"token": make_token("auth", {"uid": u.id}), "user": user_dict(u)}


@router.post("/register")
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "An account with this email already exists")
    u = User(email=email, name=body.name, password_hash=hash_password(body.password), role="organiser")
    db.add(u)
    db.commit()
    return session_for(u)


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == body.email.lower()).first()
    if not u or not verify_password(body.password, u.password_hash):
        raise HTTPException(401, "Wrong email or password")
    if u.suspended:
        raise HTTPException(403, "Account suspended")
    return session_for(u)


@router.get("/me")
def me(user: User = Depends(current_user)):
    return user_dict(user)
