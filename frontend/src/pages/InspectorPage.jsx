import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function InspectorPage() {
  const [tab, setTab] = useState("licencias");
  const [licencias, setLicencias] = useState([]);
  const [certificados, setCertificados] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [alertasLic, setAlertasLic] = useState([]);
  const [alertasCert, setAlertasCert] = useState([]);
  const [msg, setMsg] = useState("");

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
      setLicencias(l.data);
      setCertificados(c.data);
      setReportes(r.data);
      setAlertasLic(al.data);
      setAlertasCert(ac.data);
    } catch { }
  }

  function flash(m) { setMsg(m); setTimeout(() => setMsg(""), 3000); }

  async function decidirLicencia(id, estado) {
    try {
      await api.put(`/inspector/licencias/${id}`, { estado });
      flash(`Licencia ${estado}`);
      cargarTodo();
    } catch (err) { flash("Error: " + (err.response?.data?.detail || err.message)); }
  }

  async function decidirCert(id, estado) {
    try {
      await api.put(`/inspector/certificados/${id}`, { estado });
      flash(`Certificado ${estado}`);
      cargarTodo();
    } catch (err) { flash("Error: " + (err.response?.data?.detail || err.message)); }
  }

  async function resolverReporte(id, estado) {
    try {
      await api.put(`/reportes/${id}`, { estado });
      flash(`Reporte marcado como ${estado}`);
      cargarTodo();
    } catch (err) { flash("Error: " + (err.response?.data?.detail || err.message)); }
  }

  return (
    <div style={styles.page}>
      <h2>Panel Inspector</h2>
      {msg && <div style={styles.flash}>{msg}</div>}

      <div style={styles.tabs}>
        {["licencias", "certificados", "reportes", "alertas"].map(t => (
          <button key={t} style={tab === t ? styles.tabActive : styles.tab} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "licencias" && licencias.length > 0 && <Badge n={licencias.length} />}
            {t === "certificados" && certificados.length > 0 && <Badge n={certificados.length} />}
            {t === "reportes" && reportes.length > 0 && <Badge n={reportes.length} />}
          </button>
        ))}
      </div>

      {tab === "licencias" && (
        <div style={styles.section}>
          <h3>Licencias pendientes ({licencias.length})</h3>
          {licencias.length === 0 && <p style={styles.empty}>No hay licencias pendientes.</p>}
          {licencias.map(l => (
            <div key={l.id} style={styles.docCard}>
              <div>
                <strong>Licencia #{l.id}</strong> — Vendedor #{l.vendedor_id}<br />
                Número: {l.numero_licencia}<br />
                Vence: {new Date(l.fecha_vencimiento).toLocaleDateString()}
              </div>
              <div style={styles.acciones}>
                <button style={styles.btnOk} onClick={() => decidirLicencia(l.id, "aprobado")}>✅ Aprobar</button>
                <button style={styles.btnDanger} onClick={() => decidirLicencia(l.id, "rechazado")}>❌ Rechazar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "certificados" && (
        <div style={styles.section}>
          <h3>Certificados sanitarios pendientes ({certificados.length})</h3>
          {certificados.length === 0 && <p style={styles.empty}>No hay certificados pendientes.</p>}
          {certificados.map(c => (
            <div key={c.id} style={styles.docCard}>
              <div>
                <strong>Certificado #{c.id}</strong> — Vendedor #{c.vendedor_id}<br />
                Entidad: {c.entidad_emisora}<br />
                Vence: {new Date(c.fecha_vencimiento).toLocaleDateString()}
              </div>
              <div style={styles.acciones}>
                <button style={styles.btnOk} onClick={() => decidirCert(c.id, "aprobado")}>✅ Aprobar</button>
                <button style={styles.btnDanger} onClick={() => decidirCert(c.id, "rechazado")}>❌ Rechazar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "reportes" && (
        <div style={styles.section}>
          <h3>Reportes ciudadanos pendientes ({reportes.length})</h3>
          {reportes.length === 0 && <p style={styles.empty}>No hay reportes pendientes.</p>}
          {reportes.map(r => (
            <div key={r.id} style={styles.docCard}>
              <div>
                <strong>Reporte #{r.id}</strong> — Vendedor #{r.vendedor_id}<br />
                Motivo: {r.motivo}<br />
                {r.descripcion && <span>Detalle: {r.descripcion}<br /></span>}
                <small>{new Date(r.created_at).toLocaleString()}</small>
              </div>
              <div style={styles.acciones}>
                <button style={styles.btnOk} onClick={() => resolverReporte(r.id, "revisado")}>✅ Revisado</button>
                <button style={styles.btnNeutro} onClick={() => resolverReporte(r.id, "descartado")}>🗑 Descartar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "alertas" && (
        <div style={styles.section}>
          <h3>⚠️ Documentos que vencen en los próximos 30 días</h3>
          <h4>Licencias ({alertasLic.length})</h4>
          {alertasLic.length === 0 && <p style={styles.empty}>Ninguna.</p>}
          {alertasLic.map(l => (
            <div key={l.id} style={styles.alertCard}>
              Licencia #{l.id} — Vendedor #{l.vendedor_id} — Vence: <strong>{new Date(l.fecha_vencimiento).toLocaleDateString()}</strong>
            </div>
          ))}
          <h4>Certificados ({alertasCert.length})</h4>
          {alertasCert.length === 0 && <p style={styles.empty}>Ninguno.</p>}
          {alertasCert.map(c => (
            <div key={c.id} style={styles.alertCard}>
              Certificado #{c.id} — Vendedor #{c.vendedor_id} — Vence: <strong>{new Date(c.fecha_vencimiento).toLocaleDateString()}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ n }) {
  return <span style={{ background: "#c53030", color: "#fff", borderRadius: "10px", padding: "0 6px", fontSize: "0.7rem", marginLeft: "4px" }}>{n}</span>;
}

const styles = {
  page: { padding: "1rem 1.5rem", maxWidth: "900px", margin: "0 auto" },
  flash: { background: "#c6f6d5", color: "#276749", padding: "0.6rem 1rem", borderRadius: "4px", marginBottom: "1rem" },
  tabs: { display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" },
  tab: { padding: "0.4rem 1rem", border: "1px solid #cbd5e0", background: "#edf2f7", cursor: "pointer", borderRadius: "4px" },
  tabActive: { padding: "0.4rem 1rem", border: "1px solid #3182ce", background: "#3182ce", color: "#fff", cursor: "pointer", borderRadius: "4px" },
  section: { background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  docCard: { display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #e2e8f0", padding: "0.75rem 1rem", borderRadius: "6px", marginBottom: "0.75rem", gap: "1rem" },
  alertCard: { border: "1px solid #fbd38d", background: "#fffbeb", padding: "0.6rem 0.8rem", borderRadius: "4px", marginBottom: "0.5rem" },
  acciones: { display: "flex", gap: "0.5rem", flexShrink: 0 },
  btnOk: { padding: "0.35rem 0.75rem", background: "#276749", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" },
  btnDanger: { padding: "0.35rem 0.75rem", background: "#c53030", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" },
  btnNeutro: { padding: "0.35rem 0.75rem", background: "#718096", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" },
  empty: { color: "#718096" },
};
