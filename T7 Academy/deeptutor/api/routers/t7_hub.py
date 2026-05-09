import os
import json
import tempfile
import subprocess
from typing import Optional, Any
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import asyncio

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
import fitz  # PyMuPDF
from deeptutor.services.llm import complete
import firebase_admin
from firebase_admin import credentials, storage, firestore
from dotenv import load_dotenv

router = APIRouter()

# Load environment variables
load_dotenv()

# --- Config & Initialization ---
# GROQ_API_KEY no longer needed directly as deeptutor.services.llm handles it
# groq_client removed in favor of unified deeptutor.services.llm.complete

FIREBASE_CONFIG = os.getenv("FIREBASE_CONFIG_JSON")
FIREBASE_BUCKET = os.getenv("FIREBASE_STORAGE_BUCKET")
firebase_app = None

if FIREBASE_CONFIG and FIREBASE_BUCKET:
    try:
        # Check if already initialized to avoid error
        try:
            firebase_app = firebase_admin.get_app()
        except ValueError:
            cred = credentials.Certificate(json.loads(FIREBASE_CONFIG))
            firebase_app = firebase_admin.initialize_app(cred, {
                'storageBucket': FIREBASE_BUCKET
            })
    except Exception as e:
        print(f" [T7 HUB] Firebase initialization failed: {e}")

# In-memory session store
sessions: dict = {}

# --- Helper Functions ---

async def generate_text(prompt: Any, temperature: float = 0.7, max_tokens: int = 1024, json_mode: bool = False):
    try:
        # Use DeepTutor's built-in completion service which has automatic retries
        response = await complete(
            prompt, 
            temperature=temperature, 
            max_tokens=max_tokens,
            # json_mode is handled by the provider if supported
        )
        return response
    except Exception as e:
        raise HTTPException(500, f"AI Generation Failed: {str(e)}")

def chunk_text(text: str, max_words: int = 400) -> list[dict]:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[dict] = []
    current_chunk = ""
    current_words = 0
    idx = 0
    for para in paragraphs:
        para_words = len(para.split())
        if current_words + para_words > max_words and current_chunk:
            idx += 1
            chunks.append({"id": idx, "text": current_chunk.strip()})
            current_chunk = para + "\n\n"
            current_words = para_words
        else:
            current_chunk += para + "\n\n"
            current_words += para_words
    if current_chunk.strip():
        idx += 1
        chunks.append({"id": idx, "text": current_chunk.strip()})
    return chunks

