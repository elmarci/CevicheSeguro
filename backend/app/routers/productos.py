from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_rol
from app.models.models import Producto, RolUsuario, Usuario, Vendedor
from app.schemas.producto import (
    EspecieVerificadaUpdate,
    ProductoCreate,
    ProductoOut,
    ProductoUpdate,
)

router = APIRouter(prefix="/productos", tags=["productos"])


def _get_vendedor(usuario: Usuario, db: Session) -> Vendedor:
    vendedor = db.query(Vendedor).filter(Vendedor.usuario_id == usuario.id).first()
    if not vendedor:
        raise HTTPException(status_code=404, detail="Perfil de vendedor no encontrado")
    return vendedor


@router.post("", response_model=ProductoOut, status_code=201)
def crear_producto(
    data: ProductoCreate,
    current_user: Usuario = Depends(require_rol(RolUsuario.vendedor)),
    db: Session = Depends(get_db),
):
    """HU07: vendedor publica un producto."""
    vendedor = _get_vendedor(current_user, db)
    producto = Producto(vendedor_id=vendedor.id, **data.model_dump())
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto


@router.get("", response_model=List[ProductoOut])
def listar_productos(
    vendedor_id: int = None,
    db: Session = Depends(get_db),
):
    q = db.query(Producto)
    if vendedor_id:
        q = q.filter(Producto.vendedor_id == vendedor_id)
    return q.all()


@router.get("/mis-productos", response_model=List[ProductoOut])
def mis_productos(
    current_user: Usuario = Depends(require_rol(RolUsuario.vendedor)),
    db: Session = Depends(get_db),
):
    vendedor = _get_vendedor(current_user, db)
    return vendedor.productos


@router.put("/{producto_id}", response_model=ProductoOut)
def actualizar_producto(
    producto_id: int,
    data: ProductoUpdate,
    current_user: Usuario = Depends(require_rol(RolUsuario.vendedor)),
    db: Session = Depends(get_db),
):
    vendedor = _get_vendedor(current_user, db)
    producto = db.query(Producto).filter(
        Producto.id == producto_id, Producto.vendedor_id == vendedor.id
    ).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(producto, field, value)
    db.commit()
    db.refresh(producto)
    return producto


@router.delete("/{producto_id}", status_code=204)
def eliminar_producto(
    producto_id: int,
    current_user: Usuario = Depends(require_rol(RolUsuario.vendedor)),
    db: Session = Depends(get_db),
):
    vendedor = _get_vendedor(current_user, db)
    producto = db.query(Producto).filter(
        Producto.id == producto_id, Producto.vendedor_id == vendedor.id
    ).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    db.delete(producto)
    db.commit()


@router.put("/{producto_id}/especie-verificada", response_model=ProductoOut)
def verificar_especie(
    producto_id: int,
    data: EspecieVerificadaUpdate,
    current_user: Usuario = Depends(require_rol(RolUsuario.inspector)),
    db: Session = Depends(get_db),
):
    """HU08: inspector registra la especie verificada de laboratorio."""
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    producto.especie_verificada = data.especie_verificada
    db.commit()
    db.refresh(producto)
    return producto
