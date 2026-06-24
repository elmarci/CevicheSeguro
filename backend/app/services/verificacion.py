from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.models import EstadoDocumento, EstadoVerificacion, Vendedor


def evaluar_estado_verificacion(vendedor: Vendedor, db: Session) -> Vendedor:
    """HU06: marca no_verificado si algún documento aprobado está vencido."""
    ahora = datetime.now(timezone.utc)

    licencias_aprobadas = [l for l in vendedor.licencias if l.estado == EstadoDocumento.aprobado]
    certs_aprobados = [c for c in vendedor.certificados if c.estado == EstadoDocumento.aprobado]

    def vencido(doc) -> bool:
        venc = doc.fecha_vencimiento
        if venc.tzinfo is None:
            venc = venc.replace(tzinfo=timezone.utc)
        return venc < ahora

    tiene_licencia_vigente = any(not vencido(l) for l in licencias_aprobadas)
    tiene_cert_vigente = any(not vencido(c) for c in certs_aprobados)

    alguno_vencido = any(vencido(l) for l in licencias_aprobadas) or any(
        vencido(c) for c in certs_aprobados
    )

    if alguno_vencido:
        nuevo_estado = EstadoVerificacion.no_verificado
    elif tiene_licencia_vigente and tiene_cert_vigente:
        nuevo_estado = EstadoVerificacion.verificado
    else:
        nuevo_estado = vendedor.estado_verificacion

    if vendedor.estado_verificacion != nuevo_estado:
        vendedor.estado_verificacion = nuevo_estado
        db.commit()
        db.refresh(vendedor)

    return vendedor
