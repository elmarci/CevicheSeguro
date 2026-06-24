"""
Script de seed data para CevicheSeguro v2.
Uso: docker-compose exec backend python seed.py
"""
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, "/app")

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.models import (
    CertificadoSanitario, Cliente, Comunicado, EstadoDocumento,
    EstadoVerificacion, Licencia, NivelComunicado, Producto,
    RolUsuario, Usuario, Vendedor,
)

db = SessionLocal()
ahora = datetime.now(timezone.utc)


def get_or_create_usuario(nombre, email, rol):
    u = db.query(Usuario).filter(Usuario.email == email).first()
    if u:
        return u
    u = Usuario(nombre=nombre, email=email, password_hash=hash_password("123456"), rol=rol)
    db.add(u); db.flush()
    return u


def main():
    print("🌱 Iniciando seed data v2...")

    # ── Inspector ──
    inspector = get_or_create_usuario("Carlos Quispe Mamani", "inspector@ceviche.com", RolUsuario.inspector)

    # ── Clientes ──
    for nombre, email, direccion, distrito in [
        ("María Torres Huanca", "maria@cliente.com", "Av. Larco 234, Miraflores", "Miraflores"),
        ("Luis Paredes Ccama", "luis@cliente.com", "Jr. de la Unión 567, Lima", "Lima Cercado"),
        ("Ana Flores Quispe", "ana@cliente.com", "Av. Benavides 890, Surco", "Surco"),
    ]:
        u = get_or_create_usuario(nombre, email, RolUsuario.cliente)
        if not db.query(Cliente).filter(Cliente.usuario_id == u.id).first():
            db.add(Cliente(usuario_id=u.id, direccion=direccion, telefono="987000001", distrito=distrito))
    db.flush()

    # ── Vendedores ──
    vendedores_data = [
        {
            "nombre": "Carlos Mamani", "email": "elPulpo@vendedor.com",
            "negocio": "Cevichería El Pulpo Dorado",
            "desc": "El mejor ceviche de pota artesanal de Miraflores. Preparación a la vista del cliente.",
            "direccion": "Av. Larco 456, Stand 8", "distrito": "Miraflores",
            "lat": -12.1211, "lng": -77.0291, "tel": "987111111",
            "apertura": "10:00", "cierre": "19:00", "dias": "Lun-Sab",
            "pmin": 18, "pmax": 35,
            "especialidad": "Ceviche clásico, tiradito, leche de tigre",
            "verificado": True,
        },
        {
            "nombre": "Rosa Condori", "email": "lapota@vendedor.com",
            "negocio": "La Pota Feliz",
            "desc": "Ceviche fresco de pota con leche de tigre artesanal. Tradición de tres generaciones.",
            "direccion": "Mercado Central de Surco, Puesto 23", "distrito": "Surco",
            "lat": -12.0464, "lng": -77.0428, "tel": "987222222",
            "apertura": "09:00", "cierre": "18:00", "dias": "Lun-Dom",
            "pmin": 15, "pmax": 28,
            "especialidad": "Ceviche mixto, chicharrón de calamar",
            "verificado": True,
        },
        {
            "nombre": "Jorge Huanca", "email": "sabores@vendedor.com",
            "negocio": "Sabores del Mar",
            "desc": "Especialistas en ceviche mixto y tiradito. Ingredientes frescos del día.",
            "direccion": "Av. Brasil 1234", "distrito": "Jesús María",
            "lat": -12.1311, "lng": -77.0181, "tel": "987333333",
            "apertura": "11:00", "cierre": "20:00", "dias": "Mar-Dom",
            "pmin": 20, "pmax": 40,
            "especialidad": "Tiradito de pota, ceviche gourmet",
            "verificado": True,
        },
        {
            "nombre": "Pedro Quispe", "email": "callao@vendedor.com",
            "negocio": "Ceviche Express Callao",
            "desc": "Ceviche rápido y fresco directo del puerto del Callao.",
            "direccion": "Terminal Pesquero del Callao, Módulo 5", "distrito": "Callao",
            "lat": -12.0565, "lng": -77.1181, "tel": "987444444",
            "apertura": "08:00", "cierre": "15:00", "dias": "Lun-Sab",
            "pmin": 12, "pmax": 22,
            "especialidad": "Ceviche de puerto, jalea de mariscos",
            "verificado": False,
        },
        {
            "nombre": "Martha Ccama", "email": "donpescao@vendedor.com",
            "negocio": "Don Pescao",
            "desc": "Tradición cevichera familiar de tres generaciones en el corazón de Barranco.",
            "direccion": "Jr. Centenario 876", "distrito": "Barranco",
            "lat": -12.0964, "lng": -77.0368, "tel": "987555555",
            "apertura": "12:00", "cierre": "21:00", "dias": "Lun-Dom",
            "pmin": 22, "pmax": 45,
            "especialidad": "Ceviche gourmet, causa de cangrejo",
            "verificado": False,
        },
    ]

    platos_por_vendedor = [
        [
            ("Ceviche clásico de pota", "pota", "pota", 18.00, "Con leche de tigre, cebolla morada, ají limo y choclo"),
            ("Ceviche mixto El Pulpo", "pota", "pota", 28.00, "Pota, langostinos y pulpo en leche de tigre especial"),
            ("Tiradito de pota", "pota", "pota", 22.00, "Finas láminas de pota en salsa de ají amarillo cremosa"),
            ("Leche de tigre shot", "pota", None, 8.00, "Shot energizante de leche de tigre concentrada"),
        ],
        [
            ("Ceviche La Pota Feliz", "pota", "pota", 16.00, "Receta familiar con ají amarillo y culantro fresco"),
            ("Chicharrón de calamar", "calamar", "calamar", 20.00, "Calamar apanado crocante con salsa criolla"),
            ("Ceviche mixto familiar", "mixto", None, 25.00, "Para 2 personas: pota, camarones y pulpo"),
        ],
        [
            ("Tiradito gourmet", "pota", "pota", 28.00, "Presentación tipo japonés con salsa de ají amarillo y leche de coco"),
            ("Ceviche mixto Sabores", "mixto", None, 35.00, "Premium con langosta, camarones y pota del pacífico"),
            ("Ceviche de corvina", "corvina", "corvina", 32.00, "Corvina fresca con leche de tigre de maracuyá"),
        ],
        [
            ("Ceviche del puerto", "pota", None, 14.00, "Clásico estilo callao, sencillo y sabroso"),
            ("Jalea de pota", "pota", None, 18.00, "Pota frita con arroz chaufa"),
        ],
        [
            ("Ceviche Don Pescao", "pota", "pota", 28.00, "La receta original de la familia, con leche de tigre secreta"),
            ("Causa de cangrejo", "mixto", None, 20.00, "Causa limeña tradicional con cangrejo real"),
            ("Tiradito barranco", "lenguado", "lenguado", 38.00, "Lenguado fresco con salsa de rocoto y maracuyá"),
        ],
    ]

    for i, vd in enumerate(vendedores_data):
        u = get_or_create_usuario(vd["nombre"], vd["email"], RolUsuario.vendedor)
        v = db.query(Vendedor).filter(Vendedor.usuario_id == u.id).first()
        if not v:
            v = Vendedor(
                usuario_id=u.id,
                nombre_negocio=vd["negocio"], descripcion=vd["desc"],
                direccion=vd["direccion"], distrito=vd["distrito"], ciudad="Lima",
                telefono_contacto=vd["tel"],
                ubicacion_lat=vd["lat"], ubicacion_lng=vd["lng"],
                horario_apertura=vd["apertura"], horario_cierre=vd["cierre"],
                dias_atencion=vd["dias"],
                precio_minimo=vd["pmin"], precio_maximo=vd["pmax"],
                especialidad=vd["especialidad"],
                estado_verificacion=EstadoVerificacion.verificado if vd["verificado"] else EstadoVerificacion.pendiente,
            )
            db.add(v); db.flush()

            if vd["verificado"]:
                db.add(Licencia(vendedor_id=v.id, numero_licencia=f"LM-2024-{v.id:04d}",
                    autoridad_emisora="Municipalidad de " + vd["distrito"],
                    fecha_emision=ahora-timedelta(days=180),
                    fecha_vencimiento=ahora+timedelta(days=180), estado=EstadoDocumento.aprobado))
                db.add(CertificadoSanitario(vendedor_id=v.id, entidad_emisora="DIGESA",
                    numero_certificado=f"DIGESA-2024-{v.id:04d}",
                    fecha_emision=ahora-timedelta(days=90),
                    fecha_vencimiento=ahora+timedelta(days=270), estado=EstadoDocumento.aprobado))
            else:
                db.add(Licencia(vendedor_id=v.id, numero_licencia=f"LM-PEND-{v.id+100:04d}",
                    fecha_emision=ahora-timedelta(days=5),
                    fecha_vencimiento=ahora+timedelta(days=360), estado=EstadoDocumento.pendiente))
                db.add(CertificadoSanitario(vendedor_id=v.id, entidad_emisora="Municipalidad Distrital",
                    fecha_emision=ahora-timedelta(days=3),
                    fecha_vencimiento=ahora+timedelta(days=362), estado=EstadoDocumento.pendiente))

            for nombre_p, esp_dec, esp_ver, precio, descripcion in platos_por_vendedor[i]:
                db.add(Producto(vendedor_id=v.id, nombre=nombre_p, especie_declarada=esp_dec,
                    especie_verificada=esp_ver, precio=precio, descripcion=descripcion))

    # ── Comunicado de bienvenida ──
    if not db.query(Comunicado).first():
        db.add(Comunicado(
            inspector_id=inspector.id,
            titulo="Bienvenidos al sistema CevicheSeguro",
            mensaje="Este sistema garantiza la trazabilidad sanitaria de los vendedores de ceviche. "
                    "Todos los vendedores verificados cuentan con licencia municipal y certificado sanitario vigentes. "
                    "Como consumidor, puedes reportar cualquier irregularidad.",
            nivel=NivelComunicado.informativo,
        ))

    db.commit()
    print("✅ Seed data v2 completado.")
    print("\n📋 Credenciales (contraseña: 123456):")
    print("  🔍 inspector@ceviche.com")
    print("  🛒 elPulpo@vendedor.com  (verificado)")
    print("  🛒 callao@vendedor.com   (pendiente)")
    print("  🍽️  maria@cliente.com")


if __name__ == "__main__":
    main()
    db.close()
