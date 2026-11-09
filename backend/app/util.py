import re
import unicodedata
from datetime import datetime, timezone
from zoneinfo import ZoneInfo


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(dt):
    return dt.isoformat(timespec="seconds") + "Z" if dt else None


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text[:100] or "event"


RESERVED_SLUGS = {"new", "edit", "admin", "api", "create", "list", "all"}


def normalize_phone(raw: str) -> str:
    p = re.sub(r"[\s\-()]", "", raw or "")
    if p.startswith("+"):
        digits = p[1:]
    elif p.startswith("00"):
        digits = p[2:]
    elif p.startswith("0") and len(p) == 11:
        digits = "234" + p[1:]
    elif p.startswith("234"):
        digits = p
    elif len(p) == 10 and p[0] in "789":
        digits = "234" + p
    else:
        raise ValueError("Enter a valid phone number, with country code if outside Nigeria")
    if not digits.isdigit() or not 8 <= len(digits) <= 15:
        raise ValueError("Enter a valid phone number")
    return "+" + digits


def year_of(start_utc: datetime, tz: str) -> int:
    return start_utc.replace(tzinfo=timezone.utc).astimezone(ZoneInfo(tz)).year


def naira(kobo: int) -> str:
    return f"NGN {kobo / 100:,.2f}"
