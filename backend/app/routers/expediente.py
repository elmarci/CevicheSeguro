"""
Expediente del inspector: observaciones sobre reportes y documentos.
"""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_rol
from app.models.models import (
    CertificadoSanitario,
    EstadoDocumento,
    EstadoReporte,
    Licencia,
    ObservacionDocumento,
    ObservacionInspector,
    ReporteCiudadano,
    RolUsuario,
    Usuario,
    Vendedor,
)

router = APIRouter(prefix="/expediente", tags=["expediente"])


# ── Schemas inline ─────────────────────────────────────────────────────────────

class ObservacionReporteCreate(BaseModel):
    texto: str
    accion_tomada: Optional[str] = None
    nuevo_estado: Optional[EstadoReporte] = None


class ObservacionReporteOut(BaseModel):
    id: int
    reporte_id: int
    inspector_id: int
    texto: str
    accion_tomada: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


class ObsDocCreate(BaseModel):
    comentario: str
    nuevo_estado: Optional[EstadoDocumento] = None


class ObsDocOut(BaseModel):
    id: int
    inspector_id: int
    tipo_doc: str
    doc_id: int
    comentario: str
    created_at: datetime
    model_config = {"from_attributes": True}


class ReporteExpedienteOut(BaseModel):
    id: int
    vendedor_id: int
    cliente_id: int
    motivo: str
    descripcion: Optional[str] = None
    foto_url: Optional[str] = None
    estado: EstadoReporte
    created_at: datetime
    nombre_vendedor: Optional[str] = None
    observaciones: List[ObservacionReporteOut] = []
    model_config = {"from_attributes": True}


# ── Reportes / Expediente ──────────────────────────────────────────────────────

@router.get("/reportes", response_model=List[ReporteExpedienteOut])
def listar_reportes(
    estado: Optional[str] = None,
    vendedor_id: Optional[int] = None,
    current_user: Usuario = Depends(require_rol(RolUsuario.inspector)),
    db: Session = Depends(get_db),
):
    """Lista todos los reportes con filtros opcionales."""
    q = db.query(ReporteCiudadano)
    if estado:
        q = q.filter(ReporteCiudadano.estado == estado)
    if vendedor_id:
        q = q.filter(ReporteCiudadano.vendedor_id == vendedor_id)
    reportes = q.order_by(ReporteCiudadano.created_at.desc()).all()

    result = []
    for r in reportes:
        v = db.query(Vendedor).filter(Vendedor.id == r.vendedor_id).first()
        out = ReporteExpedienteOut(
            id=r.id, vendedor_id=r.vendedor_id, cliente_id=r.cliente_id,
            motivo=r.motivo, descripcion=r.descripcion, foto_url=r.foto_url,
            estado=r.estado, created_at=r.created_at,
            nombre_vendedor=v.nombre_negocio if v else None,
            observaciones=[ObservacionReporteOut.model_validate(o) for o in r.observaciones],
        )
        result.append(out)
    return result


