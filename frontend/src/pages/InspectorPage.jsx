import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function InspectorPage() {
  const [tab, setTab] = useState("dashboard");
  const [licencias, setLicencias] = useState([]);
  const [certificados, setCertificados] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [alertasLic, setAlertasLic] = useState([]);
  const [alertasCert, setAlertasCert] = useState([]);
  const [msg, setMsg] = useState({ text: "", ok: true });

  useEffect(() => { cargarTodo(); }, []);

  async function cargarTodo() {
    try {
      const [l, c, r, al, ac] = await Promise.all([
        api.get("/inspector/licencias/pendientes"),
        api.get("/inspector/certificados/pendientes"),
        api.get("/reportes/pendientes"),
        api.get("/alertas/licencias-por-vencer?dias=30"),
        api.get("/alertas/certificados-por-vencer?dias=30"),
      ]);
      setLicencias(l.data); setCertificados(c.data); setReportes(r.data);
      setAlertasLic(al.data); setAlertasCert(ac.data);
    } catch {}
  }

  function flash(text, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg({ text: "", ok: true }), 3000); }

  async function decidirLicencia(id, estado) {
    try { await api.put(`/inspector/licencias/${id}`, { estado }); flash(`Licencia ${estado} ✅`); cargarTodo(); }
    catch (err) { flash(err.response?.data?.detail || "Error", false); }
  }
  async function decidirCert(id, estado) {
    try { await api.put(`/inspector/certificados/${id}`, { estado }); flash(`Certificado ${estado} ✅`); cargarTodo(); }
    catch (err) { flash(err.response?.data?.detail || "Error", false); }
  }
  async function resolverReporte(id, estado) {
    try { await api.put(`/reportes/${id}`, { estado }); flash(`Reporte marcado: ${estado}`); cargarTodo(); }
    catch (err) { flash(err.response?.data?.detail || "Error", false); }
  }

  const totalPendientes = licencias.length + certificados.length + reportes.length;

  return (
    <div style={s.page}>
      {msg.text && <Toast text={msg.text} ok={msg.ok} />}

      <div style={s.header}>
        <div>
          <h2 style={s.headerTitle}>Panel de Inspector Sanitario 🔍</h2>
          <p style={s.headerSub}>Verifica documentos, certifica vendedores y gestiona reportes ciudadanos</p>
        </div>
        {totalPendientes > 0 && (
          <div style={s.alertBanner}>⚠️ {totalPendientes} item(s) requieren tu atención</div>
        )}
      </div>

      {/* Dashboard KPIs */}
      <div style={s.kpiBar}>
        <KPI icon="📋" n={licencias.length} label="Licencias pendientes" color="var(--accent)" onClick={() => setTab("licencias")} />
        <KPI icon="🏥" n={certificados.length} label="Certificados pendientes" color="#2980b9" onClick={() => setTab("certificados")} />
        <KPI icon="🚨" n={reportes.length} label="Reportes por revisar" color="var(--primary)" onClick={() => setTab("reportes")} />
        <KPI icon="⏰" n={alertasLic.length + alertasCert.length} label="Próximos a vencer (30d)" color="#8e44ad" onClick={() => setTab("alertas")} />
      </div>

      <div style={s.tabBar}>
        {[["dashboard","📊 Dashboard"],["licencias","📋 Licencias"],["certificados","🏥 Certificados"],["reportes","🚨 Reportes"],["alertas","⏰ Alertas"]].map(([t, l]) => (
          <button key={t} style={tab === t ? s.tabActive : s.tab} onClick={() => setTab(t)}>
            {l}
            {t !== "dashboard" && { licencias: licencias.length, certificados: certificados.length, reportes: reportes.length, alertas: alertasLic.length + alertasCert.length }[t] > 0 && (
              <span style={s.badge}>{{ licencias: licencias.length, certificados: certificados.length, reportes: reportes.length, alertas: alertasLic.length + alertasCert.length }[t]}</span>
            )}
          </button>
        ))}
      </div>

      <div style={s.content}>

        {tab === "dashboard" && (
          <div style={s.dashGrid}>
            <ResumenCard title="📋 Licencias pendientes" items={licencias.map(l => ({ id: l.id, titulo: l.numero_licencia, sub: `Vendedor #${l.vendedor_id} · Vence ${new Date(l.fecha_vencimiento).toLocaleDateString("es-PE")}` }))} onAction={(id, a) => decidirLicencia(id, a)} />
            <ResumenCard title="🏥 Certificados pendientes" items={certificados.map(c => ({ id: c.id, titulo: c.entidad_emisora, sub: `Vendedor #${c.vendedor_id} · Vence ${new Date(c.fecha_vencimiento).toLocaleDateString("es-PE")}` }))} onAction={(id, a) => decidirCert(id, a)} />
          </div>
        )}

        {tab === "licencias" && (
          <>
            <h2 style={s.sectionTitle}>Licencias pendientes de revisión</h2>
            {licencias.length === 0 ? <Empty msg="No hay licencias pendientes. ¡Todo al día!" /> :
              licencias.map(l => (
                <DocCard key={l.id}
                  icon="📋"
                  title={`Licencia: ${l.numero_licencia}`}
                  meta={[`Vendedor #${l.vendedor_id}`, `Emitida: ${new Date(l.fecha_emision).toLocaleDateString("es-PE")}`, `Vence: ${new Date(l.fecha_vencimiento).toLocaleDateString("es-PE")}`]}
                  onAprobar={() => decidirLicencia(l.id, "aprobado")}
                  onRechazar={() => decidirLicencia(l.id, "rechazado")}
                />
              ))
            }
          </>
        )}

        {tab === "certificados" && (
          <>
            <h2 style={s.sectionTitle}>Certificados sanitarios pendientes</h2>
            {certificados.length === 0 ? <Empty msg="No hay certificados pendientes. ¡Todo al día!" /> :
              certificados.map(c => (
                <DocCard key={c.id}
                  icon="🏥"
                  title={`Entidad: ${c.entidad_emisora}`}
                  meta={[`Vendedor #${c.vendedor_id}`, `Emitido: ${new Date(c.fecha_emision).toLocaleDateString("es-PE")}`, `Vence: ${new Date(c.fecha_vencimiento).toLocaleDateString("es-PE")}`]}
                  onAprobar={() => decidirCert(c.id, "aprobado")}
                  onRechazar={() => decidirCert(c.id, "rechazado")}
                />
              ))
            }
          </>
        )}

        {tab === "reportes" && (
          <>
            <h2 style={s.sectionTitle}>Reportes ciudadanos pendientes</h2>
            {reportes.length === 0 ? <Empty msg="No hay reportes pendientes." /> :
              reportes.map(r => (
                <div key={r.id} style={s.reporteCard}>
                  <div style={s.reporteHeader}>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: "0.2rem" }}>🚨 {r.motivo}</div>
                      <div style={{ fontSize: "0.82rem", color: "var(--gray-400)" }}>Vendedor #{r.vendedor_id} · Cliente #{r.cliente_id} · {new Date(r.created_at).toLocaleString("es-PE")}</div>
                    </div>
                  </div>
                  {r.descripcion && <p style={s.reporteDesc}>{r.descripcion}</p>}
                  <div style={s.reporteActions}>
                    <button style={s.btnOk} onClick={() => resolverReporte(r.id, "revisado")}>✅ Marcar revisado</button>
                    <button style={s.btnGray} onClick={() => resolverReporte(r.id, "descartado")}>🗑️ Descartar</button>
                  </div>
                </div>
              ))
            }
          </>
        )}

        {tab === "alertas" && (
          <>
            <h2 style={s.sectionTitle}>⏰ Documentos que vencen en los próximos 30 días</h2>
            <div style={s.alertGrid}>
              <div>
                <h3 style={{ marginBottom: "1rem", fontSize: "1rem", color: "var(--accent)" }}>📋 Licencias ({alertasLic.length})</h3>
                {alertasLic.length === 0 ? <Empty msg="Ninguna licencia por vencer." /> :
                  alertasLic.map(l => <AlertRow key={l.id} titulo={l.numero_licencia} vendedor={l.vendedor_id} vence={l.fecha_vencimiento} />)
                }
              </div>
              <div>
                <h3 style={{ marginBottom: "1rem", fontSize: "1rem", color: "#2980b9" }}>🏥 Certificados ({alertasCert.length})</h3>
                {alertasCert.length === 0 ? <Empty msg="Ningún certificado por vencer." /> :
                  alertasCert.map(c => <AlertRow key={c.id} titulo={c.entidad_emisora} vendedor={c.vendedor_id} vence={c.fecha_vencimiento} />)
                }
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DocCard({ icon, title, meta, onAprobar, onRechazar }) {
  return (
    <div style={{ background: "#fff", borderRadius: "var(--radius)", padding: "1.25rem", marginBottom: "0.75rem", boxShadow: "var(--shadow-sm)", border: "1px solid var(--gray-200)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
        <span style={{ fontSize: "1.5rem" }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 600, marginBottom: "0.3rem" }}>{title}</div>
          {meta.map((m, i) => <div key={i} style={{ fontSize: "0.8rem", color: "var(--gray-400)" }}>{m}</div>)}
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button onClick={onAprobar} style={{ padding: "0.45rem 1rem", background: "var(--green)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "0.88rem" }}>✅ Aprobar</button>
        <button onClick={onRechazar} style={{ padding: "0.45rem 1rem", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "0.88rem" }}>❌ Rechazar</button>
      </div>
    </div>
  );
}

function ResumenCard({ title, items, onAction }) {
  return (
    <div style={{ background: "#fff", borderRadius: "var(--radius)", padding: "1.25rem", boxShadow: "var(--shadow-sm)", border: "1px solid var(--gray-200)" }}>
      <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", marginBottom: "1rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--gray-200)" }}>{title}</h3>
      {items.length === 0 ? <div style={{ color: "var(--gray-400)", fontSize: "0.85rem", textAlign: "center", padding: "1.5rem" }}>✅ Sin pendientes</div> :
        items.slice(0, 3).map(item => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--gray-200)" }}>
            <div>
              <div style={{ fontSize: "0.88rem", fontWeight: 500 }}>{item.titulo}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>{item.sub}</div>
            </div>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              <button onClick={() => onAction(item.id, "aprobado")} style={{ padding: "0.25rem 0.6rem", background: "var(--green-light)", color: "var(--green)", border: "none", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600 }}>✅</button>
              <button onClick={() => onAction(item.id, "rechazado")} style={{ padding: "0.25rem 0.6rem", background: "var(--red-light)", color: "var(--primary)", border: "none", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600 }}>❌</button>
            </div>
          </div>
        ))
      }
      {items.length > 3 && <div style={{ fontSize: "0.78rem", color: "var(--gray-400)", marginTop: "0.5rem", textAlign: "center" }}>+{items.length - 3} más</div>}
    </div>
  );
}

function AlertRow({ titulo, vendedor, vence }) {
  const dias = Math.ceil((new Date(vence) - new Date()) / (1000 * 60 * 60 * 24));
  const urgente = dias <= 7;
  return (
    <div style={{ background: urgente ? "var(--red-light)" : "var(--yellow-light)", border: `1px solid ${urgente ? "#fca5a5" : "#fde68a"}`, borderRadius: "8px", padding: "0.65rem 0.9rem", marginBottom: "0.5rem" }}>
      <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>{titulo}</div>
      <div style={{ fontSize: "0.78rem", color: "var(--gray-600)" }}>Vendedor #{vendedor} · <strong style={{ color: urgente ? "var(--primary)" : "var(--yellow)" }}>{dias <= 0 ? "¡Vencido!" : `Vence en ${dias} días`}</strong></div>
    </div>
  );
}

function KPI({ icon, n, label, color, onClick }) {
  return (
    <div onClick={onClick} style={{ background: "#fff", borderRadius: "var(--radius-sm)", padding: "1rem 1.25rem", boxShadow: "var(--shadow-sm)", border: "1px solid var(--gray-200)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.75rem", transition: "box-shadow 0.2s" }}>
      <span style={{ fontSize: "1.5rem" }}>{icon}</span>
      <div>
        <div style={{ fontSize: "1.6rem", fontWeight: 700, color, lineHeight: 1 }}>{n}</div>
        <div style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>{label}</div>
      </div>
    </div>
  );
}

function Empty({ msg }) {
  return <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--gray-400)" }}>✅ {msg}</div>;
}

function Toast({ text, ok }) {
  return <div style={{ position: "fixed", top: "80px", right: "1.5rem", zIndex: 999, background: ok ? "#065f46" : "#991b1b", color: "#fff", padding: "0.75rem 1.25rem", borderRadius: "10px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", fontSize: "0.9rem" }}>{text}</div>;
}

const s = {
  page: { minHeight: "100vh", background: "var(--gray-50)" },
  header: { background: "linear-gradient(135deg, #1a3a5c, #2980b9)", color: "#fff", padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" },
  headerTitle: { fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", marginBottom: "0.25rem" },
  headerSub: { opacity: 0.8, fontSize: "0.88rem" },
  alertBanner: { background: "rgba(255,255,255,0.2)", padding: "0.6rem 1.2rem", borderRadius: "8px", fontSize: "0.88rem", fontWeight: 600 },
  kpiBar: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", padding: "1rem 1.5rem", background: "#fff", borderBottom: "1px solid var(--gray-200)" },
  tabBar: { display: "flex", background: "#fff", borderBottom: "1px solid var(--gray-200)", paddingLeft: "1.5rem", overflowX: "auto" },
  tab: { padding: "0.85rem 1.1rem", border: "none", background: "none", color: "var(--gray-600)", fontWeight: 500, fontSize: "0.88rem", borderBottom: "2px solid transparent", whiteSpace: "nowrap" },
  tabActive: { padding: "0.85rem 1.1rem", border: "none", background: "none", color: "#2980b9", fontWeight: 600, fontSize: "0.88rem", borderBottom: "2px solid #2980b9", whiteSpace: "nowrap" },
  badge: { background: "var(--primary)", color: "#fff", borderRadius: "10px", padding: "0 6px", fontSize: "0.7rem", marginLeft: "5px" },
  content: { maxWidth: "1000px", margin: "0 auto", padding: "1.5rem" },
  dashGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" },
  sectionTitle: { fontFamily: "'Playfair Display',serif", fontSize: "1.4rem", marginBottom: "1.25rem" },
  reporteCard: { background: "#fff", borderRadius: "var(--radius)", padding: "1.25rem", marginBottom: "0.75rem", boxShadow: "var(--shadow-sm)", border: "1px solid var(--gray-200)" },
  reporteHeader: { marginBottom: "0.5rem" },
  reporteDesc: { fontSize: "0.88rem", color: "var(--gray-600)", background: "var(--gray-50)", padding: "0.6rem 0.85rem", borderRadius: "6px", margin: "0.5rem 0" },
  reporteActions: { display: "flex", gap: "0.5rem", marginTop: "0.75rem" },
  btnOk: { padding: "0.45rem 1rem", background: "var(--green)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "0.88rem" },
  btnGray: { padding: "0.45rem 1rem", background: "var(--gray-100)", color: "var(--gray-600)", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "0.88rem" },
  alertGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" },
};
