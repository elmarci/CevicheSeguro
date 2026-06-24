from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_rol
from app.models.models import (
    CertificadoSanitario,
    EstadoDocumento,
    Licencia,
    RolUsuario,
    Usuario,
    Vendedor,
)
from app.schemas.documentos import (
    CertificadoCreate,
    CertificadoOut,
    DecisionDocumento,
    LicenciaCreate,
    LicenciaOut,
)
from app.services.verificacion import evaluar_estado_verificacion

router = APIRouter(tags=["documentos"])


def _get_vendedor_del_usuario(usuario: Usuario, db: Session) -> Vendedor:
    vendedor = db.query(Vendedor).filter(Vendedor.usuario_id == usuario.id).first()
    if not vendedor:
        raise HTTPException(status_code=404, detail="Perfil de vendedor no encontrado")
    return vendedor


# ── Licencias ──────────────────────────────────────────────────────────────────

@router.post("/vendedores/mis-licencias", response_model=LicenciaOut, status_code=201)
def crear_licencia(
    data: LicenciaCreate,
    current_user: Usuario = Depends(require_rol(RolUsuario.vendedor)),
    db: Session = Depends(get_db),
):
    """HU03: vendedor sube su licencia."""
    vendedor = _get_vendedor_del_usuario(current_user, db)
    licencia = Licencia(vendedor_id=vendedor.id, **data.model_dump())
    db.add(licencia)
    db.commit()
    db.refresh(licencia)
    return licencia


@router.get("/vendedores/mis-licencias", response_model=List[LicenciaOut])
def mis_licencias(
    current_user: Usuario = Depends(require_rol(RolUsuario.vendedor)),
    db: Session = Depends(get_db),
):
    vendedor = _get_vendedor_del_usuario(current_user, db)
    return vendedor.licencias


@router.get("/inspector/licencias/pendientes", response_model=List[LicenciaOut])
def licencias_pendientes(
    current_user: Usuario = Depends(require_rol(RolUsuario.inspector)),
    db: Session = Depends(get_db),
):
    """HU05: inspector lista licencias pendientes."""
    return db.query(Licencia).filter(Licencia.estado == EstadoDocumento.pendiente).all()


@router.put("/inspector/licencias/{licencia_id}", response_model=LicenciaOut)
def decidir_licencia(
    licencia_id: int,
    decision: DecisionDocumento,
    current_user: Usuario = Depends(require_rol(RolUsuario.inspector)),
    db: Session = Depends(get_db),
):
    """HU05: inspector aprueba o rechaza una licencia."""
    if decision.estado == EstadoDocumento.pendiente:
        raise HTTPException(status_code=400, detail="La decisión debe ser aprobado o rechazado")
    licencia = db.query(Licencia).filter(Licencia.id == licencia_id).first()
    if not licencia:
        raise HTTPException(status_code=404, detail="Licencia no encontrada")
    licencia.estado = decision.estado
    db.commit()
    db.refresh(licencia)
    evaluar_estado_verificacion(licencia.vendedor, db)
    return licencia


# ── Certificados sanitarios ────────────────────────────────────────────────────

@router.post("/vendedores/mis-certificados", response_model=CertificadoOut, status_code=201)
def crear_certificado(
    data: CertificadoCreate,
    current_user: Usuario = Depends(require_rol(RolUsuario.vendedor)),
    db: Session = Depends(get_db),
):
    """HU04: vendedor sube su certificado sanitario."""
    vendedor = _get_vendedor_del_usuario(current_user, db)
    cert = CertificadoSanitario(vendedor_id=vendedor.id, **data.model_dump())
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert


@router.get("/vendedores/mis-certificados", response_model=List[CertificadoOut])
def mis_certificados(
    current_user: Usuario = Depends(require_rol(RolUsuario.vendedor)),
    db: Session = Depends(get_db),
):
    vendedor = _get_vendedor_del_usuario(current_user, db)
    return vendedor.certificados


@router.get("/inspector/certificados/pendientes", response_model=List[CertificadoOut])
def certificados_pendientes(
    current_user: Usuario = Depends(require_rol(RolUsuario.inspector)),
    db: Session = Depends(get_db),
):
    """HU05: inspector lista certificados pendientes."""
    return (
        db.query(CertificadoSanitario)
        .filter(CertificadoSanitario.estado == EstadoDocumento.pendiente)
        .all()
    )


@router.put("/inspector/certificados/{cert_id}", response_model=CertificadoOut)
def decidir_certificado(
    cert_id: int,
    decision: DecisionDocumento,
    current_user: Usuario = Depends(require_rol(RolUsuario.inspector)),
    db: Session = Depends(get_db),
):
    """HU05: inspector aprueba o rechaza un certificado."""
    if decision.estado == EstadoDocumento.pendiente:
        raise HTTPException(status_code=400, detail="La decisión debe ser aprobado o rechazado")
    cert = db.query(CertificadoSanitario).filter(CertificadoSanitario.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")
    cert.estado = decision.estado
    db.commit()
    db.refresh(cert)
    evaluar_estado_verificacion(cert.vendedor, db)
    return cert
