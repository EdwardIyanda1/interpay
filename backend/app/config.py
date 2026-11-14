import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()  # reads backend/.env without overriding variables already set


def _e(key, default=""):
    return os.environ.get(key, default)


class Settings:
    def __init__(self):
        self.database_url = _e("DATABASE_URL", "sqlite:///./interpay.db")
        self.secret_key = _e("SECRET_KEY", "dev-secret-change-me")
        self.api_base_url = _e("API_BASE_URL", "http://localhost:8000").rstrip("/")
        self.web_base_url = _e("WEB_BASE_URL", "http://localhost:5173").rstrip("/")
        self.app_scheme = _e("APP_SCHEME", "interpay")
        self.cors_origins = [o.strip() for o in _e("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
        self.gateway = _e("PAYMENT_GATEWAY", "simulated")
        self.ipg_mode = _e("IPG_MODE", "TEST").upper()
        self.ipg_merchant_code = _e("IPG_MERCHANT_CODE")
        self.ipg_pay_item_id = _e("IPG_PAY_ITEM_ID")
        live = self.ipg_mode == "LIVE"
        self.ipg_script_url = _e(
            "IPG_SCRIPT_URL",
            "https://newwebpay.interswitchng.com/inline-checkout.js" if live
            else "https://newwebpay.qa.interswitchng.com/inline-checkout.js",
        )
        self.ipg_verify_url = _e(
            "IPG_VERIFY_URL",
            "https://webpay.interswitchng.com/collections/api/v1/gettransaction.json" if live
            else "https://qa.interswitchng.com/collections/api/v1/gettransaction.json",
        )
        self.payout_provider = _e("PAYOUT_PROVIDER", "simulated")
        self.platform_fee_percent = float(_e("PLATFORM_FEE_PERCENT", "3"))
        self.cancel_window_hours = int(_e("CANCEL_WINDOW_HOURS", "12"))
        self.reservation_minutes = int(_e("RESERVATION_MINUTES", "15"))
        self.mail_mode = _e("MAIL_MODE", "console")
        self.mail_dir = Path(_e("MAIL_DIR", "./mail_outbox"))
        self.smtp_host = _e("SMTP_HOST")
        self.smtp_port = int(_e("SMTP_PORT", "587"))
        self.smtp_user = _e("SMTP_USER")
        self.smtp_password = _e("SMTP_PASSWORD")
        self.mail_from = _e("MAIL_FROM", "InterPay <tickets@interpay.app>")
        self.admin_email = _e("ADMIN_EMAIL", "admin@interpay.app")
        self.admin_password = _e("ADMIN_PASSWORD", "change-me-now")
        self.upload_dir = Path(_e("UPLOAD_DIR", "./uploads"))
        self.worker_interval = float(_e("WORKER_INTERVAL", "5"))


settings = Settings()
