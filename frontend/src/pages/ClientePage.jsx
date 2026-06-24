import React, { useEffect, useState } from "react";
import api from "../services/api";

const SELLO = {
  verificado:    { label:"✅ Verificado",    bg:"var(--green-light)", color:"var(--green)",   border:"#a7f3d0" },
  no_verificado: { label:"🔴 No verificado", bg:"var(--red-light)",   color:"var(--primary)", border:"#fca5a5" },
  pendiente:     { label:"⏳ En revisión",   bg:"var(--yellow-light)",color:"#92400e",         border:"#fde68a" },
};

const MOTIVOS_REPORTE = [
  "Pescado en mal estado o con mal olor",
  "No respeta la especie declarada",
  "Sin licencia municipal visible",
  "Sin certificado sanitario",
  "Manipulación antihigiénica del alimento",
  "Engaño en precios o cantidades",
  "Otro motivo",
];

const EMOJIS = ["🦑","🐟","🦐","🍋","🌶️","🥗","🍤","🧅"];

export default function ClientePage() {
  const [tab, setTab] = useState("vendedores");
  const [vendedores, setVendedores] = useState([]);
  const [vendedorSel, setVendedorSel] = useState(null);
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState({});          // { productoId: cantidad }
  const [checkout, setCheckout] = useState(null);       // null | "form" | "confirmado"
  const [checkoutData, setCheckoutData] = useState({ direccion:"", telefono:"", notas:"", metodoPago:"efectivo" });
  const [pedidoConfirmado, setPedidoConfirmado] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [msg, setMsg] = useState({ text:"", ok:true });
  const [reporteForm, setReporteForm] = useState({ vendedor_id:"", motivo:"", motivo_libre:"", descripcion:"", urgente:false });
  const [loadingPedido, setLoadingPedido] = useState(false);

  useEffect(() => { cargarVendedores(); cargarPedidos(); cargarPerfilCliente(); }, []);

  async function cargarVendedores() {
    try { const r = await api.get("/vendedores"); setVendedores(r.data); } catch {}
  }
  async function cargarPedidos() {
    try { const r = await api.get("/pedidos/mis-pedidos"); setPedidos(r.data); } catch {}
  }
  async function cargarPerfilCliente() {
    try { const r = await api.get("/clientes/mi-perfil"); setCheckoutData(prev => ({ ...prev, direccion: r.data.direccion || "", telefono: r.data.telefono || "" })); } catch {}
  }

  async function abrirVendedor(v) {
    setVendedorSel(v); setCarrito({});
    const r = await api.get(`/productos?vendedor_id=${v.id}`);
    setProductos(r.data); setTab("productos");
  }

  function cambiarCantidad(pid, delta) {
    setCarrito(prev => {
      const n = Math.max(0, (prev[pid]||0) + delta);
      if (n===0) { const {[pid]:_,...r}=prev; return r; }
      return {...prev,[pid]:n};
    });
  }

  function flash(text, ok=true) { setMsg({text,ok}); setTimeout(()=>setMsg({text:"",ok:true}),4000); }

  const itemsCarrito = productos.filter(p=>carrito[p.id]);
  const totalCarrito = itemsCarrito.reduce((a,p)=>a+parseFloat(p.precio)*carrito[p.id],0);
  const cantidadTotal = Object.values(carrito).reduce((a,b)=>a+b,0);

  function abrirCheckout() {
    if (!itemsCarrito.length) return flash("Agrega al menos un producto al carrito.", false);
    setCheckout("form");
  }

  async function confirmarPedido(e) {
    e.preventDefault();
    if (!checkoutData.direccion.trim()) return flash("La dirección de entrega es obligatoria.", false);
    setLoadingPedido(true);
    const detalles = itemsCarrito.map(p=>({ producto_id:p.id, cantidad:carrito[p.id] }));
    try {
      const r = await api.post("/pedidos", { vendedor_id: vendedorSel.id, detalles });
      setPedidoConfirmado(r.data);
      setCheckout("confirmado");
      setCarrito({});
      cargarPedidos();
    } catch(err) { flash(err.response?.data?.detail||"Error al crear pedido", false); }
    finally { setLoadingPedido(false); }
  }

  function nuevoCarrito() { setCheckout(null); setPedidoConfirmado(null); setTab("vendedores"); }

  async function enviarReporte(e) {
    e.preventDefault();
    const motivo = reporteForm.motivo === "Otro motivo" ? reporteForm.motivo_libre : reporteForm.motivo;
    if (!motivo.trim()) return flash("Selecciona o escribe el motivo del reporte.", false);
    try {
      await api.post("/reportes", { vendedor_id:+reporteForm.vendedor_id, motivo, descripcion:reporteForm.descripcion||null });
      flash("✅ Reporte enviado. Un inspector lo revisará a la brevedad. Gracias por ayudar a la comunidad.");
      setReporteForm({ vendedor_id:"", motivo:"", motivo_libre:"", descripcion:"", urgente:false });
    } catch(err) { flash(err.response?.data?.detail||"Error al enviar reporte", false); }
  }

  const vendedoresFiltrados = vendedores.filter(v => filtro==="todos" || v.estado_verificacion===filtro);

  // ── CHECKOUT OVERLAY ──────────────────────────────────────────────────
  if (checkout === "form") {
    return (
      <div style={s.page}>
        <div style={s.checkoutWrap}>
          <div style={s.checkoutCard}>
            <div style={s.checkoutHeader}>
              <button onClick={()=>setCheckout(null)} style={s.backBtn}>← Volver al carrito</button>
              <h2 style={s.checkoutTitle}>🛒 Confirmar pedido</h2>
            </div>

            <div style={s.checkoutGrid}>
              {/* Resumen del pedido */}
              <div>
                <h3 style={s.miniTitle}>Tu pedido en: {vendedorSel?.nombre_negocio}</h3>
                <div style={s.resumenBox}>
                  {itemsCarrito.map(p => (
                    <div key={p.id} style={s.resumenRow}>
                      <div>
                        <div style={{ fontWeight:600,fontSize:"0.9rem" }}>{p.nombre}</div>
                        <div style={{ fontSize:"0.75rem",color:"var(--gray-400)" }}>🐟 {p.especie_declarada} · S/. {parseFloat(p.precio).toFixed(2)} c/u</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontWeight:600 }}>× {carrito[p.id]}</div>
                        <div style={{ color:"var(--primary)",fontWeight:700 }}>S/. {(parseFloat(p.precio)*carrito[p.id]).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                  <div style={s.totalRow}>
                    <span>Total a pagar</span>
                    <span style={{ fontSize:"1.3rem",fontWeight:800,color:"var(--primary)" }}>S/. {totalCarrito.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Formulario de entrega */}
              <form onSubmit={confirmarPedido} style={s.entregaForm}>
                <h3 style={s.miniTitle}>Datos de entrega</h3>

                <Field label="📍 Dirección de entrega *">
                  <input value={checkoutData.direccion} onChange={e=>setCheckoutData({...checkoutData,direccion:e.target.value})} style={s.input} placeholder="Ej: Av. Larco 123, Miraflores, Lima" required />
                </Field>
                <Field label="📞 Teléfono de contacto *">
                  <input value={checkoutData.telefono} onChange={e=>setCheckoutData({...checkoutData,telefono:e.target.value})} style={s.input} placeholder="Ej: 987 654 321" />
                </Field>
                <Field label="📝 Notas para el vendedor (opcional)">
                  <textarea value={checkoutData.notas} onChange={e=>setCheckoutData({...checkoutData,notas:e.target.value})} style={{...s.input,height:"65px",resize:"vertical"}} placeholder="Sin picante, extra limón, sin cebolla..." />
                </Field>

                <Field label="💳 Método de pago">
                  <div style={s.pagoGrid}>
                    {[["efectivo","💵 Efectivo"],["yape","📱 Yape"],["plin","📱 Plin"],["tarjeta","💳 Tarjeta"]].map(([v,l])=>(
                      <label key={v} style={{...s.pagoOpt, ...(checkoutData.metodoPago===v?s.pagoOptActive:{})}}>
                        <input type="radio" name="pago" value={v} checked={checkoutData.metodoPago===v} onChange={()=>setCheckoutData({...checkoutData,metodoPago:v})} style={{display:"none"}} />
                        {l}
                      </label>
                    ))}
                  </div>
                </Field>

                {msg.text && <div style={{...s.alert,background:msg.ok?"#d1fae5":"#fee2e2",color:msg.ok?"#065f46":"#991b1b"}}>{msg.text}</div>}

                <button type="submit" style={s.btnConfirmar} disabled={loadingPedido}>
                  {loadingPedido ? "Procesando..." : `✅ Confirmar pedido · S/. ${totalCarrito.toFixed(2)}`}
                </button>
                <p style={{ fontSize:"0.75rem",color:"var(--gray-400)",textAlign:"center" }}>El vendedor recibirá tu pedido y se contactará contigo para coordinar la entrega.</p>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── CONFIRMACIÓN ─────────────────────────────────────────────────────
  if (checkout === "confirmado" && pedidoConfirmado) {
    return (
      <div style={s.page}>
        <div style={s.confirWrap}>
          <div style={s.confirCard}>
            <div style={s.confirIcon}>🎉</div>
            <h2 style={s.confirTitle}>¡Pedido confirmado!</h2>
            <p style={{ color:"var(--gray-600)",marginBottom:"1.5rem",textAlign:"center" }}>Tu pedido fue enviado al vendedor. Te contactarán pronto para coordinar la entrega.</p>

            <div style={s.confirBox}>
              <div style={s.confirRow}><span>Número de pedido</span><strong>#{pedidoConfirmado.id}</strong></div>
              <div style={s.confirRow}><span>Vendedor</span><strong>{vendedorSel?.nombre_negocio}</strong></div>
              <div style={s.confirRow}><span>Pago</span><strong>{checkoutData.metodoPago}</strong></div>
              <div style={s.confirRow}><span>Dirección</span><strong>{checkoutData.direccion}</strong></div>
              <div style={{ ...s.confirRow, borderBottom:"none" }}><span>Total</span><strong style={{ color:"var(--primary)",fontSize:"1.2rem" }}>S/. {parseFloat(pedidoConfirmado.total).toFixed(2)}</strong></div>
            </div>

            <div style={{ display:"flex",gap:"0.75rem",marginTop:"1.5rem" }}>
              <button onClick={()=>setTab("pedidos")||nuevoCarrito()} style={s.btnSecundario}>Ver mis pedidos</button>
              <button onClick={nuevoCarrito} style={s.btnConfirmar}>Seguir comprando →</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── VISTA PRINCIPAL ───────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {msg.text && <Toast text={msg.text} ok={msg.ok} />}

      <div style={s.hero}>
        <h1 style={s.heroTitle}>Encuentra tu cevichería de confianza 🦑</h1>
        <p style={s.heroSub}>Vendedores verificados por inspectores sanitarios. Especie de pescado certificada.</p>
        <div style={s.heroStats}>
          <Stat n={vendedores.length} label="Vendedores" icon="🏪" />
          <Stat n={vendedores.filter(v=>v.estado_verificacion==="verificado").length} label="Verificados" icon="✅" />
          <Stat n={pedidos.length} label="Mis pedidos" icon="📦" />
        </div>
      </div>

      <div style={s.tabBar}>
        {[["vendedores","🏪 Vendedores"],["productos","🛒 Productos"],["pedidos","📦 Mis pedidos"],["reporte","🚨 Reportar"]].map(([t,l])=>(
          <button key={t} style={tab===t?s.tabActive:s.tab} onClick={()=>setTab(t)}>
            {l}
            {t==="pedidos"&&pedidos.length>0&&<span style={s.tabBadge}>{pedidos.length}</span>}
          </button>
        ))}
      </div>

      <div style={s.content}>

        {/* ── VENDEDORES ── */}
        {tab==="vendedores" && (
          <>
            <div style={s.filtroBar}>
              {[["todos","Todos"],["verificado","✅ Verificados"],["pendiente","⏳ En revisión"],["no_verificado","🔴 No verificados"]].map(([v,l])=>(
                <button key={v} style={filtro===v?s.filtroActive:s.filtro} onClick={()=>setFiltro(v)}>{l}</button>
              ))}
              <span style={{ marginLeft:"auto",fontSize:"0.82rem",color:"var(--gray-400)",alignSelf:"center" }}>{vendedoresFiltrados.length} vendedores</span>
            </div>
            <div style={s.vendGrid}>
              {vendedoresFiltrados.map(v=>{
                const sello = SELLO[v.estado_verificacion]||SELLO.pendiente;
                return (
                  <div key={v.id} style={s.vendCard}>
                    <div style={s.vendBanner}>
                      <span style={{ fontSize:"3rem" }}>{EMOJIS[v.id%EMOJIS.length]}</span>
                    </div>
                    <div style={s.vendBody}>
                      <span style={{...s.selloPill,background:sello.bg,color:sello.color,border:`1px solid ${sello.border}`}}>{sello.label}</span>
                      <h3 style={s.vendNombre}>{v.nombre_negocio}</h3>
                      {v.descripcion&&<p style={s.vendDesc}>{v.descripcion}</p>}
                      <button style={s.btnVerCarta} onClick={()=>abrirVendedor(v)}>Ver carta →</button>
                    </div>
                  </div>
                );
              })}
              {vendedoresFiltrados.length===0&&<div style={s.emptyState}><div style={{fontSize:"3rem"}}>🔍</div><p>No hay vendedores en esta categoría</p></div>}
            </div>
          </>
        )}

        {/* ── PRODUCTOS + CARRITO ── */}
        {tab==="productos" && (
          <>
            {vendedorSel ? (
              <>
                <div style={s.prodHeader}>
                  <button onClick={()=>setTab("vendedores")} style={s.backBtn}>← Volver</button>
                  <div>
                    <h2 style={s.prodTitulo}>{vendedorSel.nombre_negocio}</h2>
                    <span style={{...s.selloPill,...SELLO[vendedorSel.estado_verificacion]}}>{SELLO[vendedorSel.estado_verificacion]?.label}</span>
                  </div>
                </div>

                {productos.length===0
                  ? <div style={s.emptyState}><div style={{fontSize:"3rem"}}>🍽️</div><p>Este vendedor aún no publicó productos.</p></div>
                  : <div style={s.prodLayout}>
                      <div style={s.prodGrid}>
                        {productos.map(p=>(
                          <div key={p.id} style={s.prodCard}>
                            <div style={s.prodEmoji}>{EMOJIS[p.id%EMOJIS.length]}</div>
                            <div style={s.prodInfo}>
                              <h4 style={s.prodNombre}>{p.nombre}</h4>
                              <div style={s.especieRow}>
                                <span style={s.especieBadge}>🐟 {p.especie_declarada}</span>
                                {p.especie_verificada&&<span style={s.verificBadge}>🔬 {p.especie_verificada}</span>}
                              </div>
                              {p.descripcion&&<p style={s.prodDesc}>{p.descripcion}</p>}
                              <div style={s.prodFooter}>
                                <span style={s.prodPrecio}>S/. {parseFloat(p.precio).toFixed(2)}</span>
                                <div style={s.contador}>
                                  <button style={s.cBtn} onClick={()=>cambiarCantidad(p.id,-1)}>−</button>
                                  <span style={s.cNum}>{carrito[p.id]||0}</span>
                                  <button style={s.cBtn} onClick={()=>cambiarCantidad(p.id,1)}>+</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Mini carrito lateral */}
                      <div style={s.carritoSide}>
                        <h3 style={s.miniTitle}>🛒 Mi carrito</h3>
                        {cantidadTotal===0
                          ? <p style={{ color:"var(--gray-400)",fontSize:"0.85rem",textAlign:"center",padding:"1.5rem 0" }}>Agrega productos para iniciar tu pedido</p>
                          : <>
                              {itemsCarrito.map(p=>(
                                <div key={p.id} style={s.carritoItem}>
                                  <div style={{ flex:1 }}>
                                    <div style={{ fontSize:"0.85rem",fontWeight:600 }}>{p.nombre}</div>
                                    <div style={{ fontSize:"0.75rem",color:"var(--gray-400)" }}>S/. {parseFloat(p.precio).toFixed(2)} c/u</div>
                                  </div>
                                  <div style={{ display:"flex",alignItems:"center",gap:"0.4rem" }}>
                                    <button style={s.cBtnSm} onClick={()=>cambiarCantidad(p.id,-1)}>−</button>
                                    <span style={{ fontSize:"0.88rem",fontWeight:600,minWidth:"20px",textAlign:"center" }}>{carrito[p.id]}</span>
                                    <button style={s.cBtnSm} onClick={()=>cambiarCantidad(p.id,1)}>+</button>
                                  </div>
                                  <div style={{ fontWeight:700,color:"var(--primary)",fontSize:"0.88rem",minWidth:"60px",textAlign:"right" }}>S/. {(parseFloat(p.precio)*carrito[p.id]).toFixed(2)}</div>
                                </div>
                              ))}
                              <div style={s.carritoTotal}>
                                <span>Total ({cantidadTotal} items)</span>
                                <strong style={{ color:"var(--primary)",fontSize:"1.1rem" }}>S/. {totalCarrito.toFixed(2)}</strong>
                              </div>
                              <button style={s.btnPedir} onClick={abrirCheckout}>Proceder al pago →</button>
                            </>
                        }
                      </div>
                    </div>
                }
              </>
            ) : (
              <div style={s.emptyState}><div style={{fontSize:"3rem"}}>🏪</div><p>Selecciona un vendedor para ver su carta</p></div>
            )}
          </>
        )}

        {/* ── MIS PEDIDOS ── */}
        {tab==="pedidos" && (
          <>
            <h2 style={s.secTitle}>Mis pedidos ({pedidos.length})</h2>
            {pedidos.length===0
              ? <div style={s.emptyState}><div style={{fontSize:"3rem"}}>📦</div><p>Aún no realizaste pedidos. ¡Encuentra tu cevichería ideal y ordena!</p></div>
              : pedidos.map(p=>(
                  <div key={p.id} style={s.pedidoCard}>
                    <div style={s.pedidoTop}>
                      <div>
                        <span style={{ fontWeight:700 }}>Pedido #{p.id}</span>
                        <span style={{ fontSize:"0.8rem",color:"var(--gray-400)",marginLeft:"0.75rem" }}>{new Date(p.created_at).toLocaleString("es-PE")}</span>
                      </div>
                      <EstadoBadge estado={p.estado} />
                    </div>
                    <div style={{ fontSize:"0.82rem",color:"var(--gray-500)",marginBottom:"0.75rem" }}>🏪 Vendedor #{p.vendedor_id}</div>
                    <div style={s.pedidoItems}>
                      {p.detalles?.map(d=>(
                        <div key={d.id} style={s.pedidoDetRow}>
                          <span>Producto #{d.producto_id} × {d.cantidad}</span>
                          <span>S/. {(d.precio_unitario*d.cantidad).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={s.pedidoFooter}>
                      <span style={{ fontSize:"0.82rem",color:"var(--gray-400)" }}>Pago: {p.estado !== "cancelado" ? "Pendiente de entrega" : "—"}</span>
                      <strong style={{ color:"var(--primary)",fontSize:"1.05rem" }}>Total: S/. {parseFloat(p.total).toFixed(2)}</strong>
                    </div>
                  </div>
                ))
            }
          </>
        )}

        {/* ── REPORTE ── */}
        {tab==="reporte" && (
          <div style={s.reporteWrap}>
            <div style={s.reporteCard}>
              <div style={s.reporteIcono}>🚨</div>
              <h2 style={s.secTitle}>Reportar un vendedor</h2>
              <p style={{ color:"var(--gray-600)",fontSize:"0.88rem",marginBottom:"1.5rem",lineHeight:1.6 }}>
                Tu reporte es <strong>confidencial</strong> y será atendido por un inspector sanitario certificado. Ayudas a proteger la salud de toda la comunidad.
              </p>

              <form onSubmit={enviarReporte} style={s.form}>
                <Field label="¿A qué vendedor reportas? *">
                  <select value={reporteForm.vendedor_id} onChange={e=>setReporteForm({...reporteForm,vendedor_id:e.target.value})} style={s.input} required>
                    <option value="">Selecciona un vendedor...</option>
                    {vendedores.map(v=><option key={v.id} value={v.id}>{v.nombre_negocio} ({v.estado_verificacion})</option>)}
                  </select>
                </Field>

                <Field label="¿Cuál es el motivo del reporte? *">
                  <select value={reporteForm.motivo} onChange={e=>setReporteForm({...reporteForm,motivo:e.target.value})} style={s.input} required>
                    <option value="">Selecciona el motivo...</option>
                    {MOTIVOS_REPORTE.map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>

                {reporteForm.motivo==="Otro motivo" && (
                  <Field label="Describe el motivo *">
                    <input value={reporteForm.motivo_libre} onChange={e=>setReporteForm({...reporteForm,motivo_libre:e.target.value})} style={s.input} placeholder="Describe brevemente el motivo" required />
                  </Field>
                )}

                <Field label="Descripción detallada (recomendado)">
                  <textarea value={reporteForm.descripcion} onChange={e=>setReporteForm({...reporteForm,descripcion:e.target.value})} style={{...s.input,height:"100px",resize:"vertical"}} placeholder="Describe con el mayor detalle posible lo que observaste: fecha, hora, lugar, lo que viste o probaste. Cuanta más información, más fácil es para el inspector actuar." />
                </Field>

                <div style={s.aviso}>
                  <span>⚠️</span>
                  <p style={{ margin:0,fontSize:"0.78rem",color:"#92400e" }}>Los reportes falsos o maliciosos pueden tener consecuencias. Por favor reporta solo situaciones reales que hayas observado personalmente.</p>
                </div>

                {msg.text&&<div style={{...s.alert,background:msg.ok?"#d1fae5":"#fee2e2",color:msg.ok?"#065f46":"#991b1b"}}>{msg.text}</div>}

                <button type="submit" style={s.btnReporte}>Enviar reporte</button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function Field({ label, children }) {
  return <div style={{ display:"flex",flexDirection:"column",gap:"0.35rem" }}><label style={{fontSize:"0.82rem",fontWeight:600,color:"var(--gray-600)"}}>{label}</label>{children}</div>;
}

function Stat({ n, icon, label }) {
  return (
    <div style={{ textAlign:"center",background:"rgba(255,255,255,0.15)",padding:"0.75rem 1.5rem",borderRadius:"10px",minWidth:"90px" }}>
      <div style={{ fontSize:"1.3rem" }}>{icon}</div>
      <div style={{ fontSize:"1.6rem",fontWeight:700,color:"#fff",lineHeight:1 }}>{n}</div>
      <div style={{ fontSize:"0.72rem",color:"rgba(255,255,255,0.8)" }}>{label}</div>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const m = { pendiente:["#fef3c7","#92400e"], confirmado:["#dbeafe","#1e40af"], entregado:["#d1fae5","#065f46"], cancelado:["#fee2e2","#991b1b"] };
  const [bg,color]=m[estado]||["#f3f4f6","#374151"];
  return <span style={{background:bg,color,padding:"0.2rem 0.75rem",borderRadius:"20px",fontSize:"0.78rem",fontWeight:600}}>{estado}</span>;
}

function Toast({ text, ok }) {
  return <div style={{ position:"fixed",top:"72px",right:"1.5rem",zIndex:999,background:ok?"#065f46":"#991b1b",color:"#fff",padding:"0.75rem 1.25rem",borderRadius:"10px",boxShadow:"0 4px 16px rgba(0,0,0,0.2)",fontSize:"0.88rem",maxWidth:"340px",lineHeight:1.5 }}>{text}</div>;
}

const s = {
  page: { minHeight:"100vh",background:"var(--gray-50)" },
  hero: { background:"linear-gradient(135deg,#c0392b,#7b241c)",color:"#fff",padding:"2.5rem 2rem",textAlign:"center" },
  heroTitle: { fontSize:"1.8rem",marginBottom:"0.5rem" },
  heroSub: { fontSize:"0.9rem",opacity:.85,marginBottom:"1.5rem",maxWidth:"500px",margin:"0 auto 1.5rem" },
  heroStats: { display:"flex",justifyContent:"center",gap:"1rem",flexWrap:"wrap" },
  tabBar: { display:"flex",background:"#fff",borderBottom:"1px solid var(--gray-200)",paddingLeft:"1.5rem",overflowX:"auto" },
  tab: { padding:"0.85rem 1.15rem",border:"none",background:"none",color:"var(--gray-600)",fontWeight:500,fontSize:"0.88rem",borderBottom:"2px solid transparent",whiteSpace:"nowrap" },
  tabActive: { padding:"0.85rem 1.15rem",border:"none",background:"none",color:"var(--primary)",fontWeight:600,fontSize:"0.88rem",borderBottom:"2px solid var(--primary)",whiteSpace:"nowrap" },
  tabBadge: { background:"var(--primary)",color:"#fff",borderRadius:"10px",padding:"0 5px",fontSize:"0.68rem",marginLeft:"4px" },
  content: { maxWidth:"1050px",margin:"0 auto",padding:"1.5rem" },
  filtroBar: { display:"flex",gap:"0.5rem",marginBottom:"1.25rem",flexWrap:"wrap",alignItems:"center" },
  filtro: { padding:"0.35rem 0.9rem",border:"1px solid var(--gray-200)",borderRadius:"20px",background:"#fff",fontSize:"0.82rem",color:"var(--gray-600)" },
  filtroActive: { padding:"0.35rem 0.9rem",border:"1px solid var(--primary)",borderRadius:"20px",background:"var(--primary-light)",fontSize:"0.82rem",color:"var(--primary)",fontWeight:600 },
  vendGrid: { display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:"1.25rem" },
  vendCard: { background:"#fff",borderRadius:"var(--radius)",boxShadow:"var(--shadow-sm)",overflow:"hidden",border:"1px solid var(--gray-200)" },
  vendBanner: { height:"85px",background:"linear-gradient(135deg,#fff5f5,#ffe4e1)",display:"flex",alignItems:"center",justifyContent:"center" },
  vendBody: { padding:"1rem" },
  selloPill: { display:"inline-block",padding:"0.2rem 0.65rem",borderRadius:"20px",fontSize:"0.73rem",fontWeight:600,marginBottom:"0.5rem" },
  vendNombre: { fontFamily:"'Playfair Display',serif",fontSize:"1rem",marginBottom:"0.35rem" },
  vendDesc: { fontSize:"0.8rem",color:"var(--gray-400)",marginBottom:"0.75rem",lineHeight:1.4 },
  btnVerCarta: { width:"100%",padding:"0.5rem",background:"var(--primary)",color:"#fff",border:"none",borderRadius:"8px",fontWeight:600,fontSize:"0.88rem" },
  prodHeader: { display:"flex",alignItems:"flex-start",gap:"1rem",marginBottom:"1.5rem" },
  backBtn: { padding:"0.4rem 0.9rem",background:"var(--gray-100)",border:"none",borderRadius:"8px",color:"var(--gray-600)",fontSize:"0.85rem",fontWeight:500,whiteSpace:"nowrap" },
  prodTitulo: { fontFamily:"'Playfair Display',serif",fontSize:"1.4rem",marginBottom:"0.3rem" },
  prodLayout: { display:"grid",gridTemplateColumns:"1fr 320px",gap:"1.5rem",alignItems:"start" },
  prodGrid: { display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"1rem" },
  prodCard: { background:"#fff",borderRadius:"var(--radius)",boxShadow:"var(--shadow-sm)",overflow:"hidden",border:"1px solid var(--gray-200)" },
  prodEmoji: { fontSize:"2.5rem",textAlign:"center",padding:"1rem",background:"linear-gradient(135deg,#fff9f0,#fef3e2)" },
  prodInfo: { padding:"0.9rem" },
  prodNombre: { fontFamily:"'Playfair Display',serif",fontSize:"0.95rem",marginBottom:"0.4rem" },
  especieRow: { display:"flex",gap:"0.35rem",flexWrap:"wrap",marginBottom:"0.4rem" },
  especieBadge: { background:"var(--accent-light)",color:"#7c4a00",padding:"0.1rem 0.5rem",borderRadius:"10px",fontSize:"0.7rem",fontWeight:500 },
  verificBadge: { background:"var(--green-light)",color:"var(--green)",padding:"0.1rem 0.5rem",borderRadius:"10px",fontSize:"0.7rem",fontWeight:500 },
  prodDesc: { fontSize:"0.78rem",color:"var(--gray-400)",marginBottom:"0.4rem",lineHeight:1.4 },
  prodFooter: { display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"0.6rem" },
  prodPrecio: { fontSize:"1.05rem",fontWeight:700,color:"var(--primary)" },
  contador: { display:"flex",alignItems:"center",gap:"0.4rem" },
  cBtn: { width:"28px",height:"28px",borderRadius:"50%",border:"1.5px solid var(--gray-200)",background:"#fff",fontWeight:700,fontSize:"1rem" },
  cNum: { fontSize:"0.95rem",fontWeight:700,minWidth:"22px",textAlign:"center" },
  carritoSide: { background:"#fff",borderRadius:"var(--radius)",padding:"1.25rem",boxShadow:"var(--shadow-md)",border:"1px solid var(--gray-200)",position:"sticky",top:"80px" },
  miniTitle: { fontFamily:"'Playfair Display',serif",fontSize:"1rem",marginBottom:"1rem",paddingBottom:"0.6rem",borderBottom:"1px solid var(--gray-200)" },
  carritoItem: { display:"flex",alignItems:"center",gap:"0.6rem",padding:"0.5rem 0",borderBottom:"1px solid var(--gray-100)" },
  cBtnSm: { width:"22px",height:"22px",borderRadius:"50%",border:"1px solid var(--gray-200)",background:"var(--gray-50)",fontWeight:700,fontSize:"0.85rem" },
  carritoTotal: { display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.75rem 0",marginTop:"0.25rem",borderTop:"1px solid var(--gray-200)" },
  btnPedir: { width:"100%",padding:"0.75rem",background:"var(--green)",color:"#fff",border:"none",borderRadius:"8px",fontWeight:700,fontSize:"0.95rem",marginTop:"0.5rem" },
  secTitle: { fontFamily:"'Playfair Display',serif",fontSize:"1.3rem",marginBottom:"1.25rem" },
  pedidoCard: { background:"#fff",borderRadius:"var(--radius)",padding:"1.25rem",marginBottom:"0.75rem",boxShadow:"var(--shadow-sm)",border:"1px solid var(--gray-200)" },
  pedidoTop: { display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.4rem" },
  pedidoItems: { borderTop:"1px solid var(--gray-100)",paddingTop:"0.6rem",display:"flex",flexDirection:"column",gap:"0.25rem" },
  pedidoDetRow: { display:"flex",justifyContent:"space-between",fontSize:"0.85rem",color:"var(--gray-600)" },
  pedidoFooter: { display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"0.75rem",paddingTop:"0.5rem",borderTop:"1px solid var(--gray-100)" },
  reporteWrap: { display:"flex",justifyContent:"center" },
  reporteCard: { background:"#fff",borderRadius:"var(--radius)",padding:"2rem",maxWidth:"540px",width:"100%",boxShadow:"var(--shadow-sm)",border:"1px solid var(--gray-200)" },
  reporteIcono: { fontSize:"2.5rem",textAlign:"center",marginBottom:"0.5rem" },
  form: { display:"flex",flexDirection:"column",gap:"1rem" },
  input: { padding:"0.65rem 0.85rem",border:"1.5px solid var(--gray-200)",borderRadius:"8px",fontSize:"0.92rem" },
  aviso: { display:"flex",gap:"0.6rem",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:"8px",padding:"0.75rem" },
  alert: { padding:"0.65rem 0.85rem",borderRadius:"8px",fontSize:"0.85rem",fontWeight:500 },
  btnReporte: { padding:"0.75rem",background:"var(--primary)",color:"#fff",border:"none",borderRadius:"8px",fontWeight:600,fontSize:"0.95rem" },
  emptyState: { textAlign:"center",padding:"3rem",color:"var(--gray-400)",display:"flex",flexDirection:"column",alignItems:"center",gap:"0.75rem" },
  // Checkout
  checkoutWrap: { display:"flex",justifyContent:"center",padding:"2rem 1.5rem" },
  checkoutCard: { background:"#fff",borderRadius:"var(--radius)",boxShadow:"var(--shadow-lg)",width:"100%",maxWidth:"820px",overflow:"hidden" },
  checkoutHeader: { background:"linear-gradient(135deg,#c0392b,#7b241c)",color:"#fff",padding:"1.25rem 1.5rem",display:"flex",alignItems:"center",gap:"1rem" },
  checkoutTitle: { color:"#fff",fontSize:"1.2rem" },
  checkoutGrid: { display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0",borderTop:"none" },
  resumenBox: { background:"var(--gray-50)",margin:"1.5rem",borderRadius:"8px",overflow:"hidden",border:"1px solid var(--gray-200)" },
  resumenRow: { display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"0.85rem 1rem",borderBottom:"1px solid var(--gray-200)" },
  totalRow: { display:"flex",justifyContent:"space-between",alignItems:"center",padding:"1rem",background:"#fff" },
  entregaForm: { padding:"1.5rem",display:"flex",flexDirection:"column",gap:"1rem",borderLeft:"1px solid var(--gray-200)" },
  pagoGrid: { display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem" },
  pagoOpt: { border:"1.5px solid var(--gray-200)",borderRadius:"8px",padding:"0.55rem 0.75rem",fontSize:"0.85rem",fontWeight:500,textAlign:"center",cursor:"pointer" },
  pagoOptActive: { border:"1.5px solid var(--primary)",background:"var(--primary-light)",color:"var(--primary)",fontWeight:600 },
  btnConfirmar: { padding:"0.8rem",background:"var(--green)",color:"#fff",border:"none",borderRadius:"8px",fontWeight:700,fontSize:"0.95rem" },
  btnSecundario: { padding:"0.8rem",background:"var(--gray-100)",color:"var(--gray-800)",border:"none",borderRadius:"8px",fontWeight:600,fontSize:"0.95rem",flex:1 },
  // Confirmación
  confirWrap: { display:"flex",justifyContent:"center",padding:"3rem 1.5rem" },
  confirCard: { background:"#fff",borderRadius:"var(--radius)",padding:"2.5rem",maxWidth:"460px",width:"100%",textAlign:"center",boxShadow:"var(--shadow-lg)" },
  confirIcon: { fontSize:"3.5rem",marginBottom:"0.75rem" },
  confirTitle: { fontFamily:"'Playfair Display',serif",fontSize:"1.6rem",marginBottom:"0.5rem",color:"var(--green)" },
  confirBox: { background:"var(--gray-50)",borderRadius:"8px",overflow:"hidden",border:"1px solid var(--gray-200)",marginBottom:"0.5rem",textAlign:"left" },
  confirRow: { display:"flex",justifyContent:"space-between",padding:"0.75rem 1rem",borderBottom:"1px solid var(--gray-200)",fontSize:"0.88rem" },
};
