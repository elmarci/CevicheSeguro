from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.models.models import EstadoVerificacion


class VendedorUpdate(BaseModel):
    nombre_negocio: Optional[str] = None
    descripcion: Optional[str] = None
    direccion: Optional[str] = None
    distrito: Optional[str] = None
    ciudad: Optional[str] = None
    telefono_contacto: Optional[str] = None
    ubicacion_lat: Optional[float] = None
    ubicacion_lng: Optional[float] = None
    horario_apertura: Optional[str] = None
    horario_cierre: Optional[str] = None
    dias_atencion: Optional[str] = None
    precio_minimo: Optional[Decimal] = None
    precio_maximo: Optional[Decimal] = None
    especialidad: Optional[str] = None
    activo: Optional[bool] = None


class VendedorOut(BaseModel):
    id: int
    usuario_id: int
    nombre_negocio: str
    descripcion: Optional[str] = None
    direccion: Optional[str] = None
    distrito: Optional[str] = None
    ciudad: Optional[str] = None
    telefono_contacto: Optional[str] = None
    ubicacion_lat: Optional[float] = None
    ubicacion_lng: Optional[float] = None
    horario_apertura: Optional[str] = None
    horario_cierre: Optional[str] = None
    dias_atencion: Optional[str] = None
    precio_minimo: Optional[Decimal] = None
    precio_maximo: Optional[Decimal] = None
    especialidad: Optional[str] = None
    activo: Optional[bool] = None
    estado_verificacion: EstadoVerificacion
    created_at: datetime

    model_config = {"from_attributes": True}
