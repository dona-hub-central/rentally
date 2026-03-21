from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
import os
import uuid
from datetime import datetime
import auth as auth_module
import models

router = APIRouter()

UPLOAD_BASE = "/opt/projects/rentally/backend/uploads"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"}


@router.post("/uploads/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth_module.require_admin)
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Extensión no permitida. Usa: {ALLOWED_EXTENSIONS}")

    unique_name = f"{uuid.uuid4()}{ext}"
    save_dir = os.path.join(UPLOAD_BASE, "images")
    os.makedirs(save_dir, exist_ok=True)

    filepath = os.path.join(save_dir, unique_name)
    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)

    return {"url": f"/api/uploads/images/{unique_name}", "filename": unique_name}


@router.post("/uploads/fianza")
async def upload_fianza(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth_module.require_admin)
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".pdf"}:
        raise HTTPException(status_code=400, detail="Solo se aceptan imágenes o PDF")

    unique_name = f"fianza_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4()}{ext}"
    save_dir = os.path.join(UPLOAD_BASE, "fianzas")
    os.makedirs(save_dir, exist_ok=True)

    filepath = os.path.join(save_dir, unique_name)
    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)

    return {"url": f"/api/uploads/fianzas/{unique_name}", "filename": unique_name}
