import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const ROL_ICON = { cliente: "🍽️", vendedor: "🛒", inspector: "🔍" };
const ROL_LABEL = { cliente: "Cliente", vendedor: "Vendedor", inspector: "Inspector Sanitario" };

export default function ProfilePage({ onClose }) {
  const { usuario, updateProfile } = useAuth();
  const [tab, setTab] = useState("personal");
  const [form, setForm] = useState({ nombre: usuario?.nombre || "", email: usuario?.email || "" });
  const [pwForm, setPwForm] = useState({ password_actual: "", password_nuevo: "", confirmar: "" });
  const [negocioForm, setNegocioForm] = useState({ nombre_negocio: "", descripcion: "", ubicacion_lat: "", ubicacion_lng: "" });
  const [clienteForm, setClienteForm] = useState({ direccion: "", telefono: "" });
  const [msg, setMsg] = useState({ text: "", ok: true });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (usuario?.rol === "vendedor") cargarPerfil();
    if (usuario?.rol === "cliente") cargarCliente();
  }, []);

  async function cargarPerfil() {
    try {
      const r = await api.get("/vendedores/mi-perfil");
      setNegocioForm({
        nombre_negocio: r.data.nombre_negocio || "",
        descripcion: r.data.descripcion || "",
        ubicacion_lat: r.data.ubicacion_lat || "",
        ubicacion_lng: r.data.ubicacion_lng || "",
      });
    } catch {}
  }

  async function cargarCliente() {
    try {
      const r = await api.get("/clientes/mi-perfil");
      setClienteForm({ direccion: r.data.direccion || "", telefono: r.data.telefono || "" });
    } catch {}
  }

  function flash(text, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg({ text: "", ok: true }), 3500); }

  async function guardarPersonal(e) {
    e.preventDefault(); setLoading(true);
    try {
      await updateProfile({ nombre: form.nombre, email: form.email });
      flash("✅ Datos personales actualizados");
    } catch (err) { flash(err.response?.data?.detail || "Error al actualizar", false); }
    finally { setLoading(false); }
  }

  async function cambiarPassword(e) {
    e.preventDefault();
    if (pwForm.password_nuevo !== pwForm.confirmar) return flash("Las contraseñas no coinciden", false);
    if (pwForm.password_nuevo.length < 6) return flash("La nueva contraseña debe tener al menos 6 caracteres", false);
    setLoading(true);
    try {
      await updateProfile({ password_actual: pwForm.password_actual, password_nuevo: pwForm.password_nuevo });
      flash("✅ Contraseña actualizada");
      setPwForm({ password_actual: "", password_nuevo: "", confirmar: "" });
    } catch (err) { flash(err.response?.data?.detail || "Error al cambiar contraseña", false); }
    finally { setLoading(false); }
  }

  async function guardarNegocio(e) {
    e.preventDefault(); setLoading(true);
    try {
      await api.put("/vendedores/mi-perfil", {
        nombre_negocio: negocioForm.nombre_negocio,
        descripcion: negocioForm.descripcion,
        ubicacion_lat: negocioForm.ubicacion_lat ? parseFloat(negocioForm.ubicacion_lat) : null,
        ubicacion_lng: negocioForm.ubicacion_lng ? parseFloat(negocioForm.ubicacion_lng) : null,
      });
      flash("✅ Perfil del negocio actualizado");
    } catch (err) { flash(err.response?.data?.detail || "Error al actualizar negocio", false); }
    finally { setLoading(false); }
  }

  async function guardarCliente(e) {
    e.preventDefault(); setLoading(true);
    try {
      await api.put("/clientes/mi-perfil", clienteForm);
      flash("✅ Datos de entrega actualizados");
    } catch (err) { flash(err.response?.data?.detail || "Error al actualizar", false); }
    finally { setLoading(false); }
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.avatar}>{usuario?.nombre?.charAt(0)?.toUpperCase()}</div>
            <div>
              <h2 style={s.nombre}>{usuario?.nombre}</h2>
              <span style={s.rolBadge}>{ROL_ICON[usuario?.rol]} {ROL_LABEL[usuario?.rol]}</span>
            </div>
          </div>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        {msg.text && (
          <div style={{ ...s.toast, background: msg.ok ? "#d1fae5" : "#fee2e2", color: msg.ok ? "#065f46" : "#991b1b" }}>
            {msg.text}
          </div>
        )}

        <div style={s.tabs}>
          {[["personal","👤 Datos personales"],
            ...(usuario?.rol === "vendedor" ? [["negocio","🏪 Mi negocio"]] : []),
            ...(usuario?.rol === "cliente" ? [["entrega","📍 Datos de entrega"]] : []),
            ["seguridad","🔒 Seguridad"],
          ].map(([t, l]) => (
            <button key={t} style={tab === t ? s.tabActive : s.tab} onClick={() => setTab(t)}>{l}</button>
          ))}
        </div>

        <div style={s.body}>

          {tab === "personal" && (
            <form onSubmit={guardarPersonal} style={s.form}>
              <h3 style={s.sectionTitle}>Información personal</h3>
              <Field label="Nombre completo">
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={s.input} required />
              </Field>
              <Field label="Correo electrónico">
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={s.input} required />
              </Field>
              <Field label="Rol en el sistema">
                <input value={ROL_LABEL[usuario?.rol]} style={{ ...s.input, background: "#f3f4f6", color: "#6b7280" }} disabled />
              </Field>
              <button type="submit" style={s.btn} disabled={loading}>{loading ? "Guardando..." : "Guardar cambios"}</button>
            </form>
          )}

          {tab === "seguridad" && (
            <form onSubmit={cambiarPassword} style={s.form}>
              <h3 style={s.sectionTitle}>Cambiar contraseña</h3>
              <Field label="Contraseña actual">
                <input type="password" value={pwForm.password_actual} onChange={e => setPwForm({ ...pwForm, password_actual: e.target.value })} style={s.input} required placeholder="Tu contraseña actual" />
              </Field>
              <Field label="Nueva contraseña">
                <input type="password" value={pwForm.password_nuevo} onChange={e => setPwForm({ ...pwForm, password_nuevo: e.target.value })} style={s.input} required placeholder="Mínimo 6 caracteres" />
              </Field>
              <Field label="Confirmar nueva contraseña">
                <input type="password" value={pwForm.confirmar} onChange={e => setPwForm({ ...pwForm, confirmar: e.target.value })} style={s.input} required placeholder="Repite la nueva contraseña" />
              </Field>
              <button type="submit" style={s.btn} disabled={loading}>{loading ? "Guardando..." : "Cambiar contraseña"}</button>
            </form>
          )}

          {tab === "negocio" && (
            <form onSubmit={guardarNegocio} style={s.form}>
              <h3 style={s.sectionTitle}>Información de tu negocio</h3>
              <Field label="Nombre del negocio">
                <input value={negocioForm.nombre_negocio} onChange={e => setNegocioForm({ ...negocioForm, nombre_negocio: e.target.value })} style={s.input} required placeholder="Ej: Cevichería El Pulpo Dorado" />
              </Field>
              <Field label="Descripción del negocio">
                <textarea value={negocioForm.descripcion} onChange={e => setNegocioForm({ ...negocioForm, descripcion: e.target.value })} style={{ ...s.input, height: "80px", resize: "vertical" }} placeholder="Describe tu negocio, especialidades, años de experiencia..." />
              </Field>
              <div style={s.row}>
                <Field label="Latitud (opcional)">
                  <input type="number" step="any" value={negocioForm.ubicacion_lat} onChange={e => setNegocioForm({ ...negocioForm, ubicacion_lat: e.target.value })} style={s.input} placeholder="-12.0464" />
                </Field>
                <Field label="Longitud (opcional)">
                  <input type="number" step="any" value={negocioForm.ubicacion_lng} onChange={e => setNegocioForm({ ...negocioForm, ubicacion_lng: e.target.value })} style={s.input} placeholder="-77.0428" />
                </Field>
              </div>
              <p style={s.hint}>💡 La ubicación permite que los clientes te encuentren por cercanía.</p>
              <button type="submit" style={s.btn} disabled={loading}>{loading ? "Guardando..." : "Guardar cambios del negocio"}</button>
            </form>
          )}

          {tab === "entrega" && (
            <form onSubmit={guardarCliente} style={s.form}>
              <h3 style={s.sectionTitle}>Datos de entrega predeterminados</h3>
              <p style={s.hint}>Estos datos se usarán automáticamente al hacer un pedido. Puedes editarlos al momento de comprar.</p>
              <Field label="Dirección de entrega">
                <input value={clienteForm.direccion} onChange={e => setClienteForm({ ...clienteForm, direccion: e.target.value })} style={s.input} placeholder="Ej: Av. Larco 123, Miraflores, Lima" />
              </Field>
              <Field label="Teléfono de contacto">
                <input value={clienteForm.telefono} onChange={e => setClienteForm({ ...clienteForm, telefono: e.target.value })} style={s.input} placeholder="Ej: 987 654 321" />
              </Field>
              <button type="submit" style={s.btn} disabled={loading}>{loading ? "Guardando..." : "Guardar datos de entrega"}</button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--gray-600)" }}>{label}</label>
      {children}
    </div>
  );
}

