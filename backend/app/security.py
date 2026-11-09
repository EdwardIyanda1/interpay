import base64
import hashlib
import hmac
import os

from itsdangerous import BadSignature, URLSafeTimedSerializer

from .config import settings


def hash_password(pw: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 200_000)
    return base64.b64encode(salt + dk).decode()


def verify_password(pw: str, stored: str) -> bool:
    raw = base64.b64decode(stored)
    salt, dk = raw[:16], raw[16:]
    return hmac.compare_digest(hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 200_000), dk)


def make_token(salt: str, data) -> str:
    return URLSafeTimedSerializer(settings.secret_key, salt=salt).dumps(data)


def read_token(salt: str, token: str, max_age=None):
    try:
        return URLSafeTimedSerializer(settings.secret_key, salt=salt).loads(token, max_age=max_age)
    except BadSignature:
        return None
