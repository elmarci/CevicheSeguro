from datetime import datetime
from decimal import Decimal
from typing import List

from pydantic import BaseModel

from app.models.models import EstadoPedido


class DetallePedidoCreate(BaseModel):
    producto_id: int
    cantidad: int


class DetallePedidoOut(BaseModel):
    id: int
    producto_id: int
    cantidad: int
    precio_unitario: Decimal

    model_config = {"from_attributes": True}


class PedidoCreate(BaseModel):
    vendedor_id: int
    detalles: List[DetallePedidoCreate]


class PedidoOut(BaseModel):
    id: int
    cliente_id: int
    vendedor_id: int
    estado: EstadoPedido
    total: Decimal
    created_at: datetime
    detalles: List[DetallePedidoOut] = []

    model_config = {"from_attributes": True}
