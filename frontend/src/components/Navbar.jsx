import React from "react";
import { useAuth } from "../context/AuthContext";

const ROL_LABEL = { cliente: "Cliente", vendedor: "Vendedor", inspector: "Inspector Sanitario" };
const ROL_COLOR = { cliente: "#e67e22", vendedor: "#c0392b", inspector: "#2980b9" };

export default function Navbar() {
  const { usuario, logout } = useAuth();

  return (
    <nav style={s.nav}>
      <div style={s.brand}>
        <span style={s.logo}>🦑</span>
        <div>
          <span style={s.brandName}>CevicheSeguro</span>
          <span style={s.brandTagline}>Tu ceviche, con garantía</span>
        </div>
      </div>
      {usuario && (
        <div style={s.right}>
          <div style={s.userInfo}>
            <div style={s.avatar}>{usuario.nombre.charAt(0).toUpperCase()}</div>
            <div>
              <div style={s.userName}>{usuario.nombre}</div>
              <div style={{ ...s.rolBadge, background: ROL_COLOR[usuario.rol] }}>
                {ROL_LABEL[usuario.rol]}
              </div>
            </div>
          </div>
          <button onClick={logout} style={s.logoutBtn}>Salir</button>
        </div>
      )}
    </nav>
  );
}

const s = {
  nav: { background: "linear-gradient(135deg, #c0392b 0%, #96281b 100%)", color: "#fff", padding: "0 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", height: "64px", boxShadow: "0 2px 12px rgba(192,57,43,0.3)", position: "sticky", top: 0, zIndex: 100 },
  brand: { display: "flex", alignItems: "center", gap: "0.75rem" },
  logo: { fontSize: "1.8rem" },
  brandName: { display: "block", fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 700, lineHeight: 1.2 },
  brandTagline: { display: "block", fontSize: "0.65rem", opacity: 0.8, letterSpacing: "0.05em" },
  right: { display: "flex", alignItems: "center", gap: "1rem" },
  userInfo: { display: "flex", alignItems: "center", gap: "0.6rem" },
  avatar: { width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1rem" },
  userName: { fontSize: "0.85rem", fontWeight: 600, lineHeight: 1.2 },
  rolBadge: { fontSize: "0.65rem", padding: "1px 8px", borderRadius: "10px", color: "#fff", fontWeight: 500, width: "fit-content" },
  logoutBtn: { background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", padding: "0.4rem 0.9rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 500, transition: "background 0.2s" },
};
