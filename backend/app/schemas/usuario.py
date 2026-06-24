from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr

from app.models.models import RolUsuario


class UsuarioCreate(BaseModel):
    nombre: str
    email: EmailStr
    password: str
    rol: RolUsuario


class UsuarioOut(BaseModel):
    id: int
    nombre: str
    email: str
    rol: RolUsuario
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut
