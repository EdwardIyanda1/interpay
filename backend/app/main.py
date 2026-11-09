import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import models, realtime, worker
from .config import settings
from .db import Base, SessionLocal, engine
from .models import User
from .routers import admin, auth, organiser, public
from .runtime import R
from .security import hash_password


def ensure_admin():
    with SessionLocal() as db:
        if not db.query(User).filter(User.role == "admin").first():
            db.add(User(email=settings.admin_email.lower(), name="Admin", role="admin", approved=True,
                        password_hash=hash_password(settings.admin_password)))
            db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)  # use Alembic migrations for production
    ensure_admin()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    R.loop = asyncio.get_running_loop()
    R.kick_event = asyncio.Event()
    task = asyncio.create_task(worker.run())
    yield
    task.cancel()


app = FastAPI(title="InterPay API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
settings.upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(settings.upload_dir)), name="uploads")
for r in (auth.router, public.router, organiser.router, admin.router, realtime.router):
    app.include_router(r)
