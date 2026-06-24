import React, { useEffect, useState } from "react";
import api from "../services/api";

const SELLO = {
  verificado:    { label: "✅ Verificado",    bg: "var(--green-light)",  color: "var(--green)",   border: "#a7f3d0" },
  no_verificado: { label: "🔴 No verificado", bg: "var(--red-light)",   color: "var(--primary)", border: "#fca5a5" },
  pendiente:     { label: "⏳ En revisión",   bg: "var(--yellow-light)", color: "var(--yellow)",  border: "#fde68a" },
};

const EMOJIS_PLATO = ["🍤","🦐","🐟","🦑","🥗","🍋","🌶️","🧅"];
function emojiPlato(id) { return EMOJIS_PLATO[id % EMOJIS_PLATO.length]; }

export default function ClientePage() {
  const [tab, setTab] = useState("vendedores");
  const [vendedores, setVendedores] = useState([]);
  const [vendedorSel, setVendedorSel] = useState(null);
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState({});
  const [pedidos, setPedidos] = useState([]);
  const [msg, setMsg] = useState({ text: "", ok: true });
  const [reporteForm, setReporteForm] = useState({ vendedor_id: "", motivo: "", descripcion: "" });
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => { cargarVendedores(); cargarPedidos(); }, []);

  async function cargarVendedores() {
    try { const r = await api.get("/vendedores"); setVendedores(r.data); } catch {}
  }
  async function cargarPedidos() {
    try { const r = await api.get("/pedidos/mis-pedidos"); setPedidos(r.data); } catch {}
  }

  async function verProductos(v) {
    setVendedorSel(v); setCarrito({});
    const r = await api.get(`/productos?vendedor_id=${v.id}`);
    setProductos(r.data); setTab("productos");
  }

  function cambiarCantidad(pid, delta) {
    setCarrito(prev => {
      const n = Math.max(0, (prev[pid] || 0) + delta);
      if (n === 0) { const { [pid]: _, ...rest } = prev; return rest; }
      return { ...prev, [pid]: n };
    });
  }

  function flash(text, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg({ text: "", ok: true }), 4000); }

  async function hacerPedido() {
    const detalles = Object.entries(carrito).map(([pid, cantidad]) => ({ producto_id: +pid, cantidad }));
    if (!detalles.length) return flash("Agrega al menos un producto al carrito.", false);
    try {
      await api.post("/pedidos", { vendedor_id: vendedorSel.id, detalles });
      flash("✅ Pedido realizado con éxito");
      setCarrito({}); cargarPedidos();
    } catch (err) { flash(err.response?.data?.detail || "Error al crear pedido", false); }
  }

  async function enviarReporte(e) {
    e.preventDefault();
    try {
      await api.post("/reportes", { ...reporteForm, vendedor_id: +reporteForm.vendedor_id });
      flash("✅ Reporte enviado. Gracias por contribuir a la seguridad alimentaria.");
      setReporteForm({ vendedor_id: "", motivo: "", descripcion: "" });
    } catch (err) { flash(err.response?.data?.detail || "Error al enviar reporte", false); }
  }

  const totalCarrito = productos.filter(p => carrito[p.id])
    .reduce((a, p) => a + parseFloat(p.precio) * carrito[p.id], 0);

  const vendedoresFiltrados = vendedores.filter(v =>
    filtro === "todos" ? true : v.estado_verificacion === filtro
  );

  return (
    <div style={s.page}>
      {msg.text && <Toast text={msg.text} ok={msg.ok} />}

      {/* Hero */}
      <div style={s.hero}>
        <h1 style={s.heroTitle}>Encuentra tu cevichería de confianza 🦑</h1>
        <p style={s.heroSub}>Todos los vendedores pasan por verificación sanitaria y de licencias antes de aparecer aquí</p>
        <div style={s.stats}>
          <Stat n={vendedores.length} label="Vendedores" />
          <Stat n={vendedores.filter(v => v.estado_verificacion === "verificado").length} label="Verificados" />
          <Stat n={pedidos.length} label="Mis pedidos" />
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabBar}>
        {[["vendedores","🏪 Vendedores"],["productos","🛒 Productos"],["pedidos","📦 Mis pedidos"],["reporte","🚨 Reportar"]].map(([t, label]) => (
          <button key={t} style={tab === t ? s.tabActive : s.tab} onClick={() => setTab(t)}>{label}</button>
        ))}
      </div>

      <div style={s.content}>

        {/* ── VENDEDORES ── */}
        {tab === "vendedores" && (
          <>
            <div style={s.filtroBar}>
              {[["todos","Todos"],["verificado","✅ Verificados"],["pendiente","⏳ En revisión"],["no_verificado","🔴 No verificados"]].map(([v, l]) => (
                <button key={v} style={filtro === v ? s.filtroActive : s.filtro} onClick={() => setFiltro(v)}>{l}</button>
              ))}
            </div>
            <div style={s.grid}>
              {vendedoresFiltrados.map(v => {
                const sello = SELLO[v.estado_verificacion] || SELLO.pendiente;
                return (
                  <div key={v.id} style={s.vendCard}>
                    <div style={s.vendBanner}>
                      <span style={s.vendEmoji}>{emojiPlato(v.id)}</span>
                    </div>
                    <div style={s.vendBody}>
                      <div style={{ ...s.selloBadge, background: sello.bg, color: sello.color, border: `1px solid ${sello.border}` }}>
                        {sello.label}
                      </div>
                      <h3 style={s.vendNombre}>{v.nombre_negocio}</h3>
                      {v.descripcion && <p style={s.vendDesc}>{v.descripcion}</p>}
                      <button style={s.btnVer} onClick={() => verProductos(v)}>Ver carta →</button>
                    </div>
                  </div>
                );
              })}
              {vendedoresFiltrados.length === 0 && <EmptyState msg="No hay vendedores en esta categoría." />}
            </div>
          </>
        )}

        {/* ── PRODUCTOS ── */}
        {tab === "productos" && (
          <>
            {vendedorSel ? (
              <>
                <div style={s.vendHeader}>
                  <button style={s.backBtn} onClick={() => setTab("vendedores")}>← Volver</button>
                  <div>
                    <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.5rem" }}>{vendedorSel.nombre_negocio}</h2>
                    <div style={{ ...s.selloBadge, ...SELLO[vendedorSel.estado_verificacion], display: "inline-flex", marginTop: "0.3rem" }}>
                      {SELLO[vendedorSel.estado_verificacion]?.label}
                    </div>
                  </div>
                </div>

                {productos.length === 0
                  ? <EmptyState msg="Este vendedor aún no publicó productos." />
                  : <div style={s.grid}>
                      {productos.map(p => (
                        <div key={p.id} style={s.prodCard}>
                          <div style={s.prodEmoji}>{emojiPlato(p.id)}</div>
                          <div style={s.prodBody}>
                            <h3 style={s.prodNombre}>{p.nombre}</h3>
                            <div style={s.especiRow}>
                              <span style={s.especieBadge}>🐟 {p.especie_declarada}</span>
                              {p.especie_verificada && (
                                <span style={s.especieVerif}>🔬 Verificada: {p.especie_verificada}</span>
                              )}
                            </div>
                            {p.descripcion && <p style={s.prodDesc}>{p.descripcion}</p>}
                            <div style={s.prodFooter}>
                              <span style={s.precio}>S/. {parseFloat(p.precio).toFixed(2)}</span>
                              <div style={s.contador}>
                                <button style={s.cBtn} onClick={() => cambiarCantidad(p.id, -1)}>−</button>
                                <span style={s.cNum}>{carrito[p.id] || 0}</span>
                                <button style={s.cBtn} onClick={() => cambiarCantidad(p.id, 1)}>+</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                }

                {Object.keys(carrito).length > 0 && (
                  <div style={s.carritoBar}>
                    <div>
                      <div style={{ fontWeight: 600 }}>🛒 {Object.values(carrito).reduce((a,b)=>a+b,0)} productos</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--primary)" }}>S/. {totalCarrito.toFixed(2)}</div>
                    </div>
                    <button style={s.btnPedido} onClick={hacerPedido}>Confirmar pedido →</button>
                  </div>
                )}
              </>
            ) : <EmptyState msg="Selecciona un vendedor desde la lista." />}
          </>
        )}

        {/* ── PEDIDOS ── */}
        {tab === "pedidos" && (
          <>
            <h2 style={s.sectionTitle}>Mis pedidos</h2>
            {pedidos.length === 0
              ? <EmptyState msg="Aún no has realizado pedidos. ¡Encuentra tu cevichería ideal!" />
              : pedidos.map(p => (
                  <div key={p.id} style={s.pedidoCard}>
                    <div style={s.pedidoHeader}>
                      <span style={s.pedidoNum}>Pedido #{p.id}</span>
                      <EstadoBadge estado={p.estado} />
                    </div>
                    <div style={s.pedidoMeta}>
                      <span>🏪 Vendedor #{p.vendedor_id}</span>
                      <span>📅 {new Date(p.created_at).toLocaleString("es-PE")}</span>
                    </div>
                    <div style={s.pedidoItems}>
                      {p.detalles?.map(d => (
                        <div key={d.id} style={s.detalleRow}>
                          <span>Producto #{d.producto_id} × {d.cantidad}</span>
                          <span>S/. {(d.precio_unitario * d.cantidad).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={s.pedidoTotal}>Total: <strong>S/. {parseFloat(p.total).toFixed(2)}</strong></div>
                  </div>
                ))
            }
          </>
        )}

        {/* ── REPORTE ── */}
        {tab === "reporte" && (
          <div style={s.reporteWrap}>
            <div style={s.reporteCard}>
              <h2 style={s.sectionTitle}>🚨 Reportar un vendedor</h2>
              <p style={{ color: "var(--gray-600)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
                Tu reporte es confidencial y será revisado por un inspector sanitario. Ayuda a mantener la seguridad alimentaria en tu comunidad.
              </p>
              <form onSubmit={enviarReporte} style={s.form}>
                <div style={s.field}>
                  <label style={s.label}>Vendedor a reportar</label>
                  <select value={reporteForm.vendedor_id}
                    onChange={e => setReporteForm({ ...reporteForm, vendedor_id: e.target.value })}
                    style={s.input} required>
                    <option value="">Selecciona un vendedor...</option>
                    {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre_negocio}</option>)}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Motivo del reporte</label>
                  <input placeholder="Ej: Vendía pescado en mal estado" value={reporteForm.motivo}
                    onChange={e => setReporteForm({ ...reporteForm, motivo: e.target.value })}
                    style={s.input} required />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Descripción detallada (opcional)</label>
                  <textarea placeholder="Describe con detalle lo que observaste..." value={reporteForm.descripcion}
                    onChange={e => setReporteForm({ ...reporteForm, descripcion: e.target.value })}
                    style={{ ...s.input, height: "100px", resize: "vertical" }} />
                </div>
                <button type="submit" style={s.btnReporte}>Enviar reporte</button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <div style={{ textAlign: "center", background: "rgba(255,255,255,0.15)", padding: "0.75rem 1.5rem", borderRadius: "10px" }}>
      <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#fff" }}>{n}</div>
      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.8)" }}>{label}</div>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const map = { pendiente: ["#fef3c7","#92400e"], confirmado: ["#dbeafe","#1e40af"], entregado: ["#d1fae5","#065f46"], cancelado: ["#fee2e2","#991b1b"] };
  const [bg, color] = map[estado] || ["#f3f4f6","#374151"];
  return <span style={{ background: bg, color, padding: "0.2rem 0.8rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600 }}>{estado}</span>;
}

function EmptyState({ msg }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem", color: "var(--gray-400)" }}>
      <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🍽️</div>
      <p>{msg}</p>
    </div>
  );
}

function Toast({ text, ok }) {
  return (
    <div style={{ position: "fixed", top: "80px", right: "1.5rem", zIndex: 999, background: ok ? "#065f46" : "#991b1b", color: "#fff", padding: "0.75rem 1.25rem", borderRadius: "10px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", fontSize: "0.9rem", maxWidth: "340px" }}>
      {text}
    </div>
  );
}

const s = {
  page: { minHeight: "100vh" },
  hero: { background: "linear-gradient(135deg, #c0392b 0%, #7b241c 100%)", color: "#fff", padding: "2.5rem 2rem", textAlign: "center" },
  heroTitle: { fontSize: "1.8rem", marginBottom: "0.5rem" },
  heroSub: { opacity: 0.85, fontSize: "0.95rem", marginBottom: "1.5rem", maxWidth: "500px", margin: "0 auto 1.5rem" },
  stats: { display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" },
  tabBar: { display: "flex", gap: "0", background: "#fff", borderBottom: "1px solid var(--gray-200)", paddingLeft: "1.5rem", overflowX: "auto" },
  tab: { padding: "0.85rem 1.25rem", border: "none", background: "none", color: "var(--gray-600)", fontWeight: 500, fontSize: "0.9rem", borderBottom: "2px solid transparent", whiteSpace: "nowrap" },
  tabActive: { padding: "0.85rem 1.25rem", border: "none", background: "none", color: "var(--primary)", fontWeight: 600, fontSize: "0.9rem", borderBottom: "2px solid var(--primary)", whiteSpace: "nowrap" },
  content: { maxWidth: "1000px", margin: "0 auto", padding: "1.5rem" },
  filtroBar: { display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" },
  filtro: { padding: "0.35rem 0.9rem", border: "1px solid var(--gray-200)", borderRadius: "20px", background: "#fff", fontSize: "0.85rem", color: "var(--gray-600)" },
  filtroActive: { padding: "0.35rem 0.9rem", border: "1px solid var(--primary)", borderRadius: "20px", background: "var(--primary-light)", fontSize: "0.85rem", color: "var(--primary)", fontWeight: 600 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.25rem" },
  vendCard: { background: "#fff", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", overflow: "hidden", transition: "box-shadow 0.2s", border: "1px solid var(--gray-200)" },
  vendBanner: { height: "90px", background: "linear-gradient(135deg, #fff5f5, #ffe4e1)", display: "flex", alignItems: "center", justifyContent: "center" },
  vendEmoji: { fontSize: "3rem" },
  vendBody: { padding: "1rem" },
  selloBadge: { display: "inline-block", padding: "0.2rem 0.7rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem" },
  vendNombre: { fontFamily: "'Playfair Display',serif", fontSize: "1.05rem", marginBottom: "0.4rem", color: "var(--gray-800)" },
  vendDesc: { fontSize: "0.82rem", color: "var(--gray-400)", marginBottom: "0.75rem", lineHeight: 1.4 },
  btnVer: { width: "100%", padding: "0.55rem", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "0.9rem" },
  vendHeader: { display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.5rem" },
  backBtn: { padding: "0.4rem 0.9rem", background: "var(--gray-100)", border: "none", borderRadius: "8px", color: "var(--gray-600)", fontWeight: 500, whiteSpace: "nowrap" },
  prodCard: { background: "#fff", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", overflow: "hidden", border: "1px solid var(--gray-200)", display: "flex", flexDirection: "column" },
  prodEmoji: { fontSize: "2.5rem", textAlign: "center", padding: "1rem", background: "linear-gradient(135deg, #fff9f0, #fef3e2)" },
  prodBody: { padding: "1rem" },
  prodNombre: { fontFamily: "'Playfair Display',serif", fontSize: "1rem", marginBottom: "0.5rem" },
  especiRow: { display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.5rem" },
  especieBadge: { background: "var(--accent-light)", color: "#7c4a00", padding: "0.15rem 0.6rem", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 500 },
  especieVerif: { background: "var(--green-light)", color: "var(--green)", padding: "0.15rem 0.6rem", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 500 },
  prodDesc: { fontSize: "0.82rem", color: "var(--gray-400)", marginBottom: "0.5rem" },
  prodFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem" },
  precio: { fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)" },
  contador: { display: "flex", alignItems: "center", gap: "0.5rem" },
  cBtn: { width: "28px", height: "28px", borderRadius: "50%", border: "1.5px solid var(--gray-200)", background: "#fff", fontWeight: 700, fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" },
  cNum: { fontSize: "1rem", fontWeight: 600, minWidth: "20px", textAlign: "center" },
  carritoBar: { position: "sticky", bottom: "1rem", background: "#fff", border: "1px solid var(--gray-200)", borderRadius: "var(--radius)", padding: "1rem 1.5rem", marginTop: "1.5rem", boxShadow: "var(--shadow-lg)", display: "flex", justifyContent: "space-between", alignItems: "center" },
  btnPedido: { background: "var(--green)", color: "#fff", border: "none", borderRadius: "8px", padding: "0.7rem 1.5rem", fontWeight: 700, fontSize: "1rem" },
  sectionTitle: { fontFamily: "'Playfair Display',serif", fontSize: "1.4rem", marginBottom: "1.25rem" },
  pedidoCard: { background: "#fff", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", padding: "1.25rem", marginBottom: "1rem", border: "1px solid var(--gray-200)" },
  pedidoHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" },
  pedidoNum: { fontWeight: 700, fontSize: "1rem" },
  pedidoMeta: { display: "flex", gap: "1.5rem", color: "var(--gray-400)", fontSize: "0.82rem", marginBottom: "0.75rem" },
  pedidoItems: { borderTop: "1px solid var(--gray-200)", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.3rem" },
  detalleRow: { display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "var(--gray-600)" },
  pedidoTotal: { marginTop: "0.75rem", textAlign: "right", fontSize: "0.9rem" },
  reporteWrap: { display: "flex", justifyContent: "center" },
  reporteCard: { background: "#fff", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", padding: "2rem", maxWidth: "500px", width: "100%", border: "1px solid var(--gray-200)" },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  field: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  label: { fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-600)" },
  input: { padding: "0.65rem 0.85rem", border: "1.5px solid var(--gray-200)", borderRadius: "8px", fontSize: "0.95rem" },
  btnReporte: { padding: "0.75rem", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "0.95rem" },
};
