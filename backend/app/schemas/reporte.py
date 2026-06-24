from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.models import EstadoReporte


class ReporteCreate(BaseModel):
    vendedor_id: int
    motivo: str
    descripcion: Optional[str] = None
    foto_url: Optional[str] = None


class ReporteDecision(BaseModel):
    estado: EstadoReporte


class ReporteOut(BaseModel):
    id: int
    cliente_id: int
    vendedor_id: int
    motivo: str
    descripcion: Optional[str] = None
    foto_url: Optional[str] = None
    estado: EstadoReporte
    created_at: datetime

    model_config = {"from_attributes": True}
