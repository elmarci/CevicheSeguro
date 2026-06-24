from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_rol
from app.models.models import (
    Cliente, DetallePedido, EstadoPedido, EventoPedido, Pedido,
    Producto, RolUsuario, TipoEventoPedido, Usuario, Vendedor,
)
from app.schemas.pedido import PedidoCreate, PedidoOut

router = APIRouter(prefix="/pedidos", tags=["pedidos"])


class PedidoCreateExtendido(BaseModel):
    vendedor_id: int
    detalles: List[dict]
    direccion_entrega: Optional[str] = None
    telefono_contacto: Optional[str] = None
    notas: Optional[str] = None
    metodo_pago: str = "efectivo"


class CambioEstadoRequest(BaseModel):
    estado: EstadoPedido
    nota: Optional[str] = None


def _get_cliente(usuario: Usuario, db: Session) -> Cliente:
    cliente = db.query(Cliente).filter(Cliente.usuario_id == usuario.id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Perfil de cliente no encontrado")
    return cliente


def _registrar_evento(db: Session, pedido_id: int, evento: TipoEventoPedido, nota: str = None):
    db.add(EventoPedido(pedido_id=pedido_id, evento=evento, nota=nota))


@router.post("", response_model=PedidoOut, status_code=201)
def crear_pedido(
    data: PedidoCreateExtendido,
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
    items = []
    for item in data.detalles:
        producto = db.query(Producto).filter(
            Producto.id == item["producto_id"],
            Producto.vendedor_id == data.vendedor_id,
        ).first()
        if not producto:
            raise HTTPException(status_code=404, detail=f"Producto {item['producto_id']} no encontrado en este vendedor")
        cantidad = int(item["cantidad"])
        if cantidad <= 0:
            raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0")
        total += producto.precio * cantidad
        items.append((producto, cantidad))

    pedido = Pedido(
        cliente_id=cliente.id,
        vendedor_id=vendedor.id,
        total=total,
        direccion_entrega=data.direccion_entrega,
        telefono_contacto=data.telefono_contacto,
        notas=data.notas,
        metodo_pago=data.metodo_pago,
    )
    db.add(pedido)
    db.flush()

    for producto, cantidad in items:
        db.add(DetallePedido(
            pedido_id=pedido.id,
            producto_id=producto.id,
            cantidad=cantidad,
            precio_unitario=producto.precio,
        ))

    _registrar_evento(db, pedido.id, TipoEventoPedido.creado, "Pedido recibido")
    db.commit()
    db.refresh(pedido)
    return pedido


@router.get("/mis-pedidos", response_model=List[PedidoOut])
def mis_pedidos(
    current_user: Usuario = Depends(require_rol(RolUsuario.cliente)),
    db: Session = Depends(get_db),
):
    cliente = _get_cliente(current_user, db)
    return sorted(cliente.pedidos, key=lambda p: p.created_at, reverse=True)


@router.get("/pedidos-recibidos", response_model=List[PedidoOut])
def pedidos_recibidos(
    current_user: Usuario = Depends(require_rol(RolUsuario.vendedor)),
    db: Session = Depends(get_db),
):
    vendedor = db.query(Vendedor).filter(Vendedor.usuario_id == current_user.id).first()
    if not vendedor:
        raise HTTPException(status_code=404, detail="Perfil de vendedor no encontrado")
    return sorted(vendedor.pedidos, key=lambda p: p.created_at, reverse=True)


@router.get("/{pedido_id}", response_model=PedidoOut)
def obtener_pedido(
    pedido_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    # Solo puede ver el cliente dueño o el vendedor
    if current_user.rol == RolUsuario.cliente:
        cliente = _get_cliente(current_user, db)
        if pedido.cliente_id != cliente.id:
            raise HTTPException(status_code=403, detail="No autorizado")
    elif current_user.rol == RolUsuario.vendedor:
        vendedor = db.query(Vendedor).filter(Vendedor.usuario_id == current_user.id).first()
        if not vendedor or pedido.vendedor_id != vendedor.id:
            raise HTTPException(status_code=403, detail="No autorizado")
    return pedido


@router.put("/{pedido_id}/estado", response_model=PedidoOut)
def cambiar_estado_pedido(
    pedido_id: int,
    data: CambioEstadoRequest,
    current_user: Usuario = Depends(require_rol(RolUsuario.vendedor)),
    db: Session = Depends(get_db),
):
    """Vendedor actualiza el estado de un pedido (trazabilidad)."""
    vendedor = db.query(Vendedor).filter(Vendedor.usuario_id == current_user.id).first()
    if not vendedor:
        raise HTTPException(status_code=404, detail="Perfil de vendedor no encontrado")

    pedido = db.query(Pedido).filter(
        Pedido.id == pedido_id, Pedido.vendedor_id == vendedor.id
    ).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    pedido.estado = data.estado
    evento_map = {
        EstadoPedido.confirmado: TipoEventoPedido.confirmado,
        EstadoPedido.en_preparacion: TipoEventoPedido.en_preparacion,
        EstadoPedido.listo: TipoEventoPedido.listo,
        EstadoPedido.en_camino: TipoEventoPedido.en_camino,
        EstadoPedido.entregado: TipoEventoPedido.entregado,
        EstadoPedido.cancelado: TipoEventoPedido.cancelado,
    }
    if data.estado in evento_map:
        _registrar_evento(db, pedido.id, evento_map[data.estado], data.nota)

    db.commit()
    db.refresh(pedido)
    return pedido
