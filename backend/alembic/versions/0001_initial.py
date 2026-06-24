"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-23

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(150), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("rol", sa.Enum("cliente", "vendedor", "inspector", name="rolusuario"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_usuarios_email", "usuarios", ["email"])

    op.create_table(
        "vendedores",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("nombre_negocio", sa.String(200), nullable=False),
        sa.Column("descripcion", sa.Text()),
        sa.Column("ubicacion_lat", sa.Float()),
        sa.Column("ubicacion_lng", sa.Float()),
        sa.Column(
            "estado_verificacion",
            sa.Enum("pendiente", "verificado", "no_verificado", name="estadoverificacion"),
            server_default="pendiente",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "clientes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("direccion", sa.String(300)),
        sa.Column("telefono", sa.String(20)),
    )

    op.create_table(
        "licencias",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("vendedor_id", sa.Integer(), sa.ForeignKey("vendedores.id"), nullable=False),
        sa.Column("numero_licencia", sa.String(100), nullable=False),
        sa.Column("fecha_emision", sa.DateTime(timezone=True), nullable=False),
        sa.Column("fecha_vencimiento", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "estado",
            sa.Enum("pendiente", "aprobado", "rechazado", name="estadodocumento"),
            server_default="pendiente",
        ),
    )

    op.create_table(
        "certificados_sanitarios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("vendedor_id", sa.Integer(), sa.ForeignKey("vendedores.id"), nullable=False),
        sa.Column("entidad_emisora", sa.String(200), nullable=False),
        sa.Column("fecha_emision", sa.DateTime(timezone=True), nullable=False),
        sa.Column("fecha_vencimiento", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "estado",
            sa.Enum("pendiente", "aprobado", "rechazado", name="estadodocumento"),
            server_default="pendiente",
        ),
    )

    op.create_table(
        "productos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("vendedor_id", sa.Integer(), sa.ForeignKey("vendedores.id"), nullable=False),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("especie_declarada", sa.String(150), nullable=False),
        sa.Column("especie_verificada", sa.String(150)),
        sa.Column("precio", sa.Numeric(10, 2), nullable=False),
        sa.Column("descripcion", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "pedidos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cliente_id", sa.Integer(), sa.ForeignKey("clientes.id"), nullable=False),
        sa.Column("vendedor_id", sa.Integer(), sa.ForeignKey("vendedores.id"), nullable=False),
        sa.Column(
            "estado",
            sa.Enum("pendiente", "confirmado", "entregado", "cancelado", name="estadopedido"),
            server_default="pendiente",
        ),
        sa.Column("total", sa.Numeric(10, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "detalles_pedido",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("pedido_id", sa.Integer(), sa.ForeignKey("pedidos.id"), nullable=False),
        sa.Column("producto_id", sa.Integer(), sa.ForeignKey("productos.id"), nullable=False),
        sa.Column("cantidad", sa.Integer(), nullable=False),
        sa.Column("precio_unitario", sa.Numeric(10, 2), nullable=False),
    )

    op.create_table(
        "reportes_ciudadanos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cliente_id", sa.Integer(), sa.ForeignKey("clientes.id"), nullable=False),
        sa.Column("vendedor_id", sa.Integer(), sa.ForeignKey("vendedores.id"), nullable=False),
        sa.Column("motivo", sa.String(300), nullable=False),
        sa.Column("descripcion", sa.Text()),
        sa.Column(
            "estado",
            sa.Enum("pendiente", "revisado", "descartado", name="estadoreporte"),
            server_default="pendiente",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )


def downgrade() -> None:
    op.drop_table("reportes_ciudadanos")
    op.drop_table("detalles_pedido")
    op.drop_table("pedidos")
    op.drop_table("productos")
    op.drop_table("certificados_sanitarios")
    op.drop_table("licencias")
    op.drop_table("clientes")
    op.drop_table("vendedores")
    op.drop_table("usuarios")
    op.execute("DROP TYPE IF EXISTS rolusuario")
    op.execute("DROP TYPE IF EXISTS estadoverificacion")
    op.execute("DROP TYPE IF EXISTS estadodocumento")
    op.execute("DROP TYPE IF EXISTS estadopedido")
    op.execute("DROP TYPE IF EXISTS estadoreporte")
