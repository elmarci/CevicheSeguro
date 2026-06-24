import React, { useEffect, useRef, useState } from "react";
import api from "../services/api";

const ESPECIES = ["pota","calamar","pulpo","lenguado","corvina","pejerrey","caballa","mixto"];

export default function VendedorPage() {
  const [tab, setTab] = useState("inicio");
  const [perfil, setPerfil] = useState(null);
  const [licencias, setLicencias] = useState([]);
  const [certificados, setCertificados] = useState([]);
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [msg, setMsg] = useState({ text: "", ok: true });
  const [loadingForm, setLoadingForm] = useState("");

  const [licForm, setLicForm] = useState({ numero_licencia: "", autoridad_emisora: "", fecha_emision: "", fecha_vencimiento: "" });
  const [certForm, setCertForm] = useState({ entidad_emisora: "", numero_certificado: "", fecha_emision: "", fecha_vencimiento: "" });
  const [prodForm, setProdForm] = useState({ nombre: "", especie_declarada: "pota", precio: "", descripcion: "", unidad: "porcion" });
  const listRef = useRef(null);

  useEffect(() => { cargarTodo(); }, []);

  async function cargarTodo() {
    try {
      const [p, l, c, pr, ped] = await Promise.all([
        api.get("/vendedores/mi-perfil"),
        api.get("/vendedores/mis-licencias"),
        api.get("/vendedores/mis-certificados"),
        api.get("/productos/mis-productos"),
        api.get("/pedidos/pedidos-recibidos"),
      ]);
      setPerfil(p.data);
      setLicencias(l.data);
      setCertificados(c.data);
      setProductos(pr.data);
      setPedidos(ped.data);
    } catch {}
  }

  function flash(text, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg({ text: "", ok: true }), 4000);
    if (ok && listRef.current) listRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function subirLicencia(e) {
    e.preventDefault(); setLoadingForm("lic");
    try {
      await api.post("/vendedores/mis-licencias", {
        numero_licencia: licForm.numero_licencia,
        fecha_emision: licForm.fecha_emision,
        fecha_vencimiento: licForm.fecha_vencimiento,
      });
      flash("✅ Licencia registrada. Queda pendiente de aprobación por un inspector.");
      setLicForm({ numero_licencia: "", autoridad_emisora: "", fecha_emision: "", fecha_vencimiento: "" });
      const r = await api.get("/vendedores/mis-licencias"); setLicencias(r.data);
    } catch (err) { flash(err.response?.data?.detail || "Error al subir licencia", false); }
    finally { setLoadingForm(""); }
  }

  async function subirCertificado(e) {
    e.preventDefault(); setLoadingForm("cert");
    try {
      await api.post("/vendedores/mis-certificados", {
        entidad_emisora: certForm.entidad_emisora,
        fecha_emision: certForm.fecha_emision,
        fecha_vencimiento: certForm.fecha_vencimiento,
      });
      flash("✅ Certificado registrado. Queda pendiente de aprobación por un inspector.");
      setCertForm({ entidad_emisora: "", numero_certificado: "", fecha_emision: "", fecha_vencimiento: "" });
      const r = await api.get("/vendedores/mis-certificados"); setCertificados(r.data);
    } catch (err) { flash(err.response?.data?.detail || "Error al subir certificado", false); }
    finally { setLoadingForm(""); }
  }

  async function crearProducto(e) {
    e.preventDefault(); setLoadingForm("prod");
    try {
      await api.post("/productos", {
        nombre: prodForm.nombre,
        especie_declarada: prodForm.especie_declarada,
        precio: parseFloat(prodForm.precio),
        descripcion: prodForm.descripcion || null,
      });
      flash("✅ Producto publicado y ya visible para los clientes.");
      setProdForm({ nombre: "", especie_declarada: "pota", precio: "", descripcion: "", unidad: "porcion" });
      const r = await api.get("/productos/mis-productos"); setProductos(r.data);
    } catch (err) { flash(err.response?.data?.detail || "Error al crear producto", false); }
    finally { setLoadingForm(""); }
  }

  async function eliminarProducto(id) {
    if (!confirm("¿Eliminar este producto? Los clientes ya no podrán verlo.")) return;
    try {
      await api.delete(`/productos/${id}`);
      setProductos(prev => prev.filter(p => p.id !== id));
      flash("Producto eliminado.");
    } catch (err) { flash(err.response?.data?.detail || "Error al eliminar", false); }
  }

  const sello = perfil?.estado_verificacion;
  const selloMap = {
    verificado:    { label: "✅ Verificado", bg: "var(--green-light)", color: "var(--green)", tip: "Tu negocio está verificado. Los clientes te ven como confiable." },
    no_verificado: { label: "🔴 No verificado", bg: "var(--red-light)", color: "var(--primary)", tip: "Un documento venció. Actualiza tu licencia o certificado sanitario." },
    pendiente:     { label: "⏳ Pendiente", bg: "var(--yellow-light)", color: "#92400e", tip: "El inspector aún no revisó tus documentos." },
  };
  const selloInfo = selloMap[sello] || selloMap.pendiente;
  const nuevosPedidos = pedidos.filter(p => p.estado === "pendiente").length;

  return (
    <div style={s.page}>
      {msg.text && <Toast text={msg.text} ok={msg.ok} />}

      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.avatar}>{(perfil?.nombre_negocio || "?").charAt(0)}</div>
          <div>
            <h2 style={s.negocio}>{perfil?.nombre_negocio || "Mi negocio"}</h2>
            <div style={{ ...s.selloPill, background: selloInfo.bg, color: selloInfo.color }}>{selloInfo.label}</div>
            <p style={s.selloTip}>{selloInfo.tip}</p>
          </div>
        </div>
        <div style={s.kpis}>
          <Kpi n={licencias.filter(l=>l.estado==="aprobado").length} label="Licencias vigentes" icon="📋" />
          <Kpi n={certificados.filter(c=>c.estado==="aprobado").length} label="Certs. vigentes" icon="🏥" />
          <Kpi n={productos.length} label="Productos" icon="🍽️" />
          <Kpi n={nuevosPedidos} label="Pedidos nuevos" icon="📦" alert={nuevosPedidos > 0} />
        </div>
      </div>

      <div style={s.tabBar}>
        {[["inicio","🏠 Inicio"],["licencia","📋 Licencias"],["certificado","🏥 Certificados"],["productos","🍽️ Productos"],["pedidos",`📦 Pedidos${nuevosPedidos > 0 ? ` (${nuevosPedidos})` : ""}`]].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={tab === t ? s.tabActive : s.tab}>{l}</button>
        ))}
      </div>

      <div style={s.body}>

        {/* ── INICIO ── */}
        {tab === "inicio" && (
          <div>
            <h3 style={s.secTitle}>¿Qué necesitas para aparecer como Verificado?</h3>
            <div style={s.guiaGrid}>
              <GuiaStep n={1} done={licencias.some(l=>l.estado==="aprobado")} pendiente={licencias.some(l=>l.estado==="pendiente")} titulo="Licencia municipal vigente" desc="Sube tu licencia de funcionamiento emitida por la municipalidad. Un inspector la revisará y aprobará." onClick={() => setTab("licencia")} />
              <GuiaStep n={2} done={certificados.some(c=>c.estado==="aprobado")} pendiente={certificados.some(c=>c.estado==="pendiente")} titulo="Certificado sanitario vigente" desc="Sube tu certificado sanitario emitido por DIGESA o la autoridad de salud competente." onClick={() => setTab("certificado")} />
              <GuiaStep n={3} done={productos.length > 0} pendiente={false} titulo="Publica tus productos" desc="Registra tus platos con la especie declarada. Un inspector puede verificar la especie en laboratorio." onClick={() => setTab("productos")} />
            </div>

            {pedidos.length > 0 && (
              <div style={s.ultimosPedidos}>
                <h3 style={s.secTitle}>Últimos pedidos</h3>
                {pedidos.slice(0, 3).map(p => <PedidoRow key={p.id} pedido={p} />)}
                {pedidos.length > 3 && <button style={s.verMas} onClick={() => setTab("pedidos")}>Ver todos los pedidos →</button>}
              </div>
            )}
          </div>
        )}

        {/* ── LICENCIAS ── */}
        {tab === "licencia" && (
          <div style={s.split}>
            <div style={s.formCard}>
              <h3 style={s.cardTitle}>➕ Registrar licencia municipal</h3>
              <form onSubmit={subirLicencia} style={s.form}>
                <Field label="Número de licencia *">
                  <input placeholder="Ej: LM-2024-001234" value={licForm.numero_licencia} onChange={e=>setLicForm({...licForm,numero_licencia:e.target.value})} style={s.input} required />
                </Field>
                <Field label="Autoridad emisora">
                  <input placeholder="Ej: Municipalidad de Miraflores" value={licForm.autoridad_emisora} onChange={e=>setLicForm({...licForm,autoridad_emisora:e.target.value})} style={s.input} />
                </Field>
                <div style={s.row2}>
                  <Field label="Fecha de emisión *">
                    <input type="datetime-local" value={licForm.fecha_emision} onChange={e=>setLicForm({...licForm,fecha_emision:e.target.value})} style={s.input} required />
                  </Field>
                  <Field label="Fecha de vencimiento *">
                    <input type="datetime-local" value={licForm.fecha_vencimiento} onChange={e=>setLicForm({...licForm,fecha_vencimiento:e.target.value})} style={s.input} required />
                  </Field>
                </div>
                <InfoBox text="Al registrar la licencia, un inspector sanitario la revisará antes de aprobarla. Recibirás el cambio de estado en tu panel." />
                <button type="submit" style={s.btn} disabled={loadingForm==="lic"}>{loadingForm==="lic" ? "Registrando..." : "Registrar licencia"}</button>
              </form>
            </div>

            <div style={s.listCard} ref={listRef}>
              <h3 style={s.cardTitle}>📋 Mis licencias ({licencias.length})</h3>
              {licencias.length === 0
                ? <EmptyMsg msg="Aún no tienes licencias registradas." />
                : licencias.map(l => <DocCard key={l.id} titulo={l.numero_licencia} estado={l.estado} vence={l.fecha_vencimiento} sub={`Registrada el ${new Date(l.fecha_vencimiento).toLocaleDateString("es-PE")}`} />)
              }
            </div>
          </div>
        )}

        {/* ── CERTIFICADOS ── */}
        {tab === "certificado" && (
          <div style={s.split}>
            <div style={s.formCard}>
              <h3 style={s.cardTitle}>➕ Registrar certificado sanitario</h3>
              <form onSubmit={subirCertificado} style={s.form}>
                <Field label="Entidad emisora *">
                  <select value={certForm.entidad_emisora} onChange={e=>setCertForm({...certForm,entidad_emisora:e.target.value})} style={s.input} required>
                    <option value="">Selecciona la entidad...</option>
                    <option value="DIGESA">DIGESA</option>
                    <option value="SANIPES">SANIPES</option>
                    <option value="Municipalidad Provincial">Municipalidad Provincial</option>
                    <option value="Municipalidad Distrital">Municipalidad Distrital</option>
                    <option value="SENASA">SENASA</option>
                    <option value="Otra entidad">Otra entidad</option>
                  </select>
                </Field>
                <Field label="Número de certificado">
                  <input placeholder="Ej: CERT-DIGESA-2024-0456" value={certForm.numero_certificado} onChange={e=>setCertForm({...certForm,numero_certificado:e.target.value})} style={s.input} />
                </Field>
                <div style={s.row2}>
                  <Field label="Fecha de emisión *">
                    <input type="datetime-local" value={certForm.fecha_emision} onChange={e=>setCertForm({...certForm,fecha_emision:e.target.value})} style={s.input} required />
                  </Field>
                  <Field label="Fecha de vencimiento *">
                    <input type="datetime-local" value={certForm.fecha_vencimiento} onChange={e=>setCertForm({...certForm,fecha_vencimiento:e.target.value})} style={s.input} required />
                  </Field>
                </div>
                <InfoBox text="El certificado sanitario acredita que tu negocio cumple con las normas de higiene y manipulación de alimentos." />
                <button type="submit" style={s.btn} disabled={loadingForm==="cert"}>{loadingForm==="cert" ? "Registrando..." : "Registrar certificado"}</button>
              </form>
            </div>

            <div style={s.listCard}>
              <h3 style={s.cardTitle}>🏥 Mis certificados ({certificados.length})</h3>
              {certificados.length === 0
                ? <EmptyMsg msg="Aún no tienes certificados registrados." />
                : certificados.map(c => <DocCard key={c.id} titulo={c.entidad_emisora} estado={c.estado} vence={c.fecha_vencimiento} sub={`Vence: ${new Date(c.fecha_vencimiento).toLocaleDateString("es-PE")}`} />)
              }
            </div>
          </div>
        )}

        {/* ── PRODUCTOS ── */}
        {tab === "productos" && (
          <div style={s.split}>
            <div style={s.formCard}>
              <h3 style={s.cardTitle}>➕ Publicar nuevo producto</h3>
              <form onSubmit={crearProducto} style={s.form}>
                <Field label="Nombre del plato *">
                  <input placeholder="Ej: Ceviche mixto especial" value={prodForm.nombre} onChange={e=>setProdForm({...prodForm,nombre:e.target.value})} style={s.input} required />
                </Field>
                <div style={s.row2}>
                  <Field label="Especie declarada *">
                    <select value={prodForm.especie_declarada} onChange={e=>setProdForm({...prodForm,especie_declarada:e.target.value})} style={s.input}>
                      {ESPECIES.map(esp => <option key={esp} value={esp}>{esp.charAt(0).toUpperCase()+esp.slice(1)}</option>)}
                    </select>
                  </Field>
                  <Field label="Precio (S/.) *">
                    <input type="number" step="0.50" min="1" placeholder="18.00" value={prodForm.precio} onChange={e=>setProdForm({...prodForm,precio:e.target.value})} style={s.input} required />
                  </Field>
                </div>
                <Field label="Descripción del plato">
                  <textarea placeholder="Ingredientes, acompañamientos, presentación..." value={prodForm.descripcion} onChange={e=>setProdForm({...prodForm,descripcion:e.target.value})} style={{...s.input,height:"70px",resize:"vertical"}} />
                </Field>
                <InfoBox text="La especie declarada es pública. Un inspector puede verificarla en laboratorio y registrar la especie real." />
                <button type="submit" style={s.btn} disabled={loadingForm==="prod"}>{loadingForm==="prod" ? "Publicando..." : "Publicar producto"}</button>
              </form>
            </div>

            <div style={s.listCard}>
              <h3 style={s.cardTitle}>🍽️ Mis productos ({productos.length})</h3>
              {productos.length === 0
                ? <EmptyMsg msg="Aún no publicaste productos. Los clientes no pueden verte sin productos." />
                : productos.map(p => (
                    <div key={p.id} style={s.prodRow}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>{p.nombre}</div>
                        <div style={s.prodMeta}>
                          <span style={s.especieBadge}>🐟 Declarada: {p.especie_declarada}</span>
                          {p.especie_verificada
                            ? <span style={s.verificBadge}>🔬 Verificada: {p.especie_verificada}</span>
                            : <span style={s.pendBadge}>Sin verificación de laboratorio</span>
                          }
                        </div>
                        {p.descripcion && <p style={s.prodDesc}>{p.descripcion}</p>}
                        <div style={{ fontWeight: 700, color: "var(--primary)", marginTop: "0.2rem" }}>S/. {parseFloat(p.precio).toFixed(2)}</div>
                      </div>
                      <button onClick={()=>eliminarProducto(p.id)} style={s.btnElim}>🗑</button>
                    </div>
                  ))
              }
            </div>
          </div>
        )}

        {/* ── PEDIDOS ── */}
        {tab === "pedidos" && (
          <div>
            <h3 style={s.secTitle}>Pedidos recibidos ({pedidos.length})</h3>
            {pedidos.length === 0
              ? <EmptyMsg msg="Aún no tienes pedidos. Completa tu verificación y publica productos para empezar a recibir clientes." />
              : pedidos.map(p => <PedidoCard key={p.id} pedido={p} />)
            }
          </div>
        )}

      </div>
    </div>
  );
}