@router.get("/reportes/{reporte_id}", response_model=ReporteExpedienteOut)
def obtener_reporte(
    reporte_id: int,
    current_user: Usuario = Depends(require_rol(RolUsuario.inspector)),
    db: Session = Depends(get_db),
):
    r = db.query(ReporteCiudadano).filter(ReporteCiudadano.id == reporte_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    v = db.query(Vendedor).filter(Vendedor.id == r.vendedor_id).first()
    return ReporteExpedienteOut(
        id=r.id, vendedor_id=r.vendedor_id, cliente_id=r.cliente_id,
        motivo=r.motivo, descripcion=r.descripcion, foto_url=r.foto_url,
        estado=r.estado, created_at=r.created_at,
        nombre_vendedor=v.nombre_negocio if v else None,
        observaciones=[ObservacionReporteOut.model_validate(o) for o in r.observaciones],
    )


@router.post("/reportes/{reporte_id}/observaciones", response_model=ObservacionReporteOut, status_code=201)
def agregar_observacion_reporte(
    reporte_id: int,
    data: ObservacionReporteCreate,
    current_user: Usuario = Depends(require_rol(RolUsuario.inspector)),
    db: Session = Depends(get_db),
):
    """Inspector agrega observación y opcionalmente cambia el estado del reporte."""
    r = db.query(ReporteCiudadano).filter(ReporteCiudadano.id == reporte_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    obs = ObservacionInspector(
        reporte_id=reporte_id,
        inspector_id=current_user.id,
        texto=data.texto,
        accion_tomada=data.accion_tomada,
    )
    db.add(obs)

    if data.nuevo_estado:
        r.estado = data.nuevo_estado

    db.commit()
    db.refresh(obs)
    return obs


@router.get("/vendedor/{vendedor_id}/resumen")
def resumen_vendedor_para_inspeccion(
    vendedor_id: int,
    current_user: Usuario = Depends(require_rol(RolUsuario.inspector)),
    db: Session = Depends(get_db),
):
    """Consulta rápida de data de un local para preparar una inspección."""
    v = db.query(Vendedor).filter(Vendedor.id == vendedor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")

    reportes = db.query(ReporteCiudadano).filter(ReporteCiudadano.vendedor_id == vendedor_id).all()
    licencias = v.licencias
    certs = v.certificados
    ahora = datetime.now(timezone.utc)

    return {
        "vendedor": {
            "id": v.id,
            "nombre_negocio": v.nombre_negocio,
            "direccion": v.direccion,
            "distrito": v.distrito,
            "telefono_contacto": v.telefono_contacto,
            "estado_verificacion": v.estado_verificacion,
            "activo": v.activo,
        },
        "documentos": {
            "licencias_total": len(licencias),
            "licencias_aprobadas": sum(1 for l in licencias if l.estado == "aprobado"),
            "licencias_vencidas": sum(1 for l in licencias if l.estado == "aprobado" and
                                      (l.fecha_vencimiento.replace(tzinfo=timezone.utc) if l.fecha_vencimiento.tzinfo is None else l.fecha_vencimiento) < ahora),
            "certificados_total": len(certs),
            "certificados_aprobados": sum(1 for c in certs if c.estado == "aprobado"),
        },
        "reportes": {
            "total": len(reportes),
            "pendientes": sum(1 for r in reportes if r.estado == "pendiente"),
            "en_investigacion": sum(1 for r in reportes if r.estado == "en_investigacion"),
            "resueltos": sum(1 for r in reportes if r.estado == "resuelto"),
        },
        "productos_total": len(v.productos),
        "pedidos_total": len(v.pedidos),
    }


# ── Observaciones sobre documentos ────────────────────────────────────────────

@router.post("/documentos/{tipo}/{doc_id}/observaciones", response_model=ObsDocOut, status_code=201)
def observar_documento(
    tipo: str,
    doc_id: int,
    data: ObsDocCreate,
    current_user: Usuario = Depends(require_rol(RolUsuario.inspector)),
    db: Session = Depends(get_db),
):
    """Inspector comenta un documento y opcionalmente lo aprueba/rechaza."""
    if tipo not in ("licencia", "certificado"):
        raise HTTPException(status_code=400, detail="tipo debe ser 'licencia' o 'certificado'")

    if tipo == "licencia":
        doc = db.query(Licencia).filter(Licencia.id == doc_id).first()
    else:
        doc = db.query(CertificadoSanitario).filter(CertificadoSanitario.id == doc_id).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    obs = ObservacionDocumento(
        inspector_id=current_user.id,
        tipo_doc=tipo,
        doc_id=doc_id,
        comentario=data.comentario,
    )
    db.add(obs)

    if data.nuevo_estado:
        doc.estado = data.nuevo_estado

    db.commit()
    db.refresh(obs)
    return obs


@router.get("/documentos/{tipo}/{doc_id}/observaciones", response_model=List[ObsDocOut])
def listar_observaciones_documento(
    tipo: str,
    doc_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(ObservacionDocumento).filter(
        ObservacionDocumento.tipo_doc == tipo,
        ObservacionDocumento.doc_id == doc_id,
    ).order_by(ObservacionDocumento.created_at).all()
