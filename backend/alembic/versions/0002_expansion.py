"""expansion: vendedor detallado, trazabilidad pedidos, fotos reportes, expediente inspector, comunicados

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-24

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Ampliar Vendedor ────────────────────────────────────────────────────────
    op.add_column("vendedores", sa.Column("direccion", sa.String(400)))
    op.add_column("vendedores", sa.Column("distrito", sa.String(100)))
    op.add_column("vendedores", sa.Column("ciudad", sa.String(100), server_default="Lima"))
    op.add_column("vendedores", sa.Column("telefono_contacto", sa.String(20)))
    op.add_column("vendedores", sa.Column("horario_apertura", sa.String(10)))
    op.add_column("vendedores", sa.Column("horario_cierre", sa.String(10)))
    op.add_column("vendedores", sa.Column("dias_atencion", sa.String(100)))
    op.add_column("vendedores", sa.Column("precio_minimo", sa.Numeric(10, 2)))
    op.add_column("vendedores", sa.Column("precio_maximo", sa.Numeric(10, 2)))
    op.add_column("vendedores", sa.Column("especialidad", sa.String(300)))
    op.add_column("vendedores", sa.Column("activo", sa.Boolean(), server_default="true"))

    # ── Ampliar Licencia ────────────────────────────────────────────────────────
    op.add_column("licencias", sa.Column("autoridad_emisora", sa.String(200)))
    op.add_column("licencias", sa.Column("archivo_url", sa.String(500)))

    # ── Ampliar CertificadoSanitario ────────────────────────────────────────────
    op.add_column("certificados_sanitarios", sa.Column("numero_certificado", sa.String(100)))
    op.add_column("certificados_sanitarios", sa.Column("archivo_url", sa.String(500)))

    # ── Ampliar Producto ────────────────────────────────────────────────────────
    op.add_column("productos", sa.Column("disponible", sa.Boolean(), server_default="true"))

    # ── Ampliar Cliente ─────────────────────────────────────────────────────────
    op.add_column("clientes", sa.Column("distrito", sa.String(100)))

    # ── Ampliar Pedido ──────────────────────────────────────────────────────────
    op.add_column("pedidos", sa.Column("direccion_entrega", sa.String(400)))
    op.add_column("pedidos", sa.Column("telefono_contacto", sa.String(20)))
    op.add_column("pedidos", sa.Column("notas", sa.Text()))
    op.add_column("pedidos", sa.Column("metodo_pago", sa.String(50), server_default="efectivo"))

    # Ampliar el enum EstadoPedido con los nuevos estados
    op.execute("ALTER TYPE estadopedido ADD VALUE IF NOT EXISTS 'en_preparacion'")
    op.execute("ALTER TYPE estadopedido ADD VALUE IF NOT EXISTS 'listo'")
    op.execute("ALTER TYPE estadopedido ADD VALUE IF NOT EXISTS 'en_camino'")

    # ── Ampliar ReporteCiudadano ─────────────────────────────────────────────────
    op.add_column("reportes_ciudadanos", sa.Column("foto_url", sa.String(500)))

    # Ampliar el enum EstadoReporte
    op.execute("ALTER TYPE estadoreporte ADD VALUE IF NOT EXISTS 'en_investigacion'")
    op.execute("ALTER TYPE estadoreporte ADD VALUE IF NOT EXISTS 'inspeccion_programada'")
    op.execute("ALTER TYPE estadoreporte ADD VALUE IF NOT EXISTS 'resuelto'")

    # ── Tabla eventos_pedido (trazabilidad) ─────────────────────────────────────
    op.create_table(
        "eventos_pedido",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("pedido_id", sa.Integer(), sa.ForeignKey("pedidos.id"), nullable=False),
        sa.Column("evento", sa.Enum(
            "creado", "confirmado", "en_preparacion", "listo",
            "en_camino", "entregado", "cancelado",
            name="tipoeventopedido"
        ), nullable=False),
        sa.Column("nota", sa.String(300)),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )

    # ── Tabla observaciones_inspector (expediente) ──────────────────────────────
    op.create_table(
        "observaciones_inspector",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("reporte_id", sa.Integer(), sa.ForeignKey("reportes_ciudadanos.id"), nullable=False),
        sa.Column("inspector_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("texto", sa.Text(), nullable=False),
        sa.Column("accion_tomada", sa.String(200)),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )

    # ── Tabla observaciones_documentos ──────────────────────────────────────────
    op.create_table(
        "observaciones_documentos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("inspector_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("tipo_doc", sa.String(20), nullable=False),
        sa.Column("doc_id", sa.Integer(), nullable=False),
        sa.Column("comentario", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )

    # ── Tabla comunicados ───────────────────────────────────────────────────────
    op.create_table(
        "comunicados",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("inspector_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("titulo", sa.String(300), nullable=False),
        sa.Column("mensaje", sa.Text(), nullable=False),
        sa.Column("nivel", sa.Enum("informativo", "alerta", "critico", name="nivelcomunicado"),
                  server_default="informativo"),
        sa.Column("activo", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )


def downgrade() -> None:
    op.drop_table("comunicados")
    op.drop_table("observaciones_documentos")
    op.drop_table("observaciones_inspector")
    op.drop_table("eventos_pedido")
    op.drop_column("reportes_ciudadanos", "foto_url")
    op.drop_column("pedidos", "metodo_pago")
    op.drop_column("pedidos", "notas")
    op.drop_column("pedidos", "telefono_contacto")
    op.drop_column("pedidos", "direccion_entrega")
    op.drop_column("clientes", "distrito")
    op.drop_column("productos", "disponible")
    op.drop_column("certificados_sanitarios", "numero_certificado")
    op.drop_column("certificados_sanitarios", "archivo_url")
    op.drop_column("licencias", "archivo_url")
    op.drop_column("licencias", "autoridad_emisora")
    op.drop_column("vendedores", "activo")
    op.drop_column("vendedores", "especialidad")
    op.drop_column("vendedores", "precio_maximo")
    op.drop_column("vendedores", "precio_minimo")
    op.drop_column("vendedores", "dias_atencion")
    op.drop_column("vendedores", "horario_cierre")
    op.drop_column("vendedores", "horario_apertura")
    op.drop_column("vendedores", "telefono_contacto")
    op.drop_column("vendedores", "ciudad")
    op.drop_column("vendedores", "distrito")
    op.drop_column("vendedores", "direccion")
