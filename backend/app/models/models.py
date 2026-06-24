import enum
from datetime import datetime, timezone

from sqlalchemy import (
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
    entregado = "entregado"
    cancelado = "cancelado"


class EstadoReporte(str, enum.Enum):
    pendiente = "pendiente"
    revisado = "revisado"
    descartado = "descartado"


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
    ubicacion_lat = Column(Float)
    ubicacion_lng = Column(Float)
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
    fecha_emision = Column(DateTime(timezone=True), nullable=False)
    fecha_vencimiento = Column(DateTime(timezone=True), nullable=False)
    estado = Column(Enum(EstadoDocumento), default=EstadoDocumento.pendiente)

    vendedor = relationship("Vendedor", back_populates="licencias")


class CertificadoSanitario(Base):
    __tablename__ = "certificados_sanitarios"

    id = Column(Integer, primary_key=True, index=True)
    vendedor_id = Column(Integer, ForeignKey("vendedores.id"), nullable=False)
    entidad_emisora = Column(String(200), nullable=False)
    fecha_emision = Column(DateTime(timezone=True), nullable=False)
    fecha_vencimiento = Column(DateTime(timezone=True), nullable=False)
    estado = Column(Enum(EstadoDocumento), default=EstadoDocumento.pendiente)

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
    created_at = Column(DateTime(timezone=True), default=now_utc)

    vendedor = relationship("Vendedor", back_populates="productos")
    detalles = relationship("DetallePedido", back_populates="producto")


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    direccion = Column(String(300))
    telefono = Column(String(20))

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
    created_at = Column(DateTime(timezone=True), default=now_utc)

    cliente = relationship("Cliente", back_populates="pedidos")
    vendedor = relationship("Vendedor", back_populates="pedidos")
    detalles = relationship("DetallePedido", back_populates="pedido")


class DetallePedido(Base):
    __tablename__ = "detalles_pedido"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(10, 2), nullable=False)

    pedido = relationship("Pedido", back_populates="detalles")
    producto = relationship("Producto", back_populates="detalles")


class ReporteCiudadano(Base):
    __tablename__ = "reportes_ciudadanos"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    vendedor_id = Column(Integer, ForeignKey("vendedores.id"), nullable=False)
    motivo = Column(String(300), nullable=False)
    descripcion = Column(Text)
    estado = Column(Enum(EstadoReporte), default=EstadoReporte.pendiente)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    cliente = relationship("Cliente", back_populates="reportes")
    vendedor = relationship("Vendedor", back_populates="reportes")
