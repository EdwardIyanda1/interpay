import os
import tempfile

_d = tempfile.mkdtemp()
os.environ.update({
    "DATABASE_URL": f"sqlite:///{_d}/test.db", "MAIL_DIR": f"{_d}/mail", "UPLOAD_DIR": f"{_d}/uploads",
    "PAYMENT_GATEWAY": "simulated", "MAIL_MODE": "console", "SECRET_KEY": "test-secret",
    "ADMIN_EMAIL": "admin@interpay.app", "ADMIN_PASSWORD": "admin-pass-123", "WORKER_INTERVAL": "3600",
})
