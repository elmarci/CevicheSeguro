from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_rol
from app.models.models import RolUsuario, Usuario, Vendedor
from app.schemas.vendedor import VendedorOut, VendedorUpdate
from app.services.verificacion import evaluar_estado_verificacion

router = APIRouter(prefix="/vendedores", tags=["vendedores"])


@router.get("", response_model=List[VendedorOut])
def listar_vendedores(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    db: Session = Depends(get_db),
):
    """HU09: lista todos los vendedores con su estado de verificación actualizado."""
    vendedores = db.query(Vendedor).all()
    resultado = [evaluar_estado_verificacion(v, db) for v in vendedores]

    if lat is not None and lng is not None:
        def distancia(v: Vendedor) -> float:
            if v.ubicacion_lat is None or v.ubicacion_lng is None:
                return float("inf")
            return ((v.ubicacion_lat - lat) ** 2 + (v.ubicacion_lng - lng) ** 2) ** 0.5

        resultado.sort(key=distancia)

    return resultado


@router.get("/mi-perfil", response_model=VendedorOut)
def mi_perfil(
    current_user: Usuario = Depends(require_rol(RolUsuario.vendedor)),
    db: Session = Depends(get_db),
):
    vendedor = db.query(Vendedor).filter(Vendedor.usuario_id == current_user.id).first()
    if not vendedor:
        raise HTTPException(status_code=404, detail="Perfil de vendedor no encontrado")
    return evaluar_estado_verificacion(vendedor, db)


@router.put("/mi-perfil", response_model=VendedorOut)
def actualizar_perfil(
    data: VendedorUpdate,
    current_user: Usuario = Depends(require_rol(RolUsuario.vendedor)),
    db: Session = Depends(get_db),
):
    vendedor = db.query(Vendedor).filter(Vendedor.usuario_id == current_user.id).first()
    if not vendedor:
        raise HTTPException(status_code=404, detail="Perfil de vendedor no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(vendedor, field, value)
    db.commit()
    db.refresh(vendedor)
    return evaluar_estado_verificacion(vendedor, db)


@router.get("/{vendedor_id}", response_model=VendedorOut)
def obtener_vendedor(vendedor_id: int, db: Session = Depends(get_db)):
    vendedor = db.query(Vendedor).filter(Vendedor.id == vendedor_id).first()
    if not vendedor:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")
    return evaluar_estado_verificacion(vendedor, db)
