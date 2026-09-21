import base64
import hashlib
import hmac
import json
import os
import secrets
import time

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

bearer = HTTPBearer(auto_error=False)


def _secret() -> bytes:
    value = os.getenv("AUTH_SECRET", "").strip()
    if len(value) < 32:
        raise RuntimeError("AUTH_SECRET must be configured with at least 32 characters.")
    return value.encode("utf-8")


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _unb64(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def hash_password(password: str) -> tuple[str, str]:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
    return _b64(salt), _b64(digest)


def verify_password(password: str, salt: str, expected: str) -> bool:
    try:
        digest = hashlib.scrypt(password.encode("utf-8"), salt=_unb64(salt), n=2**14, r=8, p=1)
        return hmac.compare_digest(_b64(digest), expected)
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: int, expires_seconds: int = 60 * 60 * 24 * 7) -> str:
    header = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = _b64(json.dumps({"sub": user_id, "exp": int(time.time()) + expires_seconds}, separators=(",", ":")).encode())
    signing = f"{header}.{payload}".encode("ascii")
    signature = _b64(hmac.new(_secret(), signing, hashlib.sha256).digest())
    return f"{header}.{payload}.{signature}"


def decode_access_token(token: str) -> int:
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid token")
    signing = f"{parts[0]}.{parts[1]}".encode("ascii")
    expected = _b64(hmac.new(_secret(), signing, hashlib.sha256).digest())
    if not hmac.compare_digest(expected, parts[2]):
        raise ValueError("Invalid token")
    payload = json.loads(_unb64(parts[1]))
    user_id = int(payload["sub"])
    if int(payload["exp"]) <= int(time.time()):
        raise ValueError("Expired token")
    return user_id


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    try:
        user_id = decode_access_token(credentials.credentials)
    except (RuntimeError, ValueError, TypeError, json.JSONDecodeError, UnicodeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired authentication token.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found.")
    return user
