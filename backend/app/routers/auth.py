from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.models.models import Cliente, RolUsuario, Usuario, Vendedor
from app.schemas.usuario import LoginRequest, TokenResponse, UsuarioCreate, UsuarioOut

router = APIRouter(prefix="/auth", tags=["auth"])


class UsuarioUpdate(BaseModel):
    nombre: str | None = None
    email: EmailStr | None = None
    password_actual: str | None = None
    password_nuevo: str | None = None


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: UsuarioCreate, db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.email == data.email).first():
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    usuario = Usuario(
        nombre=data.nombre,
        email=data.email,
        password_hash=hash_password(data.password),
        rol=data.rol,
    )
    db.add(usuario)
    db.flush()

    if data.rol == RolUsuario.cliente:
        db.add(Cliente(usuario_id=usuario.id))
    elif data.rol == RolUsuario.vendedor:
        db.add(Vendedor(usuario_id=usuario.id, nombre_negocio=data.nombre))

    db.commit()
    db.refresh(usuario)

    token = create_access_token({"sub": str(usuario.id), "rol": usuario.rol.value})
    return TokenResponse(access_token=token, usuario=UsuarioOut.model_validate(usuario))


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == data.email).first()
    if not usuario or not verify_password(data.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    token = create_access_token({"sub": str(usuario.id), "rol": usuario.rol.value})
    return TokenResponse(access_token=token, usuario=UsuarioOut.model_validate(usuario))


@router.get("/me", response_model=UsuarioOut)
def me(current_user: Usuario = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UsuarioOut)
def update_me(
    data: UsuarioUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.nombre:
        current_user.nombre = data.nombre

    if data.email and data.email != current_user.email:
        if db.query(Usuario).filter(Usuario.email == data.email, Usuario.id != current_user.id).first():
            raise HTTPException(status_code=400, detail="Ese email ya está en uso")
        current_user.email = data.email

    if data.password_nuevo:
        if not data.password_actual:
            raise HTTPException(status_code=400, detail="Debes ingresar tu contraseña actual")
        if not verify_password(data.password_actual, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
        current_user.password_hash = hash_password(data.password_nuevo)

    db.commit()
    db.refresh(current_user)
    return current_user
