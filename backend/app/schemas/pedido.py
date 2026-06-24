from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel

from app.models.models import EstadoPedido, TipoEventoPedido


class DetallePedidoCreate(BaseModel):
    producto_id: int
    cantidad: int


class DetallePedidoOut(BaseModel):
    id: int
    producto_id: int
    cantidad: int
    precio_unitario: Decimal

    model_config = {"from_attributes": True}


class EventoPedidoOut(BaseModel):
    id: int
    evento: TipoEventoPedido
    nota: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PedidoCreate(BaseModel):
    vendedor_id: int
    detalles: List[DetallePedidoCreate]
    direccion_entrega: Optional[str] = None
    telefono_contacto: Optional[str] = None
    notas: Optional[str] = None
    metodo_pago: str = "efectivo"


class PedidoOut(BaseModel):
    id: int
    cliente_id: int
    vendedor_id: int
    estado: EstadoPedido
    total: Decimal
    direccion_entrega: Optional[str] = None
    telefono_contacto: Optional[str] = None
    notas: Optional[str] = None
    metodo_pago: Optional[str] = None
    created_at: datetime
    detalles: List[DetallePedidoOut] = []
    historial: List[EventoPedidoOut] = []

    model_config = {"from_attributes": True}
