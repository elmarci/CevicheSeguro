from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_rol
from app.models.models import Cliente, EstadoReporte, ReporteCiudadano, RolUsuario, Usuario, Vendedor
from app.schemas.reporte import ReporteCreate, ReporteDecision, ReporteOut

router = APIRouter(prefix="/reportes", tags=["reportes"])


@router.post("", response_model=ReporteOut, status_code=201)
def crear_reporte(
    data: ReporteCreate,
    current_user: Usuario = Depends(require_rol(RolUsuario.cliente)),
    db: Session = Depends(get_db),
):
    """HU11: cliente reporta un vendedor."""
    cliente = db.query(Cliente).filter(Cliente.usuario_id == current_user.id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Perfil de cliente no encontrado")

    vendedor = db.query(Vendedor).filter(Vendedor.id == data.vendedor_id).first()
    if not vendedor:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")

    reporte = ReporteCiudadano(
        cliente_id=cliente.id,
        vendedor_id=data.vendedor_id,
        motivo=data.motivo,
        descripcion=data.descripcion,
    )
    db.add(reporte)
    db.commit()
    db.refresh(reporte)
    return reporte


@router.get("/pendientes", response_model=List[ReporteOut])
def reportes_pendientes(
    current_user: Usuario = Depends(require_rol(RolUsuario.inspector)),
    db: Session = Depends(get_db),
):
    """HU12: inspector lista reportes pendientes."""
    return (
        db.query(ReporteCiudadano)
        .filter(ReporteCiudadano.estado == EstadoReporte.pendiente)
        .all()
    )


@router.put("/{reporte_id}", response_model=ReporteOut)
def resolver_reporte(
    reporte_id: int,
    decision: ReporteDecision,
    current_user: Usuario = Depends(require_rol(RolUsuario.inspector)),
    db: Session = Depends(get_db),
):
    """HU12: inspector resuelve un reporte."""
    if decision.estado == EstadoReporte.pendiente:
        raise HTTPException(status_code=400, detail="La decisión debe ser revisado o descartado")
    reporte = db.query(ReporteCiudadano).filter(ReporteCiudadano.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    reporte.estado = decision.estado
    db.commit()
    db.refresh(reporte)
    return reporte


@router.get("/mis-reportes", response_model=List[ReporteOut])
def mis_reportes(
    current_user: Usuario = Depends(require_rol(RolUsuario.cliente)),
    db: Session = Depends(get_db),
):
    cliente = db.query(Cliente).filter(Cliente.usuario_id == current_user.id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Perfil de cliente no encontrado")
    return cliente.reportes
