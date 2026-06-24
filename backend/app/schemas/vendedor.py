from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.models import EstadoVerificacion


class VendedorUpdate(BaseModel):
    nombre_negocio: Optional[str] = None
    descripcion: Optional[str] = None
    ubicacion_lat: Optional[float] = None
    ubicacion_lng: Optional[float] = None


class VendedorOut(BaseModel):
    id: int
    usuario_id: int
    nombre_negocio: str
    descripcion: Optional[str] = None
    ubicacion_lat: Optional[float] = None
    ubicacion_lng: Optional[float] = None
    estado_verificacion: EstadoVerificacion
    created_at: datetime

    model_config = {"from_attributes": True}