const s = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" },
  modal: { background: "#fff", borderRadius: "var(--radius)", width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--shadow-lg)" },
  header: { background: "linear-gradient(135deg, #c0392b, #7b241c)", color: "#fff", padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerLeft: { display: "flex", gap: "1rem", alignItems: "center" },
  avatar: { width: "52px", height: "52px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 700, flexShrink: 0 },
  nombre: { fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", marginBottom: "0.2rem" },
  rolBadge: { fontSize: "0.8rem", background: "rgba(255,255,255,0.2)", padding: "0.2rem 0.7rem", borderRadius: "12px" },
  closeBtn: { background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: "32px", height: "32px", borderRadius: "50%", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" },
  toast: { margin: "0.75rem 1.5rem", padding: "0.6rem 1rem", borderRadius: "8px", fontSize: "0.88rem", fontWeight: 500 },
  tabs: { display: "flex", borderBottom: "1px solid var(--gray-200)", overflowX: "auto" },
  tab: { padding: "0.75rem 1rem", border: "none", background: "none", color: "var(--gray-600)", fontWeight: 500, fontSize: "0.82rem", borderBottom: "2px solid transparent", whiteSpace: "nowrap" },
  tabActive: { padding: "0.75rem 1rem", border: "none", background: "none", color: "var(--primary)", fontWeight: 600, fontSize: "0.82rem", borderBottom: "2px solid var(--primary)", whiteSpace: "nowrap" },
  body: { padding: "1.5rem" },
  sectionTitle: { fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", marginBottom: "1.25rem", color: "var(--gray-800)" },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  input: { padding: "0.65rem 0.85rem", border: "1.5px solid var(--gray-200)", borderRadius: "8px", fontSize: "0.93rem", outline: "none" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" },
  hint: { fontSize: "0.8rem", color: "var(--gray-400)", marginTop: "-0.25rem" },
  btn: { padding: "0.75rem", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "0.95rem", marginTop: "0.25rem" },
};
