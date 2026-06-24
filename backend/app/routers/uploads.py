import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse

from app.core.deps import get_current_user
from app.models.models import Usuario

router = APIRouter(prefix="/uploads", tags=["uploads"])

UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_SIZE_MB = 5


@router.post("")
async def subir_archivo(
    file: UploadFile = File(...),
    current_user: Usuario = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Usa JPG, PNG, WEBP o PDF.")

    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"El archivo no debe superar {MAX_SIZE_MB}MB.")

    ext = Path(file.filename).suffix.lower() if file.filename else ".bin"
    filename = f"{uuid.uuid4()}{ext}"
    filepath = UPLOAD_DIR / filename

    with open(filepath, "wb") as f:
        f.write(content)

    return {"url": f"/uploads/{filename}", "filename": filename}


@router.get("/{filename}")
def obtener_archivo(filename: str):
    filepath = UPLOAD_DIR / filename
    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    # Evitar path traversal
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Nombre de archivo inválido")
    return FileResponse(str(filepath))
