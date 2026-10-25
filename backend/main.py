from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sqlite3
import os
from datetime import date

app = FastAPI(title="My Web App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "app.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS posts (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            title   TEXT NOT NULL,
            content TEXT NOT NULL,
            status  TEXT DEFAULT 'draft',
            created_at TEXT DEFAULT (date('now')),
            updated_at TEXT DEFAULT (date('now'))
        );
        CREATE TABLE IF NOT EXISTS events (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            event_date  TEXT NOT NULL,
            note        TEXT,
            created_at  TEXT DEFAULT (date('now'))
        );
    """)
    conn.commit()
    conn.close()

init_db()

# ── Blog Models ──────────────────────────────────────────
class PostCreate(BaseModel):
    title: str
    content: str
    status: Optional[str] = "draft"

class PostUpdate(BaseModel):
    title: Optional[str]
    content: Optional[str]
    status: Optional[str]

# ── Blog Endpoints ───────────────────────────────────────
@app.get("/posts")
def get_posts(status: Optional[str] = None):
    conn = get_db()
    if status:
        rows = conn.execute("SELECT * FROM posts WHERE status=? ORDER BY created_at DESC", (status,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM posts ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/posts/{post_id}")
def get_post(post_id: int):
    conn = get_db()
    row = conn.execute("SELECT * FROM posts WHERE id=?", (post_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Post not found")
    return dict(row)

@app.post("/posts", status_code=201)
def create_post(post: PostCreate):
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO posts (title, content, status) VALUES (?,?,?)",
        (post.title, post.content, post.status)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM posts WHERE id=?", (cur.lastrowid,)).fetchone()
    conn.close()
    return dict(row)

@app.put("/posts/{post_id}")
def update_post(post_id: int, post: PostUpdate):
    conn = get_db()
    existing = conn.execute("SELECT * FROM posts WHERE id=?", (post_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(404, "Post not found")
    fields = {k: v for k, v in post.dict().items() if v is not None}
    fields["updated_at"] = date.today().isoformat()
    sets = ", ".join(f"{k}=?" for k in fields)
    conn.execute(f"UPDATE posts SET {sets} WHERE id=?", (*fields.values(), post_id))
    conn.commit()
    row = conn.execute("SELECT * FROM posts WHERE id=?", (post_id,)).fetchone()
    conn.close()
    return dict(row)

@app.delete("/posts/{post_id}")
def delete_post(post_id: int):
    conn = get_db()
    conn.execute("DELETE FROM posts WHERE id=?", (post_id,))
    conn.commit()
    conn.close()
    return {"ok": True}

# ── Calendar Models ──────────────────────────────────────
class EventCreate(BaseModel):
    name: str
    event_date: str   # YYYY-MM-DD
    note: Optional[str] = ""

class EventUpdate(BaseModel):
    name: Optional[str]
    event_date: Optional[str]
    note: Optional[str]

# ── Calendar Endpoints ───────────────────────────────────
@app.get("/events")
def get_events():
    conn = get_db()
    rows = conn.execute("SELECT * FROM events ORDER BY event_date ASC").fetchall()
    conn.close()
    today = date.today().isoformat()
    result = []
    for r in rows:
        d = dict(r)
        delta = (date.fromisoformat(d["event_date"]) - date.today()).days
        d["days_until"] = delta
        result.append(d)
    return result

@app.post("/events", status_code=201)
def create_event(event: EventCreate):
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO events (name, event_date, note) VALUES (?,?,?)",
        (event.name, event.event_date, event.note)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM events WHERE id=?", (cur.lastrowid,)).fetchone()
    conn.close()
    d = dict(row)
    d["days_until"] = (date.fromisoformat(d["event_date"]) - date.today()).days
    return d

@app.put("/events/{event_id}")
def update_event(event_id: int, event: EventUpdate):
    conn = get_db()
    existing = conn.execute("SELECT * FROM events WHERE id=?", (event_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(404, "Event not found")
    fields = {k: v for k, v in event.dict().items() if v is not None}
    sets = ", ".join(f"{k}=?" for k in fields)
    conn.execute(f"UPDATE events SET {sets} WHERE id=?", (*fields.values(), event_id))
    conn.commit()
    row = conn.execute("SELECT * FROM events WHERE id=?", (event_id,)).fetchone()
    conn.close()
    d = dict(row)
    d["days_until"] = (date.fromisoformat(d["event_date"]) - date.today()).days
    return d

@app.delete("/events/{event_id}")
def delete_event(event_id: int):
    conn = get_db()
    conn.execute("DELETE FROM events WHERE id=?", (event_id,))
    conn.commit()
    conn.close()
    return {"ok": True}
