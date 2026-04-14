from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.cart import Cart
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse


def normalize_email(email: str) -> str:
    return email.strip().lower()


def register_user(db: Session, payload: RegisterRequest) -> TokenResponse:
    normalized_email = normalize_email(str(payload.email))
    existing_user = db.scalar(select(User).where(User.email == normalized_email))
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        role=payload.role,
        name=payload.name,
        email=normalized_email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.flush()

    db.add(Cart(user_id=user.id))
    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id), user.role.value)
    return TokenResponse(access_token=token, user=user)


def login_user(db: Session, payload: LoginRequest) -> TokenResponse:
    normalized_email = normalize_email(str(payload.email))
    user = db.scalar(select(User).where(User.email == normalized_email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(str(user.id), user.role.value)
    return TokenResponse(access_token=token, user=user)
