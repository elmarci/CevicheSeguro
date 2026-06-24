from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_rol
from app.models.models import CertificadoSanitario, EstadoDocumento, Licencia, RolUsuario, Usuario
from app.schemas.documentos import CertificadoOut, LicenciaOut

router = APIRouter(prefix="/alertas", tags=["alertas"])


@router.get("/licencias-por-vencer", response_model=List[LicenciaOut])
def licencias_por_vencer(
    dias: int = Query(default=7, ge=1, le=365),
    current_user: Usuario = Depends(require_rol(RolUsuario.inspector)),
    db: Session = Depends(get_db),
):
    """HU13: lista licencias aprobadas que vencen en los próximos N días."""
    ahora = datetime.now(timezone.utc)
    limite = ahora + timedelta(days=dias)
    return (
        db.query(Licencia)
        .filter(
            Licencia.estado == EstadoDocumento.aprobado,
            Licencia.fecha_vencimiento >= ahora,
            Licencia.fecha_vencimiento <= limite,
        )
        .all()
    )


@router.get("/certificados-por-vencer", response_model=List[CertificadoOut])
def certificados_por_vencer(
    dias: int = Query(default=7, ge=1, le=365),
    current_user: Usuario = Depends(require_rol(RolUsuario.inspector)),
    db: Session = Depends(get_db),
):
    """HU13: lista certificados aprobados que vencen en los próximos N días."""
    ahora = datetime.now(timezone.utc)
    limite = ahora + timedelta(days=dias)
    return (
        db.query(CertificadoSanitario)
        .filter(
            CertificadoSanitario.estado == EstadoDocumento.aprobado,
            CertificadoSanitario.fecha_vencimiento >= ahora,
            CertificadoSanitario.fecha_vencimiento <= limite,
        )
        .all()
    )