// ── Sub-componentes ─────────────────────────────────────────────────────────

function GuiaStep({ n, done, pendiente, titulo, desc, onClick }) {
  const color = done ? "var(--green)" : pendiente ? "var(--yellow)" : "var(--primary)";
  const bgCircle = done ? "var(--green)" : pendiente ? "var(--yellow)" : "var(--gray-200)";
  return (
    <div style={{ background: "#fff", borderRadius: "var(--radius)", padding: "1.25rem", border: done ? "1.5px solid var(--green)" : pendiente ? "1.5px solid var(--yellow)" : "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: bgCircle, color: done||pendiente?"#fff":"var(--gray-400)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem", flexShrink: 0 }}>
          {done ? "✓" : pendiente ? "⌛" : n}
        </div>
        <h4 style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.95rem", alignSelf: "center" }}>{titulo}</h4>
      </div>
      <p style={{ fontSize: "0.82rem", color: "var(--gray-600)", marginBottom: "0.85rem", lineHeight: 1.5 }}>{desc}</p>
      {done && <span style={{ color: "var(--green)", fontSize: "0.82rem", fontWeight: 600 }}>✅ Completado</span>}
      {pendiente && <span style={{ color: "#92400e", fontSize: "0.82rem", fontWeight: 600 }}>⌛ En revisión por inspector</span>}
      {!done && !pendiente && <button onClick={onClick} style={{ padding: "0.4rem 0.9rem", background: "var(--primary-light)", color: "var(--primary)", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "0.82rem" }}>Ir →</button>}
    </div>
  );
}

function DocCard({ titulo, estado, vence, sub }) {
  const map = { pendiente: ["#fef3c7","#92400e","⌛ Pendiente de revisión"], aprobado: ["var(--green-light)","var(--green)","✅ Aprobado"], rechazado: ["var(--red-light)","var(--primary)","❌ Rechazado"] };
  const [bg, color, label] = map[estado] || map.pendiente;
  const venceDate = new Date(vence);
  const diasRestantes = Math.ceil((venceDate - new Date()) / (1000*60*60*24));
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0.75rem 0", borderBottom: "1px solid var(--gray-100)" }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{titulo}</div>
        <div style={{ fontSize: "0.75rem", color: "var(--gray-400)", marginTop: "0.15rem" }}>
          Vence: {venceDate.toLocaleDateString("es-PE")}
          {estado === "aprobado" && diasRestantes > 0 && diasRestantes <= 30 && <span style={{ color: "var(--accent)", marginLeft: "0.4rem" }}>⚠️ Vence en {diasRestantes} días</span>}
          {estado === "aprobado" && diasRestantes <= 0 && <span style={{ color: "var(--primary)", marginLeft: "0.4rem" }}>⛔ Vencido</span>}
        </div>
      </div>
      <span style={{ background: bg, color, padding: "0.2rem 0.7rem", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
}

function PedidoRow({ pedido }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid var(--gray-100)", fontSize: "0.88rem" }}>
      <span>Pedido #{pedido.id} · {new Date(pedido.created_at).toLocaleDateString("es-PE")}</span>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <span style={{ fontWeight: 600 }}>S/. {parseFloat(pedido.total).toFixed(2)}</span>
        <EstadoBadge estado={pedido.estado} />
      </div>
    </div>
  );
}

function PedidoCard({ pedido }) {
  return (
    <div style={{ background: "#fff", borderRadius: "var(--radius)", padding: "1.25rem", marginBottom: "0.75rem", boxShadow: "var(--shadow-sm)", border: "1px solid var(--gray-200)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <span style={{ fontWeight: 700 }}>Pedido #{pedido.id}</span>
        <EstadoBadge estado={pedido.estado} />
      </div>
      <div style={{ fontSize: "0.8rem", color: "var(--gray-400)", marginBottom: "0.75rem" }}>
        Cliente #{pedido.cliente_id} · {new Date(pedido.created_at).toLocaleString("es-PE")}
      </div>
      <div style={{ borderTop: "1px solid var(--gray-100)", paddingTop: "0.6rem" }}>
        {pedido.detalles?.map(d => (
          <div key={d.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", padding: "0.15rem 0" }}>
            <span>Producto #{d.producto_id} × {d.cantidad}</span>
            <span>S/. {(d.precio_unitario * d.cantidad).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "right", fontWeight: 700, marginTop: "0.5rem", color: "var(--primary)" }}>Total: S/. {parseFloat(pedido.total).toFixed(2)}</div>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const m = { pendiente:["#fef3c7","#92400e"], confirmado:["#dbeafe","#1e40af"], entregado:["#d1fae5","#065f46"], cancelado:["#fee2e2","#991b1b"] };
  const [bg,color] = m[estado]||["#f3f4f6","#374151"];
  return <span style={{background:bg,color,padding:"0.15rem 0.7rem",borderRadius:"20px",fontSize:"0.75rem",fontWeight:600}}>{estado}</span>;
}

function Field({ label, children }) {
  return <div style={{ display:"flex",flexDirection:"column",gap:"0.3rem" }}><label style={{fontSize:"0.8rem",fontWeight:600,color:"var(--gray-600)"}}>{label}</label>{children}</div>;
}

function InfoBox({ text }) {
  return <div style={{ background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:"8px",padding:"0.6rem 0.8rem",fontSize:"0.78rem",color:"#1e40af",lineHeight:1.5 }}>ℹ️ {text}</div>;
}

function EmptyMsg({ msg }) {
  return <div style={{ textAlign:"center",padding:"2.5rem",color:"var(--gray-400)",fontSize:"0.88rem" }}>🍽️ {msg}</div>;
}

function Toast({ text, ok }) {
  return <div style={{ position:"fixed",top:"72px",right:"1.5rem",zIndex:999,background:ok?"#065f46":"#991b1b",color:"#fff",padding:"0.75rem 1.25rem",borderRadius:"10px",boxShadow:"0 4px 16px rgba(0,0,0,0.2)",fontSize:"0.88rem",maxWidth:"340px",lineHeight:1.5 }}>{text}</div>;
}

function Kpi({ n, label, icon, alert }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.12)",borderRadius:"8px",padding:"0.6rem 1rem",textAlign:"center",minWidth:"90px",border:alert?"1px solid #fde68a":"1px solid transparent" }}>
      <div style={{ fontSize:"1.2rem" }}>{icon}</div>
      <div style={{ fontSize:"1.3rem",fontWeight:700,color:alert?"#fde68a":"#fff",lineHeight:1 }}>{n}</div>
      <div style={{ fontSize:"0.65rem",opacity:0.8,marginTop:"0.1rem" }}>{label}</div>
    </div>
  );
}

const s = {
  page: { minHeight:"100vh",background:"var(--gray-50)" },
  header: { background:"linear-gradient(135deg,#c0392b,#7b241c)",color:"#fff",padding:"1.5rem 2rem",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"1.25rem" },
  headerLeft: { display:"flex",gap:"1rem",alignItems:"flex-start" },
  avatar: { width:"54px",height:"54px",borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem",fontWeight:700,flexShrink:0 },
  negocio: { fontFamily:"'Playfair Display',serif",fontSize:"1.3rem",marginBottom:"0.35rem" },
  selloPill: { display:"inline-block",padding:"0.2rem 0.8rem",borderRadius:"20px",fontSize:"0.8rem",fontWeight:600,marginBottom:"0.3rem" },
  selloTip: { fontSize:"0.78rem",opacity:0.85 },
  kpis: { display:"flex",gap:"0.75rem",flexWrap:"wrap" },
  tabBar: { display:"flex",background:"#fff",borderBottom:"1px solid var(--gray-200)",paddingLeft:"1.5rem",overflowX:"auto" },
  tab: { padding:"0.85rem 1rem",border:"none",background:"none",color:"var(--gray-600)",fontWeight:500,fontSize:"0.85rem",borderBottom:"2px solid transparent",whiteSpace:"nowrap" },
  tabActive: { padding:"0.85rem 1rem",border:"none",background:"none",color:"var(--primary)",fontWeight:600,fontSize:"0.85rem",borderBottom:"2px solid var(--primary)",whiteSpace:"nowrap" },
  body: { maxWidth:"1000px",margin:"0 auto",padding:"1.5rem" },
  secTitle: { fontFamily:"'Playfair Display',serif",fontSize:"1.2rem",marginBottom:"1rem" },
  guiaGrid: { display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"1rem",marginBottom:"2rem" },
  ultimosPedidos: { background:"#fff",borderRadius:"var(--radius)",padding:"1.25rem",boxShadow:"var(--shadow-sm)",border:"1px solid var(--gray-200)" },
  verMas: { marginTop:"0.75rem",padding:"0.4rem 0.8rem",background:"none",border:"1px solid var(--gray-200)",borderRadius:"8px",fontSize:"0.82rem",color:"var(--gray-600)",cursor:"pointer" },
  split: { display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem" },
  formCard: { background:"#fff",borderRadius:"var(--radius)",padding:"1.5rem",boxShadow:"var(--shadow-sm)",border:"1px solid var(--gray-200)" },
  listCard: { background:"#fff",borderRadius:"var(--radius)",padding:"1.5rem",boxShadow:"var(--shadow-sm)",border:"1px solid var(--gray-200)" },
  cardTitle: { fontFamily:"'Playfair Display',serif",fontSize:"1rem",marginBottom:"1.25rem",paddingBottom:"0.75rem",borderBottom:"1px solid var(--gray-200)" },
  form: { display:"flex",flexDirection:"column",gap:"0.85rem" },
  input: { padding:"0.6rem 0.8rem",border:"1.5px solid var(--gray-200)",borderRadius:"8px",fontSize:"0.9rem" },
  row2: { display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem" },
  btn: { padding:"0.7rem",background:"var(--primary)",color:"#fff",border:"none",borderRadius:"8px",fontWeight:600,fontSize:"0.9rem" },
  prodRow: { display:"flex",alignItems:"flex-start",gap:"0.75rem",padding:"0.75rem 0",borderBottom:"1px solid var(--gray-100)" },
  prodMeta: { display:"flex",gap:"0.4rem",flexWrap:"wrap",marginBottom:"0.2rem" },
  especieBadge: { background:"var(--accent-light)",color:"#7c4a00",padding:"0.1rem 0.55rem",borderRadius:"10px",fontSize:"0.72rem",fontWeight:500 },
  verificBadge: { background:"var(--green-light)",color:"var(--green)",padding:"0.1rem 0.55rem",borderRadius:"10px",fontSize:"0.72rem",fontWeight:500 },
  pendBadge: { background:"var(--gray-100)",color:"var(--gray-400)",padding:"0.1rem 0.55rem",borderRadius:"10px",fontSize:"0.72rem" },
  prodDesc: { fontSize:"0.78rem",color:"var(--gray-400)",margin:"0.2rem 0 0" },
  btnElim: { background:"var(--red-light)",border:"none",borderRadius:"6px",padding:"0.35rem 0.55rem",fontSize:"0.85rem",cursor:"pointer",flexShrink:0 },
};
