import React from "react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { usuario, logout } = useAuth();

  return (
    <nav style={styles.nav}>
      <span style={styles.brand}>🦑 CevicheSeguro</span>
      {usuario && (
        <div style={styles.right}>
          <span style={styles.user}>{usuario.nombre} <em>({usuario.rol})</em></span>
          <button onClick={logout} style={styles.btn}>Salir</button>
        </div>
      )}
    </nav>
  );
}

const styles = {
  nav: { background: "#2b6cb0", color: "#fff", padding: "0.75rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" },
  brand: { fontWeight: "bold", fontSize: "1.1rem" },
  right: { display: "flex", alignItems: "center", gap: "1rem" },
  user: { fontSize: "0.9rem" },
  btn: { background: "#fff", color: "#2b6cb0", border: "none", padding: "0.3rem 0.8rem", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" },
};
