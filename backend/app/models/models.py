import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


def now_utc():
    return datetime.now(timezone.utc)


# ── Enums ──────────────────────────────────────────────────────────────────────

class RolUsuario(str, enum.Enum):
    cliente = "cliente"
    vendedor = "vendedor"
    inspector = "inspector"


class EstadoVerificacion(str, enum.Enum):
    pendiente = "pendiente"
    verificado = "verificado"
    no_verificado = "no_verificado"


class EstadoDocumento(str, enum.Enum):
    pendiente = "pendiente"
    aprobado = "aprobado"
    rechazado = "rechazado"


class EstadoPedido(str, enum.Enum):
    pendiente = "pendiente"
    confirmado = "confirmado"
    en_preparacion = "en_preparacion"
    listo = "listo"
    en_camino = "en_camino"
    entregado = "entregado"
    cancelado = "cancelado"


class EstadoReporte(str, enum.Enum):
    pendiente = "pendiente"
    en_investigacion = "en_investigacion"
    inspeccion_programada = "inspeccion_programada"
    resuelto = "resuelto"
    descartado = "descartado"


class NivelComunicado(str, enum.Enum):
    informativo = "informativo"
    alerta = "alerta"
    critico = "critico"


class TipoEventoPedido(str, enum.Enum):
    creado = "creado"
    confirmado = "confirmado"
    en_preparacion = "en_preparacion"
    listo = "listo"
    en_camino = "en_camino"
    entregado = "entregado"
    cancelado = "cancelado"


# ── Modelos ────────────────────────────────────────────────────────────────────

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(Enum(RolUsuario), nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    vendedor = relationship("Vendedor", back_populates="usuario", uselist=False)
    cliente = relationship("Cliente", back_populates="usuario", uselist=False)


class Vendedor(Base):
    __tablename__ = "vendedores"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    nombre_negocio = Column(String(200), nullable=False)
    descripcion = Column(Text)
    direccion = Column(String(400))
    distrito = Column(String(100))
    ciudad = Column(String(100), default="Lima")
    telefono_contacto = Column(String(20))
    ubicacion_lat = Column(Float)
    ubicacion_lng = Column(Float)
    horario_apertura = Column(String(10))   # "09:00"
    horario_cierre = Column(String(10))     # "20:00"
    dias_atencion = Column(String(100))     # "Lun-Vie", "Lun-Dom", etc.
    precio_minimo = Column(Numeric(10, 2))
    precio_maximo = Column(Numeric(10, 2))
    especialidad = Column(String(300))
    activo = Column(Boolean, default=True)
    estado_verificacion = Column(Enum(EstadoVerificacion), default=EstadoVerificacion.pendiente)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    usuario = relationship("Usuario", back_populates="vendedor")
    licencias = relationship("Licencia", back_populates="vendedor")
    certificados = relationship("CertificadoSanitario", back_populates="vendedor")
    productos = relationship("Producto", back_populates="vendedor")
    pedidos = relationship("Pedido", back_populates="vendedor")
    reportes = relationship("ReporteCiudadano", back_populates="vendedor")


class Licencia(Base):
    __tablename__ = "licencias"

    id = Column(Integer, primary_key=True, index=True)
    vendedor_id = Column(Integer, ForeignKey("vendedores.id"), nullable=False)
    numero_licencia = Column(String(100), nullable=False)
    autoridad_emisora = Column(String(200))
    fecha_emision = Column(DateTime(timezone=True), nullable=False)
    fecha_vencimiento = Column(DateTime(timezone=True), nullable=False)
    estado = Column(Enum(EstadoDocumento), default=EstadoDocumento.pendiente)
    archivo_url = Column(String(500))   # ruta al archivo subido

    vendedor = relationship("Vendedor", back_populates="licencias")


class CertificadoSanitario(Base):
    __tablename__ = "certificados_sanitarios"

    id = Column(Integer, primary_key=True, index=True)
    vendedor_id = Column(Integer, ForeignKey("vendedores.id"), nullable=False)
    entidad_emisora = Column(String(200), nullable=False)
    numero_certificado = Column(String(100))
    fecha_emision = Column(DateTime(timezone=True), nullable=False)
    fecha_vencimiento = Column(DateTime(timezone=True), nullable=False)
    estado = Column(Enum(EstadoDocumento), default=EstadoDocumento.pendiente)
    archivo_url = Column(String(500))

    vendedor = relationship("Vendedor", back_populates="certificados")


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    vendedor_id = Column(Integer, ForeignKey("vendedores.id"), nullable=False)
    nombre = Column(String(200), nullable=False)
    especie_declarada = Column(String(150), nullable=False)
    especie_verificada = Column(String(150))
    precio = Column(Numeric(10, 2), nullable=False)
    descripcion = Column(Text)
    disponible = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    vendedor = relationship("Vendedor", back_populates="productos")
    detalles = relationship("DetallePedido", back_populates="producto")


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    direccion = Column(String(300))
    telefono = Column(String(20))
    distrito = Column(String(100))

    usuario = relationship("Usuario", back_populates="cliente")
    pedidos = relationship("Pedido", back_populates="cliente")
    reportes = relationship("ReporteCiudadano", back_populates="cliente")


class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    vendedor_id = Column(Integer, ForeignKey("vendedores.id"), nullable=False)
    estado = Column(Enum(EstadoPedido), default=EstadoPedido.pendiente)
    total = Column(Numeric(10, 2), nullable=False)
    direccion_entrega = Column(String(400))
    telefono_contacto = Column(String(20))
    notas = Column(Text)
    metodo_pago = Column(String(50), default="efectivo")
    created_at = Column(DateTime(timezone=True), default=now_utc)

    cliente = relationship("Cliente", back_populates="pedidos")
    vendedor = relationship("Vendedor", back_populates="pedidos")
    detalles = relationship("DetallePedido", back_populates="pedido")
    historial = relationship("EventoPedido", back_populates="pedido", order_by="EventoPedido.created_at")


class DetallePedido(Base):
    __tablename__ = "detalles_pedido"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(10, 2), nullable=False)

    pedido = relationship("Pedido", back_populates="detalles")
    producto = relationship("Producto", back_populates="detalles")


