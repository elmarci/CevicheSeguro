from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_rol
from app.models.models import Cliente, DetallePedido, Pedido, Producto, RolUsuario, Usuario, Vendedor
from app.schemas.pedido import PedidoCreate, PedidoOut

router = APIRouter(prefix="/pedidos", tags=["pedidos"])


def _get_cliente(usuario: Usuario, db: Session) -> Cliente:
    cliente = db.query(Cliente).filter(Cliente.usuario_id == usuario.id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Perfil de cliente no encontrado")
    return cliente


@router.post("", response_model=PedidoOut, status_code=201)
def crear_pedido(
    data: PedidoCreate,
    current_user: Usuario = Depends(require_rol(RolUsuario.cliente)),
    db: Session = Depends(get_db),
):
    """HU10: cliente crea un pedido con uno o más productos."""
    cliente = _get_cliente(current_user, db)

    vendedor = db.query(Vendedor).filter(Vendedor.id == data.vendedor_id).first()
    if not vendedor:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")

    if not data.detalles:
        raise HTTPException(status_code=400, detail="El pedido debe tener al menos un producto")

    total = Decimal("0")
    detalles_a_crear = []

    for item in data.detalles:
        producto = db.query(Producto).filter(
            Producto.id == item.producto_id, Producto.vendedor_id == data.vendedor_id
        ).first()
        if not producto:
            raise HTTPException(
                status_code=404,
                detail=f"Producto {item.producto_id} no encontrado en este vendedor",
            )
        if item.cantidad <= 0:
            raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0")
        subtotal = producto.precio * item.cantidad
        total += subtotal
        detalles_a_crear.append((producto, item.cantidad))

    pedido = Pedido(cliente_id=cliente.id, vendedor_id=vendedor.id, total=total)
    db.add(pedido)
    db.flush()

    for producto, cantidad in detalles_a_crear:
        db.add(DetallePedido(
            pedido_id=pedido.id,
            producto_id=producto.id,
            cantidad=cantidad,
            precio_unitario=producto.precio,
        ))

    db.commit()
    db.refresh(pedido)
    return pedido


@router.get("/mis-pedidos", response_model=List[PedidoOut])
def mis_pedidos(
    current_user: Usuario = Depends(require_rol(RolUsuario.cliente)),
    db: Session = Depends(get_db),
):
    cliente = _get_cliente(current_user, db)
    return cliente.pedidos


@router.get("/pedidos-recibidos", response_model=List[PedidoOut])
def pedidos_recibidos(
    current_user: Usuario = Depends(require_rol(RolUsuario.vendedor)),
    db: Session = Depends(get_db),
):
    vendedor = db.query(Vendedor).filter(Vendedor.usuario_id == current_user.id).first()
    if not vendedor:
        raise HTTPException(status_code=404, detail="Perfil de vendedor no encontrado")
    return vendedor.pedidos
