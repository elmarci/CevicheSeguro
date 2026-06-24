from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.deps import require_rol
from app.models.models import Cliente, RolUsuario, Usuario

router = APIRouter(prefix="/clientes", tags=["clientes"])


class ClienteUpdate(BaseModel):
    direccion: Optional[str] = None
    telefono: Optional[str] = None


class ClienteOut(BaseModel):
    id: int
    usuario_id: int
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    model_config = {"from_attributes": True}


@router.get("/mi-perfil", response_model=ClienteOut)
def mi_perfil_cliente(
    current_user: Usuario = Depends(require_rol(RolUsuario.cliente)),
    db: Session = Depends(get_db),
):
    cliente = db.query(Cliente).filter(Cliente.usuario_id == current_user.id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return cliente


@router.put("/mi-perfil", response_model=ClienteOut)
def actualizar_perfil_cliente(
    data: ClienteUpdate,
    current_user: Usuario = Depends(require_rol(RolUsuario.cliente)),
    db: Session = Depends(get_db),
):
    cliente = db.query(Cliente).filter(Cliente.usuario_id == current_user.id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(cliente, field, value)
    db.commit()
    db.refresh(cliente)
    return cliente