class EventoPedido(Base):
    """Trazabilidad: historial de estados de un pedido."""
    __tablename__ = "eventos_pedido"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    evento = Column(Enum(TipoEventoPedido), nullable=False)
    nota = Column(String(300))
    created_at = Column(DateTime(timezone=True), default=now_utc)

    pedido = relationship("Pedido", back_populates="historial")


class ReporteCiudadano(Base):
    __tablename__ = "reportes_ciudadanos"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    vendedor_id = Column(Integer, ForeignKey("vendedores.id"), nullable=False)
    motivo = Column(String(300), nullable=False)
    descripcion = Column(Text)
    foto_url = Column(String(500))
    estado = Column(Enum(EstadoReporte), default=EstadoReporte.pendiente)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    cliente = relationship("Cliente", back_populates="reportes")
    vendedor = relationship("Vendedor", back_populates="reportes")
    observaciones = relationship("ObservacionInspector", back_populates="reporte",
                                  order_by="ObservacionInspector.created_at")


class ObservacionInspector(Base):
    """Comentarios/observaciones del inspector sobre un reporte (expediente)."""
    __tablename__ = "observaciones_inspector"

    id = Column(Integer, primary_key=True, index=True)
    reporte_id = Column(Integer, ForeignKey("reportes_ciudadanos.id"), nullable=False)
    inspector_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    texto = Column(Text, nullable=False)
    accion_tomada = Column(String(200))
    created_at = Column(DateTime(timezone=True), default=now_utc)

    reporte = relationship("ReporteCiudadano", back_populates="observaciones")
    inspector = relationship("Usuario")


class ObservacionDocumento(Base):
    """Comentarios del inspector sobre licencias o certificados."""
    __tablename__ = "observaciones_documentos"

    id = Column(Integer, primary_key=True, index=True)
    inspector_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    tipo_doc = Column(String(20), nullable=False)   # "licencia" | "certificado"
    doc_id = Column(Integer, nullable=False)
    comentario = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    inspector = relationship("Usuario")


class Comunicado(Base):
    """Alertas/comunicados emitidos por inspectores a nivel de sistema."""
    __tablename__ = "comunicados"

    id = Column(Integer, primary_key=True, index=True)
    inspector_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    titulo = Column(String(300), nullable=False)
    mensaje = Column(Text, nullable=False)
    nivel = Column(Enum(NivelComunicado), default=NivelComunicado.informativo)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    inspector = relationship("Usuario")
