from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_rol
from app.models.models import Comunicado, NivelComunicado, RolUsuario, Usuario

router = APIRouter(prefix="/comunicados", tags=["comunicados"])


class ComunicadoCreate(BaseModel):
    titulo: str
    mensaje: str
    nivel: NivelComunicado = NivelComunicado.informativo


class ComunicadoOut(BaseModel):
    id: int
    inspector_id: int
    titulo: str
    mensaje: str
    nivel: NivelComunicado
    activo: bool
    created_at: datetime
    nombre_inspector: Optional[str] = None
    model_config = {"from_attributes": True}


@router.get("", response_model=List[ComunicadoOut])
def listar_comunicados(
    solo_activos: bool = True,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Cualquier usuario autenticado puede ver los comunicados."""
    q = db.query(Comunicado)
    if solo_activos:
        q = q.filter(Comunicado.activo == True)
    comunicados = q.order_by(Comunicado.created_at.desc()).all()
    result = []
    for c in comunicados:
        out = ComunicadoOut.model_validate(c)
        out.nombre_inspector = c.inspector.nombre if c.inspector else None
        result.append(out)
    return result


@router.post("", response_model=ComunicadoOut, status_code=201)
def crear_comunicado(
    data: ComunicadoCreate,
    current_user: Usuario = Depends(require_rol(RolUsuario.inspector)),
    db: Session = Depends(get_db),
):
    comunicado = Comunicado(
        inspector_id=current_user.id,
        titulo=data.titulo,
        mensaje=data.mensaje,
        nivel=data.nivel,
    )
    db.add(comunicado)
    db.commit()
    db.refresh(comunicado)
    out = ComunicadoOut.model_validate(comunicado)
    out.nombre_inspector = current_user.nombre
    return out


@router.put("/{comunicado_id}/desactivar", response_model=ComunicadoOut)
def desactivar_comunicado(
    comunicado_id: int,
    current_user: Usuario = Depends(require_rol(RolUsuario.inspector)),
    db: Session = Depends(get_db),
):
    c = db.query(Comunicado).filter(Comunicado.id == comunicado_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Comunicado no encontrado")
    c.activo = False
    db.commit()
    db.refresh(c)
    out = ComunicadoOut.model_validate(c)
    out.nombre_inspector = c.inspector.nombre if c.inspector else None
    return out
