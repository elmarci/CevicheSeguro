from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class ProductoCreate(BaseModel):
    nombre: str
    especie_declarada: str
    precio: Decimal
    descripcion: Optional[str] = None


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    especie_declarada: Optional[str] = None
    precio: Optional[Decimal] = None
    descripcion: Optional[str] = None


class EspecieVerificadaUpdate(BaseModel):
    especie_verificada: str


class ProductoOut(BaseModel):
    id: int
    vendedor_id: int
    nombre: str
    especie_declarada: str
    especie_verificada: Optional[str] = None
    precio: Decimal
    descripcion: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
