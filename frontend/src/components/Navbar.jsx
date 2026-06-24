import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import ProfilePage from "../pages/ProfilePage";

const ROL_LABEL = { cliente: "Cliente", vendedor: "Vendedor", inspector: "Inspector Sanitario" };
const ROL_COLOR = { cliente: "#e67e22", vendedor: "#c0392b", inspector: "#2980b9" };

export default function Navbar() {
  const { usuario, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  return (
    <>
      <nav style={s.nav}>
        <div style={s.brand}>
          <span style={s.logo}>🦑</span>
          <div>
            <span style={s.brandName}>CevicheSeguro</span>
            <span style={s.brandTagline}>Tu ceviche, con garantía sanitaria</span>
          </div>
        </div>
        {usuario && (
          <div style={s.right}>
            <button onClick={() => setShowProfile(true)} style={s.profileBtn}>
              <div style={s.avatar}>{usuario.nombre.charAt(0).toUpperCase()}</div>
              <div style={s.userInfo}>
                <div style={s.userName}>{usuario.nombre}</div>
                <div style={{ ...s.rolBadge, background: ROL_COLOR[usuario.rol] }}>
                  {ROL_LABEL[usuario.rol]}
                </div>
              </div>
            </button>
            <button onClick={logout} style={s.logoutBtn}>Salir</button>
          </div>
        )}
      </nav>
      {showProfile && <ProfilePage onClose={() => setShowProfile(false)} />}
    </>
  );
}

const s = {
  nav: { background: "linear-gradient(135deg, #c0392b 0%, #96281b 100%)", color: "#fff", padding: "0 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", height: "64px", boxShadow: "0 2px 12px rgba(192,57,43,0.3)", position: "sticky", top: 0, zIndex: 100 },
  brand: { display: "flex", alignItems: "center", gap: "0.75rem" },
  logo: { fontSize: "1.8rem" },
  brandName: { display: "block", fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 700, lineHeight: 1.2 },
  brandTagline: { display: "block", fontSize: "0.62rem", opacity: 0.8, letterSpacing: "0.04em" },
  right: { display: "flex", alignItems: "center", gap: "0.75rem" },
  profileBtn: { display: "flex", alignItems: "center", gap: "0.6rem", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", padding: "0.4rem 0.75rem", color: "#fff", cursor: "pointer" },
  avatar: { width: "34px", height: "34px", borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.95rem", flexShrink: 0 },
  userInfo: { textAlign: "left" },
  userName: { fontSize: "0.82rem", fontWeight: 600, lineHeight: 1.2 },
  rolBadge: { fontSize: "0.62rem", padding: "1px 6px", borderRadius: "8px", color: "#fff", fontWeight: 500, marginTop: "1px", display: "inline-block" },
  logoutBtn: { background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", padding: "0.4rem 0.85rem", borderRadius: "8px", fontSize: "0.82rem", fontWeight: 500 },
};
