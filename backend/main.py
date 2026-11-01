from fastapi.staticfiles import StaticFiles
from typing import Literal
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone
import sqlite3
import shutil

class StatusUpdate(BaseModel):
    status: Literal["Received", "In Progress", "Resolved"]

app = FastAPI(
    title="InfraSense API",
    description="Public Infrastructure Monitoring System",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
DB_PATH = BASE_DIR / "infrasense.db"

UPLOAD_DIR.mkdir(exist_ok=True)
app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads",
)
ALLOWED_CATEGORIES = {
    "Pothole",
    "Road Crack",
    "Garbage",
    "Waterlogging",
    "Broken Streetlight",
}


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_database():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS complaints (
                id TEXT PRIMARY KEY,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                photo_filename TEXT,
                reported_at TEXT NOT NULL,
                status TEXT NOT NULL
            )
        """)


init_database()


@app.get("/")
def home():
    return {
        "message": "Welcome to InfraSense!",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/complaints", status_code=201)
async def create_complaint(
    category: str = Form(...),
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    photo: UploadFile | None = File(default=None),
):
    if category not in ALLOWED_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category.")

    if not -90 <= latitude <= 90:
        raise HTTPException(status_code=400, detail="Invalid latitude.")

    if not -180 <= longitude <= 180:
        raise HTTPException(status_code=400, detail="Invalid longitude.")

    photo_filename = None

    if photo and photo.filename:
        allowed_types = {
            "image/jpeg": {".jpg", ".jpeg"},
            "image/png": {".png"},
            "image/webp": {".webp"},
        }

        extension = Path(photo.filename).suffix.lower()

        if extension not in allowed_types.get(photo.content_type, set()):
            await photo.close()
            raise HTTPException(
                status_code=400,
                detail="Upload a matching JPG, PNG, or WebP image.",
            )

        photo_filename = f"{uuid4().hex}{extension}"
        destination = UPLOAD_DIR / photo_filename

        try:
            with destination.open("wb") as buffer:
                shutil.copyfileobj(photo.file, buffer)
        except Exception:
            destination.unlink(missing_ok=True)
            raise HTTPException(
                status_code=500,
                detail="Could not save the uploaded photo.",
            )
        finally:
            await photo.close()

    complaint = {
        "id": str(uuid4()),
        "category": category,
        "description": description,
        "latitude": latitude,
        "longitude": longitude,
        "photo_filename": photo_filename,
        "reported_at": datetime.now(timezone.utc).isoformat(),
        "status": "Received",
    }

    try:
        with get_connection() as connection:
            connection.execute("""
                INSERT INTO complaints (
                    id, category, description, latitude, longitude,
                    photo_filename, reported_at, status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                complaint["id"],
                complaint["category"],
                complaint["description"],
                complaint["latitude"],
                complaint["longitude"],
                complaint["photo_filename"],
                complaint["reported_at"],
                complaint["status"],
            ))
    except sqlite3.Error as error:
        if photo_filename:
            (UPLOAD_DIR / photo_filename).unlink(missing_ok=True)
        raise HTTPException(
            status_code=500,
            detail="Could not save complaint to the database.",
        ) from error

    return {
        "message": "Complaint saved successfully.",
        **complaint,
    }


@app.get("/complaints")
def list_complaints():
    with get_connection() as connection:
        rows = connection.execute("""
            SELECT * FROM complaints
            ORDER BY reported_at DESC
        """).fetchall()

    return {
        "total": len(rows),
        "complaints": [dict(row) for row in rows],
    }


@app.patch("/complaints/{complaint_id}/status")
def update_complaint_status(complaint_id: str, update: StatusUpdate):
    with get_connection() as connection:
        cursor = connection.execute(
            "UPDATE complaints SET status = ? WHERE id = ?",
            (update.status, complaint_id)
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Complaint not found."
            )

        row = connection.execute(
            "SELECT * FROM complaints WHERE id = ?",
            (complaint_id,)
        ).fetchone()

    return {
        "message": "Complaint status updated successfully.",
        "complaint": dict(row)
    }