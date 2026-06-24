import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function ClientePage() {
  const [tab, setTab] = useState("vendedores");
  const [vendedores, setVendedores] = useState([]);
  const [vendedorSel, setVendedorSel] = useState(null);
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState({});
  const [pedidos, setPedidos] = useState([]);
  const [msg, setMsg] = useState("");
  const [reporteForm, setReporteForm] = useState({ vendedor_id: "", motivo: "", descripcion: "" });

  useEffect(() => { cargarVendedores(); cargarPedidos(); }, []);

  async function cargarVendedores() {
    try {
      const res = await api.get("/vendedores");
      setVendedores(res.data);
    } catch { }
  }

  async function cargarPedidos() {
    try {
      const res = await api.get("/pedidos/mis-pedidos");
      setPedidos(res.data);
    } catch { }
  }

  async function verProductos(vendedor) {
    setVendedorSel(vendedor);
    setCarrito({});
    const res = await api.get(`/productos?vendedor_id=${vendedor.id}`);
    setProductos(res.data);
    setTab("productos");
  }

  function cambiarCantidad(productoId, delta) {
    setCarrito(prev => {
      const actual = prev[productoId] || 0;
      const nuevo = Math.max(0, actual + delta);
      if (nuevo === 0) {
        const { [productoId]: _, ...resto } = prev;
        return resto;
      }
      return { ...prev, [productoId]: nuevo };
    });
  }

  function flash(m) { setMsg(m); setTimeout(() => setMsg(""), 4000); }

  async function hacerPedido() {
    const detalles = Object.entries(carrito).map(([producto_id, cantidad]) => ({
      producto_id: parseInt(producto_id),
      cantidad,
    }));
    if (detalles.length === 0) return flash("Agrega al menos un producto al carrito.");
    try {
      await api.post("/pedidos", { vendedor_id: vendedorSel.id, detalles });
      flash("✅ Pedido realizado con éxito");
      setCarrito({});
      cargarPedidos();
    } catch (err) { flash("Error: " + (err.response?.data?.detail || err.message)); }
  }

  async function enviarReporte(e) {
    e.preventDefault();
    try {
      await api.post("/reportes", { ...reporteForm, vendedor_id: parseInt(reporteForm.vendedor_id) });
      flash("✅ Reporte enviado correctamente");
      setReporteForm({ vendedor_id: "", motivo: "", descripcion: "" });
    } catch (err) { flash("Error: " + (err.response?.data?.detail || err.message)); }
  }

  const totalCarrito = productos
    .filter(p => carrito[p.id])
    .reduce((acc, p) => acc + parseFloat(p.precio) * carrito[p.id], 0);

  function sello(v) {
    if (v.estado_verificacion === "verificado") return { label: "✅ Verificado", bg: "#c6f6d5", color: "#276749" };
    if (v.estado_verificacion === "no_verificado") return { label: "🔴 No verificado", bg: "#fed7d7", color: "#c53030" };
    return { label: "⏳ Pendiente", bg: "#fefcbf", color: "#b7791f" };
  }

  return (
    <div style={styles.page}>
      <h2>Panel Cliente</h2>
      {msg && <div style={styles.flash}>{msg}</div>}

      <div style={styles.tabs}>
        {["vendedores", "productos", "pedidos", "reporte"].map(t => (
          <button key={t} style={tab === t ? styles.tabActive : styles.tab} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "vendedores" && (
        <div style={styles.section}>
          <h3>Vendedores disponibles</h3>
          <div style={styles.grid}>
            {vendedores.map(v => {
              const s = sello(v);
              return (
                <div key={v.id} style={styles.vendCard}>
                  <div style={{ ...styles.selloBadge, background: s.bg, color: s.color }}>{s.label}</div>
                  <strong>{v.nombre_negocio}</strong>
                  {v.descripcion && <p style={styles.desc}>{v.descripcion}</p>}
                  <button style={styles.btn} onClick={() => verProductos(v)}>Ver productos</button>
                </div>
              );
            })}
            {vendedores.length === 0 && <p style={styles.empty}>No hay vendedores registrados.</p>}
          </div>
        </div>
      )}

      {tab === "productos" && (
        <div style={styles.section}>
          {vendedorSel ? (
            <>
              <h3>Productos de: {vendedorSel.nombre_negocio}</h3>
              <button style={styles.btnSecundario} onClick={() => setTab("vendedores")}>← Volver</button>
              <div style={styles.grid}>
                {productos.map(p => (
                  <div key={p.id} style={styles.prodCard}>
                    <strong>{p.nombre}</strong>
                    <p style={styles.desc}>Especie: {p.especie_declarada}
                      {p.especie_verificada && <span style={{ color: "#276749" }}> ✅ ({p.especie_verificada})</span>}
                    </p>
                    <p style={styles.precio}>S/. {p.precio}</p>
                    <div style={styles.contador}>
                      <button onClick={() => cambiarCantidad(p.id, -1)} style={styles.btnCount}>−</button>
                      <span>{carrito[p.id] || 0}</span>
                      <button onClick={() => cambiarCantidad(p.id, 1)} style={styles.btnCount}>+</button>
                    </div>
                  </div>
                ))}
              </div>
              {Object.keys(carrito).length > 0 && (
                <div style={styles.carritoBar}>
                  <span>Total: <strong>S/. {totalCarrito.toFixed(2)}</strong></span>
                  <button style={styles.btnPedido} onClick={hacerPedido}>🛒 Confirmar pedido</button>
                </div>
              )}
            </>
          ) : (
            <p>Selecciona un vendedor desde la lista.</p>
          )}
        </div>
      )}

      {tab === "pedidos" && (
        <div style={styles.section}>
          <h3>Mis pedidos ({pedidos.length})</h3>
          {pedidos.length === 0 && <p style={styles.empty}>No tienes pedidos aún.</p>}
          {pedidos.map(p => (
            <div key={p.id} style={styles.pedidoCard}>
              <strong>Pedido #{p.id}</strong> — Vendedor #{p.vendedor_id} — Estado: <em>{p.estado}</em>
              <br />Total: S/. {p.total} — <small>{new Date(p.created_at).toLocaleString()}</small>
              <ul>
                {p.detalles?.map(d => (
                  <li key={d.id}>Producto #{d.producto_id} × {d.cantidad} = S/. {(d.precio_unitario * d.cantidad).toFixed(2)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {tab === "reporte" && (
        <div style={styles.section}>
          <h3>Reportar vendedor</h3>
          <form onSubmit={enviarReporte} style={styles.form}>
            <select value={reporteForm.vendedor_id}
              onChange={e => setReporteForm({ ...reporteForm, vendedor_id: e.target.value })}
              style={styles.input} required>
              <option value="">Selecciona un vendedor...</option>
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre_negocio}</option>)}
            </select>
            <input placeholder="Motivo del reporte" value={reporteForm.motivo}
              onChange={e => setReporteForm({ ...reporteForm, motivo: e.target.value })}
              style={styles.input} required />
            <textarea placeholder="Descripción detallada (opcional)" value={reporteForm.descripcion}
              onChange={e => setReporteForm({ ...reporteForm, descripcion: e.target.value })}
              style={{ ...styles.input, height: "80px" }} />
            <button type="submit" style={styles.btn}>Enviar reporte</button>
          </form>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: "1rem 1.5rem", maxWidth: "900px", margin: "0 auto" },
  flash: { background: "#c6f6d5", color: "#276749", padding: "0.6rem 1rem", borderRadius: "4px", marginBottom: "1rem" },
  tabs: { display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" },
  tab: { padding: "0.4rem 1rem", border: "1px solid #cbd5e0", background: "#edf2f7", cursor: "pointer", borderRadius: "4px" },
  tabActive: { padding: "0.4rem 1rem", border: "1px solid #3182ce", background: "#3182ce", color: "#fff", cursor: "pointer", borderRadius: "4px" },
  section: { background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem", marginTop: "1rem" },
  vendCard: { border: "1px solid #e2e8f0", padding: "1rem", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.5rem" },
  prodCard: { border: "1px solid #e2e8f0", padding: "1rem", borderRadius: "8px" },
  selloBadge: { padding: "0.2rem 0.6rem", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "bold", width: "fit-content" },
  desc: { fontSize: "0.85rem", color: "#718096", margin: 0 },
  precio: { fontWeight: "bold", color: "#2d3748", margin: "0.25rem 0" },
  contador: { display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" },
  btnCount: { width: "28px", height: "28px", border: "1px solid #cbd5e0", background: "#edf2f7", cursor: "pointer", borderRadius: "4px", fontSize: "1rem" },
  carritoBar: { marginTop: "1.5rem", padding: "1rem", background: "#ebf8ff", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  form: { display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "420px" },
  input: { padding: "0.55rem 0.75rem", border: "1px solid #cbd5e0", borderRadius: "4px", fontSize: "0.95rem" },
  btn: { padding: "0.55rem 1rem", background: "#2b6cb0", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" },
  btnSecundario: { padding: "0.4rem 0.8rem", background: "#e2e8f0", color: "#2d3748", border: "none", borderRadius: "4px", cursor: "pointer", marginBottom: "1rem" },
  btnPedido: { padding: "0.6rem 1.2rem", background: "#276749", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" },
  pedidoCard: { border: "1px solid #e2e8f0", padding: "0.75rem", borderRadius: "6px", marginBottom: "0.75rem" },
  empty: { color: "#718096" },
};
