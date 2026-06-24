from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.models import EstadoDocumento


class LicenciaCreate(BaseModel):
    numero_licencia: str
    fecha_emision: datetime
    fecha_vencimiento: datetime


class LicenciaOut(BaseModel):
    id: int
    vendedor_id: int
    numero_licencia: str
    fecha_emision: datetime
    fecha_vencimiento: datetime
    estado: EstadoDocumento

    model_config = {"from_attributes": True}


class CertificadoCreate(BaseModel):
    entidad_emisora: str
    fecha_emision: datetime
    fecha_vencimiento: datetime


class CertificadoOut(BaseModel):
    id: int
    vendedor_id: int
    entidad_emisora: str
    fecha_emision: datetime
    fecha_vencimiento: datetime
    estado: EstadoDocumento

    model_config = {"from_attributes": True}


class DecisionDocumento(BaseModel):
    estado: EstadoDocumento  # aprobado o rechazado
