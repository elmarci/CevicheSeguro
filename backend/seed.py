"""
Script de seed data para CevicheSeguro.
Uso: docker-compose exec backend python seed.py
"""
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, "/app")

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.models import (
    CertificadoSanitario, Cliente, EstadoDocumento, EstadoVerificacion,
    Licencia, Producto, RolUsuario, Usuario, Vendedor,
)

db = SessionLocal()

def crear_usuario(nombre, email, rol):
    u = db.query(Usuario).filter(Usuario.email == email).first()
    if u:
        return u
    u = Usuario(nombre=nombre, email=email, password_hash=hash_password("123456"), rol=rol)
    db.add(u)
    db.flush()
    return u

def main():
    print("🌱 Iniciando seed data...")

    # ── Inspector ──
    inspector = crear_usuario("Carlos Quispe (Inspector)", "inspector@ceviche.com", RolUsuario.inspector)

    # ── Clientes ──
    for nombre, email in [
        ("María Torres", "maria@cliente.com"),
        ("Luis Paredes", "luis@cliente.com"),
        ("Ana Flores", "ana@cliente.com"),
    ]:
        u = crear_usuario(nombre, email, RolUsuario.cliente)
        if not db.query(Cliente).filter(Cliente.usuario_id == u.id).first():
            db.add(Cliente(usuario_id=u.id, direccion="Lima, Perú", telefono="999-000-001"))
    db.flush()

    # ── Vendedores ──
    vendedores_data = [
        ("Cevichería El Pulpo Dorado", "elPulpo@vendedor.com", "El mejor ceviche de pota de Miraflores", -12.1211, -77.0291, True),
        ("La Pota Feliz", "lapota@vendedor.com", "Ceviche fresco de pota con leche de tigre artesanal", -12.0464, -77.0428, True),
        ("Sabores del Mar", "sabores@vendedor.com", "Especialistas en ceviche mixto y tiradito", -12.1311, -77.0181, True),
        ("Ceviche Express Callao", "callao@vendedor.com", "Ceviche rápido y seguro del puerto del Callao", -12.0565, -77.1181, False),
        ("Don Pescao", "donpescao@vendedor.com", "Tradición cevichera de tres generaciones", -12.0964, -77.0368, False),
    ]

    for nombre_neg, email, desc, lat, lng, verificado in vendedores_data:
        u = crear_usuario(nombre_neg, email, RolUsuario.vendedor)
        v = db.query(Vendedor).filter(Vendedor.usuario_id == u.id).first()
        if not v:
            v = Vendedor(
                usuario_id=u.id, nombre_negocio=nombre_neg, descripcion=desc,
                ubicacion_lat=lat, ubicacion_lng=lng,
                estado_verificacion=EstadoVerificacion.verificado if verificado else EstadoVerificacion.pendiente,
            )
            db.add(v)
            db.flush()

            ahora = datetime.now(timezone.utc)

            if verificado:
                # Licencia aprobada vigente
                db.add(Licencia(
                    vendedor_id=v.id,
                    numero_licencia=f"LM-2024-{v.id:04d}",
                    fecha_emision=ahora - timedelta(days=180),
                    fecha_vencimiento=ahora + timedelta(days=180),
                    estado=EstadoDocumento.aprobado,
                ))
                # Certificado aprobado vigente
                db.add(CertificadoSanitario(
                    vendedor_id=v.id,
                    entidad_emisora="DIGESA",
                    fecha_emision=ahora - timedelta(days=90),
                    fecha_vencimiento=ahora + timedelta(days=270),
                    estado=EstadoDocumento.aprobado,
                ))
            else:
                # Licencia pendiente
                db.add(Licencia(
                    vendedor_id=v.id,
                    numero_licencia=f"LM-2024-{v.id+100:04d}",
                    fecha_emision=ahora - timedelta(days=10),
                    fecha_vencimiento=ahora + timedelta(days=355),
                    estado=EstadoDocumento.pendiente,
                ))
                db.add(CertificadoSanitario(
                    vendedor_id=v.id,
                    entidad_emisora="Municipalidad de Lima",
                    fecha_emision=ahora - timedelta(days=5),
                    fecha_vencimiento=ahora + timedelta(days=360),
                    estado=EstadoDocumento.pendiente,
                ))

            # Productos por vendedor
            platos = [
                ("Ceviche clásico de pota", "pota", "pota", 18.00, "Con leche de tigre, cebolla morada, ají limo y choclo"),
                ("Ceviche mixto", "pota", "pota", 24.00, "Pota, camarones y pulpo en leche de tigre especial"),
                ("Tiradito de pota", "pota", "pota", 20.00, "Finas láminas de pota en salsa de ají amarillo"),
                ("Leche de tigre shot", "pota", None, 8.00, "Shot energizante de leche de tigre concentrada"),
            ]
            for nombre_p, esp_dec, esp_ver, precio, descripcion in platos[:3 if verificado else 2]:
                db.add(Producto(
                    vendedor_id=v.id, nombre=nombre_p,
                    especie_declarada=esp_dec, especie_verificada=esp_ver if verificado else None,
                    precio=precio, descripcion=descripcion,
                ))

    db.commit()
    print("✅ Seed data completado.")
    print("\n📋 Credenciales de prueba (contraseña: 123456):")
    print("  👤 inspector@ceviche.com    → Inspector")
    print("  🛒 elPulpo@vendedor.com     → Vendedor verificado")
    print("  🛒 callao@vendedor.com      → Vendedor pendiente")
    print("  🍽️  maria@cliente.com        → Cliente")

if __name__ == "__main__":
    main()
    db.close()
