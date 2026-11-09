import asyncio
import json

from fastapi import APIRouter, Body, Depends, Header, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import event as sa_event
from sqlalchemy.orm import Session

from .db import SessionLocal, get_db
from .models import Event, Outbox
from .runtime import R
from .security import make_token, read_token
from .util import iso, utcnow


def _evt(row: Outbox) -> dict:
    return {"seq": row.seq, "topic": row.topic, "type": row.type, "ts": iso(row.created_at), "data": json.loads(row.data)}


def emit(db: Session, topic: str, type_: str, data: dict):
    """Write to the outbox in the same transaction. Pushed to sockets after commit."""
    row = Outbox(topic=topic, type=type_, data=json.dumps(data), created_at=utcnow())
    db.add(row)
    db.flush()
    db.info.setdefault("outbox", []).append(_evt(row))


def after_commit(db: Session, fn):
    db.info.setdefault("after", []).append(fn)


@sa_event.listens_for(Session, "after_commit")
def _after_commit(session):
    for fn in session.info.pop("after", []):
        try:
            fn()
        except Exception:
            pass
    for e in session.info.pop("outbox", []):
        if R.loop:
            asyncio.run_coroutine_threadsafe(manager.broadcast(e), R.loop)


@sa_event.listens_for(Session, "after_rollback")
def _after_rollback(session):
    session.info.pop("outbox", None)
    session.info.pop("after", None)


class Manager:
    def __init__(self):
        self.conns: dict[WebSocket, set[str]] = {}

    async def broadcast(self, evt: dict):
        for ws, topics in list(self.conns.items()):
            if evt["topic"] in topics:
                try:
                    await ws.send_json(evt)
                except Exception:
                    self.conns.pop(ws, None)


manager = Manager()


def replay(topics, last_seq: int, limit: int = 200):
    with SessionLocal() as db:
        rows = (
            db.query(Outbox)
            .filter(Outbox.seq > last_seq, Outbox.topic.in_(list(topics)))
            .order_by(Outbox.seq)
            .limit(limit + 1)
            .all()
        )
    if len(rows) > limit:
        return None
    return [_evt(r) for r in rows]


router = APIRouter()


@router.post("/api/ws/ticket")
def ws_ticket(body: dict = Body(default={}), authorization: str | None = Header(None), db: Session = Depends(get_db)):
    from .deps import user_from_header

    topics: list[str] = []
    if authorization:
        user = user_from_header(authorization, db)
        topics.append(f"user:{user.id}")
        if user.role == "admin":
            topics.append("admin")
        else:
            topics += [f"event:{i}" for (i,) in db.query(Event.id).filter(Event.organiser_id == user.id)]
    if body.get("order_token"):
        data = read_token("order", body["order_token"])
        if data:
            topics.append(f"order:{data['oid']}")
    return {"ticket": make_token("ws", {"topics": topics}), "topics": topics}


@router.websocket("/ws")
async def ws_endpoint(ws: WebSocket, ticket: str):
    data = read_token("ws", ticket, 60)
    if not data:
        await ws.close(code=4401)
        return
    await ws.accept()
    topics = set(data["topics"])
    manager.conns[ws] = topics
    try:
        await ws.send_json({"type": "hello", "topics": sorted(topics)})
        while True:
            msg = await ws.receive_json()
            kind = msg.get("type")
            if kind == "ping":
                await ws.send_json({"type": "pong"})
            elif kind == "resume":
                events = await run_in_threadpool(replay, topics, int(msg.get("last_seq", 0)))
                if events is None:
                    await ws.send_json({"type": "refetch"})
                else:
                    for e in events:
                        await ws.send_json(e)
                    await ws.send_json({"type": "resumed", "count": len(events)})
    except WebSocketDisconnect:
        pass
    finally:
        manager.conns.pop(ws, None)