def extract_pdf_text(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text_parts = [page.get_text() for page in doc]
    doc.close()
    return "\n\n".join(text_parts)

def get_youtube_transcript(url: str) -> str:
    with tempfile.TemporaryDirectory() as tmpdir:
        sub_file = os.path.join(tmpdir, "subs")
        try:
            subprocess.run(
                ["yt-dlp", "--write-auto-sub", "--sub-lang", "en", "--skip-download", "--sub-format", "vtt", "-o", sub_file, url],
                capture_output=True, text=True, timeout=60, check=True,
            )
            for f in Path(tmpdir).glob("*.vtt"):
                raw = f.read_text(encoding="utf-8", errors="ignore")
                lines = []
                for line in raw.splitlines():
                    line = line.strip()
                    if not line or line.startswith(("WEBVTT", "Kind:", "Language:")) or "-->" in line or line.isdigit():
                        continue
                    if lines and lines[-1] == line:
                        continue
                    lines.append(line)
                return " ".join(lines)
        except Exception:
            pass
    return ""

# --- Prompts ---

MODE_PROMPTS = {
    "story": "You are a master storyteller teacher. Explain the following concept as a vivid, engaging story with characters and real-life analogies. CONCEPT:\n{content}",
    "funny": "You are a stand-up comedian professor. Explain the following concept in a hilarious way using humor and memes. CONCEPT:\n{content}",
    "simple": "Explain the following concept in the absolute simplest way possible, using short sentences and everyday analogies. CONCEPT:\n{content}",
    "exam": "Provide a precise definition, key points to remember, and common exam questions/answers for: CONCEPT:\n{content}",
    "debate": "Have a back-and-forth debate between a Professor and a skeptical Student about: CONCEPT:\n{content}",
}

QUIZ_PROMPT = "Based on the following concept, generate exactly 4 multiple-choice questions. Return ONLY valid JSON: [{{\"question\": \"...\", \"options\": {{\"A\": \"...\", \"B\": \"...\", \"C\": \"...\", \"D\": \"...\"}}, \"correct\": \"A\"}}]. CONCEPT:\n{content}"
TITLE_PROMPT = "Give a short, descriptive title (max 8 words) for this academic concept. Return ONLY the title.\n\n{content}"
TUTOR_PROMPT = "You are T7, an AI Learning Assistant. Use this context to answer the student concisely (max 3 sentences). CONTEXT:\n{content}\n\nQUESTION: {query}"

# --- Endpoints ---

@router.get("/health")
def health():
    return {"status": "ok", "message": "T7 Hub Router is active"}

@router.post("/upload/pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files supported")
    content = await file.read()
    text = await asyncio.to_thread(extract_pdf_text, content)
    chunks = chunk_text(text)
    
    async def get_title(chunk):
        try:
            return (await generate_text(TITLE_PROMPT.format(content=chunk["text"][:500]), max_tokens=20)).strip().strip('"').strip("'")
        except:
            return f"Concept {chunk['id']}"

    tasks = [get_title(chunk) for chunk in chunks]
    titles = await asyncio.gather(*tasks)

    titled_chunks = [{**chunks[i], "title": titles[i]} for i in range(len(chunks))]
    session_id = f"session_{len(sessions) + 1}"
    sessions[session_id] = {"chunks": titled_chunks, "current_chunk": 0, "mode": "story", "scores": [], "xp": 0, "streak": 0, "badges": []}
    return {"session_id": session_id, "total_chunks": len(titled_chunks), "chunks": titled_chunks}

@router.post("/upload/youtube")
async def upload_youtube(url: str = Form(...)):
    transcript = await asyncio.to_thread(get_youtube_transcript, url)
    if not transcript:
        try:
            transcript = await generate_text(f"Summarize the educational content of this video in detail: {url}")
        except:
            raise HTTPException(400, "Could not process YouTube URL")
    chunks = chunk_text(transcript)
    
    async def get_title(chunk):
        try:
            return (await generate_text(TITLE_PROMPT.format(content=chunk["text"][:500]), max_tokens=20)).strip().strip('"').strip("'")
        except:
            return f"Concept {chunk['id']}"

    tasks = [get_title(chunk) for chunk in chunks]
    titles = await asyncio.gather(*tasks)

    titled_chunks = [{**chunks[i], "title": titles[i]} for i in range(len(chunks))]
    session_id = f"session_{len(sessions) + 1}"
    sessions[session_id] = {"chunks": titled_chunks, "current_chunk": 0, "mode": "story", "scores": [], "xp": 0, "streak": 0, "badges": []}
    return {"session_id": session_id, "total_chunks": len(titled_chunks), "chunks": titled_chunks}

@router.post("/generate")
async def generate_content(session_id: str = Form(...), chunk_id: int = Form(...), mode: str = Form("story")):
    if session_id not in sessions: raise HTTPException(404, "Session not found")
    session = sessions[session_id]
    chunk = next((c for c in session["chunks"] if c["id"] == chunk_id), None)
    if not chunk: raise HTTPException(404, "Chunk not found")
    
    prompt = MODE_PROMPTS.get(mode, MODE_PROMPTS["story"]).format(content=chunk["text"])
    generated = await generate_text(prompt, max_tokens=2048)
    session["mode"] = mode
    session["current_chunk"] = chunk_id
    return {"chunk_id": chunk_id, "chunk_title": chunk.get("title"), "mode": mode, "content": generated}

@router.post("/quiz")
async def generate_quiz(session_id: str = Form(...), chunk_id: int = Form(...)):
    if session_id not in sessions: raise HTTPException(404, "Session not found")
    session = sessions[session_id]
    chunk = next((c for c in session["chunks"] if c["id"] == chunk_id), None)
    if not chunk: raise HTTPException(404, "Chunk not found")
    
    try:
        raw = await generate_text(QUIZ_PROMPT.format(content=chunk["text"]), temperature=0.1, json_mode=True)
        if "```json" in raw: raw = raw.split("```json")[1].split("```")[0].strip()
        questions = json.loads(raw)
        if isinstance(questions, dict) and "questions" in questions: questions = questions["questions"]
    except:
        questions = [{"question": "Ready to proceed?", "options": {"A": "Yes", "B": "No", "C": "Maybe", "D": "Sure"}, "correct": "A"}]
    return {"chunk_id": chunk_id, "questions": questions}

@router.post("/adapt")
async def adapt_mode(session_id: str = Form(...), score: int = Form(...)):
    if session_id not in sessions: raise HTTPException(404, "Session not found")
    session = sessions[session_id]
    session["scores"].append(score)
    
    xp_earned = 100 if score >= 90 else 75 if score >= 75 else 50 if score >= 50 else 10
    if score >= 50: session["streak"] += 1
    else: session["streak"] = 0
    
    streak_bonus = min(session["streak"], 5) * 25
    session["xp"] += (xp_earned + streak_bonus)
    
    new_mode = "exam" if score >= 75 else "story" if score >= 50 else "simple"
    message = "Excellent! Let's get exam-ready." if score >= 90 else "Good progress!"
    
    session["mode"] = new_mode
    next_chunk_id = session["current_chunk"] + 1
    completed = next_chunk_id > len(session["chunks"])
    
    return {
        "new_mode": new_mode, "message": message, "completed": completed,
        "xp_earned": xp_earned, "total_xp": session["xp"], "streak": session["streak"]
    }

@router.post("/tutor_chat")
async def tutor_chat(session_id: str = Form(...), chunk_id: int = Form(...), query: str = Form(...)):
    if session_id not in sessions: raise HTTPException(404, "Session not found")
    session = sessions[session_id]
    chunk = next((c for c in session["chunks"] if c["id"] == chunk_id), None)
    context = chunk["text"] if chunk else "No context"
    answer = await generate_text(TUTOR_PROMPT.format(content=context, query=query), max_tokens=256)
    return {"answer": answer.strip()}

@router.post("/library/upload")
async def library_upload(file: UploadFile = File(...), subject: str = Form(...), owner_id: str = Form("global")):
    if not firebase_app:
        upload_dir = Path("data/library") / owner_id / subject
        upload_dir.mkdir(parents=True, exist_ok=True)
        with open(upload_dir / file.filename, "wb") as f: f.write(await file.read())
        return {"status": "success", "message": "Saved locally"}
    
    bucket = storage.bucket()
    blob = bucket.blob(f"library/{owner_id}/{subject}/{file.filename}")
    blob.upload_from_string(await file.read(), content_type=file.content_type)
    return {"status": "success", "message": "Uploaded to Firebase"}

@router.get("/library/files")
async def library_list(owner_id: str = "global"):
    lib = {}
    if not firebase_app:
        root = Path("data/library") / owner_id
        if root.exists():
            for d in root.iterdir():
                if d.is_dir(): lib[d.name] = [f.name for f in d.iterdir() if f.is_file()]
        return lib
    
    bucket = storage.bucket()
    prefix = f"library/{owner_id}/"
    for b in bucket.list_blobs(prefix=prefix):
        p = b.name.split("/")
        if len(p) >= 4: # library / owner_id / subject / filename
            subject = p[2]
            filename = p[3]
            if subject not in lib: lib[subject] = []
            lib[subject].append(filename)
    return lib

@router.get("/library/download")
async def library_download(subject: str, filename: str, owner_id: str = "global"):
    if not firebase_app:
        file_path = Path("data/library") / owner_id / subject / filename
        if not file_path.exists():
            raise HTTPException(404, "File not found")
        return FileResponse(file_path, filename=filename)
    
    try:
        bucket = storage.bucket()
        blob = bucket.blob(f"library/{owner_id}/{subject}/{filename}")
        if not blob.exists():
            raise HTTPException(404, "File not found")
        
        # Download as stream
        file_stream = blob.download_as_bytes()
        from io import BytesIO
        return StreamingResponse(
            BytesIO(file_stream),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(500, f"Download failed: {str(e)}")

@router.post("/library/share")
async def library_share(subject: str = Form(...), owner_id: str = Form(...)):
    if not firebase_app:
        raise HTTPException(500, "Firebase not configured for sharing")
    
    import random
    import string
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    try:
        db = firestore.client()
        db.collection("shared_shelves").document(code).set({
            "code": code,
            "subject": subject,
            "owner_id": owner_id,
            "created_at": firestore.SERVER_TIMESTAMP
        })
        return {"status": "success", "code": code}
    except Exception as e:
        raise HTTPException(500, f"Failed to share: {str(e)}")

@router.get("/library/redeem")
async def library_redeem(code: str):
    if not firebase_app:
        raise HTTPException(500, "Firebase not configured")
    
    try:
        db = firestore.client()
        doc = db.collection("shared_shelves").document(code.upper()).get()
        if not doc.exists:
            raise HTTPException(404, "Invalid or expired share code")
        return doc.to_dict()
    except Exception as e:
        raise HTTPException(500, f"Redeem failed: {str(e)}")

@router.get("/library/shared/files")
async def library_shared_list(owner_id: str, subject: str):
    lib = []
    if not firebase_app:
        root = Path("data/library") / owner_id / subject
        if root.exists():
            lib = [f.name for f in root.iterdir() if f.is_file()]
        return lib
    
    try:
        bucket = storage.bucket()
        prefix = f"library/{owner_id}/{subject}/"
        for b in bucket.list_blobs(prefix=prefix):
            p = b.name.split("/")
            if len(p) >= 4:
                lib.append(p[3])
        return lib
    except Exception as e:
        raise HTTPException(500, f"Failed to list shared files: {str(e)}")
