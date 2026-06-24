import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

const ROLES = ["cliente", "vendedor", "inspector"];

export default function LoginPage() {
  const { login, register } = useAuth();
  const [modo, setModo] = useState("login");
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "cliente" });
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      if (modo === "login") {
        await login(form.email, form.password);
      } else {
        await register(form.nombre, form.email, form.password, form.rol);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Error al procesar la solicitud");
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🦑 CevicheSeguro</h1>
        <div style={styles.tabs}>
          <button style={modo === "login" ? styles.tabActive : styles.tab} onClick={() => setModo("login")}>Ingresar</button>
          <button style={modo === "register" ? styles.tabActive : styles.tab} onClick={() => setModo("register")}>Registrarse</button>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          {modo === "register" && (
            <input name="nombre" placeholder="Nombre completo" value={form.nombre}
              onChange={handleChange} style={styles.input} required />
          )}
          <input name="email" type="email" placeholder="Correo electrónico" value={form.email}
            onChange={handleChange} style={styles.input} required />
          <input name="password" type="password" placeholder="Contraseña" value={form.password}
            onChange={handleChange} style={styles.input} required />
          {modo === "register" && (
            <select name="rol" value={form.rol} onChange={handleChange} style={styles.input}>
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          )}
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.btn}>
            {modo === "login" ? "Ingresar" : "Crear cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f4f8" },
  card: { background: "#fff", padding: "2rem", borderRadius: "8px", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", width: "100%", maxWidth: "380px" },
  title: { textAlign: "center", marginBottom: "1.5rem", color: "#1a202c" },
  tabs: { display: "flex", marginBottom: "1.5rem" },
  tab: { flex: 1, padding: "0.5rem", border: "1px solid #cbd5e0", background: "#edf2f7", cursor: "pointer" },
  tabActive: { flex: 1, padding: "0.5rem", border: "1px solid #3182ce", background: "#3182ce", color: "#fff", cursor: "pointer" },
  form: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  input: { padding: "0.6rem 0.8rem", border: "1px solid #cbd5e0", borderRadius: "4px", fontSize: "0.95rem" },
  btn: { padding: "0.7rem", background: "#2b6cb0", color: "#fff", border: "none", borderRadius: "4px", fontSize: "1rem", cursor: "pointer" },
  error: { color: "#c53030", fontSize: "0.85rem", margin: 0 },
};
