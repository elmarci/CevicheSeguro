import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  { value: "cliente", label: "🍽️ Cliente", desc: "Busca vendedores verificados" },
  { value: "vendedor", label: "🛒 Vendedor", desc: "Publica y gestiona tu negocio" },
  { value: "inspector", label: "🔍 Inspector", desc: "Verifica y audita vendedores" },
];

export default function LoginPage() {
  const { login, register } = useAuth();
  const [modo, setModo] = useState("login");
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "cliente" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (modo === "login") await login(form.email, form.password);
      else await register(form.nombre, form.email, form.password, form.rol);
    } catch (err) {
      setError(err.response?.data?.detail || "Error al procesar la solicitud");
    } finally { setLoading(false); }
  }

  return (
    <div style={s.bg}>
      <div style={s.hero}>
        <div style={s.heroText}>
          <h1 style={s.heroTitle}>🦑 CevicheSeguro</h1>
          <p style={s.heroSub}>El marketplace donde cada plato de ceviche viene con garantía sanitaria certificada</p>
          <div style={s.features}>
            <Feature icon="✅" text="Vendedores verificados" />
            <Feature icon="🧊" text="Cadena de frío garantizada" />
            <Feature icon="🔬" text="Especie de pescado certificada" />
            <Feature icon="📋" text="Licencias municipales vigentes" />
          </div>
        </div>
      </div>

      <div style={s.formWrap}>
        <div style={s.card}>
          <div style={s.tabs}>
            <button style={modo === "login" ? s.tabActive : s.tab} onClick={() => setModo("login")}>Ingresar</button>
            <button style={modo === "register" ? s.tabActive : s.tab} onClick={() => setModo("register")}>Registrarse</button>
          </div>

          <form onSubmit={handleSubmit} style={s.form}>
            {modo === "register" && (
              <div style={s.field}>
                <label style={s.label}>Nombre completo</label>
                <input name="nombre" placeholder="Ej: María García" value={form.nombre}
                  onChange={handleChange} style={s.input} required />
              </div>
            )}
            <div style={s.field}>
              <label style={s.label}>Correo electrónico</label>
              <input name="email" type="email" placeholder="tucorreo@email.com" value={form.email}
                onChange={handleChange} style={s.input} required />
            </div>
            <div style={s.field}>
              <label style={s.label}>Contraseña</label>
              <input name="password" type="password" placeholder="••••••••" value={form.password}
                onChange={handleChange} style={s.input} required />
            </div>

            {modo === "register" && (
              <div style={s.field}>
                <label style={s.label}>¿Cómo usarás CevicheSeguro?</label>
                <div style={s.rolGrid}>
                  {ROLES.map(r => (
                    <label key={r.value} style={{ ...s.rolCard, ...(form.rol === r.value ? s.rolCardActive : {}) }}>
                      <input type="radio" name="rol" value={r.value} checked={form.rol === r.value}
                        onChange={handleChange} style={{ display: "none" }} />
                      <div style={s.rolIcon}>{r.label.split(" ")[0]}</div>
                      <div style={s.rolName}>{r.label.split(" ").slice(1).join(" ")}</div>
                      <div style={s.rolDesc}>{r.desc}</div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {error && <div style={s.error}>⚠️ {error}</div>}

            <button type="submit" style={s.btn} disabled={loading}>
              {loading ? "Procesando..." : modo === "login" ? "Ingresar →" : "Crear mi cuenta →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "rgba(255,255,255,0.9)", fontSize: "0.9rem" }}>
      <span>{icon}</span><span>{text}</span>
    </div>
  );
}

const s = {
  bg: { minHeight: "100vh", display: "flex", background: "var(--gray-50)" },
  hero: { flex: 1, background: "linear-gradient(145deg, #c0392b 0%, #7b241c 60%, #1a0a08 100%)", display: "flex", alignItems: "center", padding: "3rem", minHeight: "100vh" },
  heroText: { maxWidth: "420px" },
  heroTitle: { fontSize: "3rem", color: "#fff", marginBottom: "1rem", lineHeight: 1.1 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: "1.05rem", lineHeight: 1.6, marginBottom: "2rem" },
  features: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  formWrap: { width: "420px", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", background: "#fff" },
  card: { width: "100%" },
  tabs: { display: "flex", marginBottom: "1.75rem", borderRadius: "10px", overflow: "hidden", border: "1px solid var(--gray-200)" },
  tab: { flex: 1, padding: "0.65rem", background: "var(--gray-50)", border: "none", color: "var(--gray-600)", fontWeight: 500, fontSize: "0.95rem" },
  tabActive: { flex: 1, padding: "0.65rem", background: "var(--primary)", border: "none", color: "#fff", fontWeight: 600, fontSize: "0.95rem" },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  field: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  label: { fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-600)" },
  input: { padding: "0.65rem 0.85rem", border: "1.5px solid var(--gray-200)", borderRadius: "8px", fontSize: "0.95rem", outline: "none", transition: "border 0.2s" },
  rolGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" },
  rolCard: { border: "1.5px solid var(--gray-200)", borderRadius: "8px", padding: "0.6rem 0.4rem", textAlign: "center", cursor: "pointer", transition: "all 0.2s" },
  rolCardActive: { border: "1.5px solid var(--primary)", background: "var(--primary-light)" },
  rolIcon: { fontSize: "1.4rem", marginBottom: "0.2rem" },
  rolName: { fontSize: "0.75rem", fontWeight: 600, color: "var(--gray-800)" },
  rolDesc: { fontSize: "0.65rem", color: "var(--gray-400)", marginTop: "0.15rem" },
  error: { background: "var(--red-light)", color: "var(--primary)", padding: "0.6rem 0.85rem", borderRadius: "8px", fontSize: "0.85rem" },
  btn: { padding: "0.8rem", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", fontSize: "1rem", fontWeight: 600, marginTop: "0.5rem" },
};
