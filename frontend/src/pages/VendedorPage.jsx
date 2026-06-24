import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function VendedorPage() {
  const [tab, setTab] = useState("inicio");
  const [perfil, setPerfil] = useState(null);
  const [licencias, setLicencias] = useState([]);
  const [certificados, setCertificados] = useState([]);
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [msg, setMsg] = useState({ text: "", ok: true });

  const [licForm, setLicForm] = useState({ numero_licencia: "", fecha_emision: "", fecha_vencimiento: "" });
  const [certForm, setCertForm] = useState({ entidad_emisora: "", fecha_emision: "", fecha_vencimiento: "" });
  const [prodForm, setProdForm] = useState({ nombre: "", especie_declarada: "pota", precio: "", descripcion: "" });

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
      setPerfil(p.data); setLicencias(l.data); setCertificados(c.data);
      setProductos(pr.data); setPedidos(ped.data);
    } catch {}
  }

  function flash(text, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg({ text: "", ok: true }), 3500); }

  async function subirLicencia(e) {
    e.preventDefault();
    try { await api.post("/vendedores/mis-licencias", licForm); flash("✅ Licencia enviada para revisión"); setLicForm({ numero_licencia: "", fecha_emision: "", fecha_vencimiento: "" }); cargarTodo(); }
    catch (err) { flash(err.response?.data?.detail || "Error al subir licencia", false); }
  }

  async function subirCertificado(e) {
    e.preventDefault();
    try { await api.post("/vendedores/mis-certificados", certForm); flash("✅ Certificado enviado para revisión"); setCertForm({ entidad_emisora: "", fecha_emision: "", fecha_vencimiento: "" }); cargarTodo(); }
    catch (err) { flash(err.response?.data?.detail || "Error al subir certificado", false); }
  }

  async function crearProducto(e) {
    e.preventDefault();
    try { await api.post("/productos", { ...prodForm, precio: parseFloat(prodForm.precio) }); flash("✅ Producto publicado"); setProdForm({ nombre: "", especie_declarada: "pota", precio: "", descripcion: "" }); cargarTodo(); }
    catch (err) { flash(err.response?.data?.detail || "Error al crear producto", false); }
  }

  async function eliminarProducto(id) {
    if (!confirm("¿Eliminar este producto?")) return;
    await api.delete(`/productos/${id}`); cargarTodo();
  }

  const sello = perfil?.estado_verificacion;
  const selloMap = {
    verificado:    { label: "✅ Verificado", bg: "var(--green-light)", color: "var(--green)", msg: "Tu negocio está verificado y visible para los clientes." },
    no_verificado: { label: "🔴 No verificado", bg: "var(--red-light)", color: "var(--primary)", msg: "Algún documento venció. Actualiza tu licencia o certificado." },
    pendiente:     { label: "⏳ En revisión", bg: "var(--yellow-light)", color: "var(--yellow)", msg: "Tus documentos están siendo revisados por un inspector." },
  };
  const selloInfo = selloMap[sello] || selloMap.pendiente;

  const nuevosPedidos = pedidos.filter(p => p.estado === "pendiente").length;

  return (
    <div style={s.page}>
      {msg.text && <Toast text={msg.text} ok={msg.ok} />}

      {/* Header vendedor */}
      {perfil && (
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.avatar}>{perfil.nombre_negocio.charAt(0)}</div>
            <div>
              <h2 style={s.negocioNombre}>{perfil.nombre_negocio}</h2>
              <div style={{ ...s.sello, background: selloInfo.bg, color: selloInfo.color }}>{selloInfo.label}</div>
            </div>
          </div>
          <div style={s.selloMsg}>{selloInfo.msg}</div>
        </div>
      )}

      {/* KPIs */}
      <div style={s.kpiBar}>
        <KPI icon="📋" n={licencias.length} label="Licencias" color="var(--primary)" />
        <KPI icon="🏥" n={certificados.length} label="Certificados" color="#2980b9" />
        <KPI icon="🍽️" n={productos.length} label="Productos" color="var(--accent)" />
        <KPI icon="📦" n={pedidos.length} label="Pedidos totales" color="var(--green)" badge={nuevosPedidos} />
      </div>

      {/* Tabs */}
      <div style={s.tabBar}>
        {[["inicio","🏠 Inicio"],["licencia","📋 Licencia"],["certificado","🏥 Certificado"],["productos","🍽️ Productos"],["pedidos","📦 Pedidos"]].map(([t, l]) => (
          <button key={t} style={tab === t ? s.tabActive : s.tab} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      <div style={s.content}>

        {tab === "inicio" && (
          <div style={s.iniciGrid}>
            <GuiaCard step="1" title="Sube tu licencia municipal" desc="Sin licencia vigente no puedes aparecer como verificado." action={() => setTab("licencia")} btn="Ir a licencias →" done={licencias.some(l => l.estado === "aprobado")} />
            <GuiaCard step="2" title="Sube tu certificado sanitario" desc="Demuestra que cumples las normas de higiene y cadena de frío." action={() => setTab("certificado")} btn="Ir a certificados →" done={certificados.some(c => c.estado === "aprobado")} />
            <GuiaCard step="3" title="Publica tus productos" desc="Agrega tus platos con especie declarada para que los clientes confíen." action={() => setTab("productos")} btn="Ir a productos →" done={productos.length > 0} />
          </div>
        )}

        {tab === "licencia" && (
          <div style={s.twoCol}>
            <div style={s.formCard}>
              <h3 style={s.cardTitle}>📋 Nueva licencia</h3>
              <form onSubmit={subirLicencia} style={s.form}>
                <Field label="Número de licencia"><input placeholder="Ej: LM-2024-001234" value={licForm.numero_licencia} onChange={e => setLicForm({...licForm, numero_licencia: e.target.value})} style={s.input} required /></Field>
                <Field label="Fecha de emisión"><input type="datetime-local" value={licForm.fecha_emision} onChange={e => setLicForm({...licForm, fecha_emision: e.target.value})} style={s.input} required /></Field>
                <Field label="Fecha de vencimiento"><input type="datetime-local" value={licForm.fecha_vencimiento} onChange={e => setLicForm({...licForm, fecha_vencimiento: e.target.value})} style={s.input} required /></Field>
                <button type="submit" style={s.btn}>Enviar para revisión</button>
              </form>
            </div>
            <div style={s.listCard}>
              <h3 style={s.cardTitle}>Mis licencias</h3>
              {licencias.length === 0 ? <Empty msg="Sin licencias aún." /> : licencias.map(l => (
                <DocRow key={l.id} titulo={l.numero_licencia} estado={l.estado} vence={l.fecha_vencimiento} />
              ))}
            </div>
          </div>
        )}

        {tab === "certificado" && (
          <div style={s.twoCol}>
            <div style={s.formCard}>
              <h3 style={s.cardTitle}>🏥 Nuevo certificado sanitario</h3>
              <form onSubmit={subirCertificado} style={s.form}>
                <Field label="Entidad emisora"><input placeholder="Ej: DIGESA, Municipalidad de Lima" value={certForm.entidad_emisora} onChange={e => setCertForm({...certForm, entidad_emisora: e.target.value})} style={s.input} required /></Field>
                <Field label="Fecha de emisión"><input type="datetime-local" value={certForm.fecha_emision} onChange={e => setCertForm({...certForm, fecha_emision: e.target.value})} style={s.input} required /></Field>
                <Field label="Fecha de vencimiento"><input type="datetime-local" value={certForm.fecha_vencimiento} onChange={e => setCertForm({...certForm, fecha_vencimiento: e.target.value})} style={s.input} required /></Field>
                <button type="submit" style={s.btn}>Enviar para revisión</button>
              </form>
            </div>
            <div style={s.listCard}>
              <h3 style={s.cardTitle}>Mis certificados</h3>
              {certificados.length === 0 ? <Empty msg="Sin certificados aún." /> : certificados.map(c => (
                <DocRow key={c.id} titulo={c.entidad_emisora} estado={c.estado} vence={c.fecha_vencimiento} />
              ))}
            </div>
          </div>
        )}

        {tab === "productos" && (
          <div style={s.twoCol}>
            <div style={s.formCard}>
              <h3 style={s.cardTitle}>🍽️ Publicar producto</h3>
              <form onSubmit={crearProducto} style={s.form}>
                <Field label="Nombre del plato"><input placeholder="Ej: Ceviche mixto especial" value={prodForm.nombre} onChange={e => setProdForm({...prodForm, nombre: e.target.value})} style={s.input} required /></Field>
                <Field label="Especie declarada">
                  <select value={prodForm.especie_declarada} onChange={e => setProdForm({...prodForm, especie_declarada: e.target.value})} style={s.input}>
                    <option value="pota">Pota (calamar gigante)</option>
                    <option value="calamar">Calamar común</option>
                    <option value="pulpo">Pulpo</option>
                    <option value="lenguado">Lenguado</option>
                    <option value="corvina">Corvina</option>
                    <option value="mixto">Mixto</option>
                  </select>
                </Field>
                <Field label="Precio (S/.)"><input type="number" step="0.50" min="0" placeholder="18.00" value={prodForm.precio} onChange={e => setProdForm({...prodForm, precio: e.target.value})} style={s.input} required /></Field>
                <Field label="Descripción"><input placeholder="Ej: Con leche de tigre, choclo y cancha" value={prodForm.descripcion} onChange={e => setProdForm({...prodForm, descripcion: e.target.value})} style={s.input} /></Field>
                <button type="submit" style={s.btn}>Publicar</button>
              </form>
            </div>
            <div style={s.listCard}>
              <h3 style={s.cardTitle}>Mis productos ({productos.length})</h3>
              {productos.length === 0 ? <Empty msg="Sin productos aún." /> : productos.map(p => (
                <div key={p.id} style={s.prodRow}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.nombre}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--gray-400)" }}>🐟 {p.especie_declarada} · S/. {parseFloat(p.precio).toFixed(2)}</div>
                    {p.especie_verificada && <div style={{ fontSize: "0.75rem", color: "var(--green)" }}>🔬 Verificada: {p.especie_verificada}</div>}
                  </div>
                  <button onClick={() => eliminarProducto(p.id)} style={s.btnDel}>Eliminar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "pedidos" && (
          <>
            <h2 style={s.sectionTitle}>Pedidos recibidos ({pedidos.length})</h2>
            {pedidos.length === 0 ? <Empty msg="Aún no recibes pedidos. Completa tu verificación y publica productos." /> :
              pedidos.map(p => (
                <div key={p.id} style={s.pedidoCard}>
                  <div style={s.pedidoHeader}>
                    <span style={{ fontWeight: 700 }}>Pedido #{p.id}</span>
                    <EstadoBadge estado={p.estado} />
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--gray-400)", marginBottom: "0.5rem" }}>
                    Cliente #{p.cliente_id} · {new Date(p.created_at).toLocaleString("es-PE")}
                  </div>
                  <div style={{ borderTop: "1px solid var(--gray-200)", paddingTop: "0.5rem" }}>
                    {p.detalles?.map(d => (
                      <div key={d.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", padding: "0.2rem 0" }}>
                        <span>Producto #{d.producto_id} × {d.cantidad}</span>
                        <span>S/. {(d.precio_unitario * d.cantidad).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "0.5rem", textAlign: "right", fontWeight: 700 }}>Total: S/. {parseFloat(p.total).toFixed(2)}</div>
                </div>
              ))
            }
          </>
        )}
      </div>
    </div>
  );
}

function GuiaCard({ step, title, desc, action, btn, done }) {
  return (
    <div style={{ background: "#fff", borderRadius: "var(--radius)", padding: "1.5rem", boxShadow: "var(--shadow-sm)", border: done ? "1.5px solid var(--green)" : "1px solid var(--gray-200)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: done ? "var(--green)" : "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>{done ? "✓" : step}</div>
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem" }}>{title}</h3>
      </div>
      <p style={{ fontSize: "0.85rem", color: "var(--gray-600)", marginBottom: "1rem" }}>{desc}</p>
      {!done && <button onClick={action} style={{ padding: "0.5rem 1rem", background: "var(--primary-light)", color: "var(--primary)", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "0.85rem" }}>{btn}</button>}
      {done && <span style={{ color: "var(--green)", fontSize: "0.85rem", fontWeight: 600 }}>✅ Completado</span>}
    </div>
  );
}

function KPI({ icon, n, label, color, badge }) {
  return (
    <div style={{ background: "#fff", borderRadius: "var(--radius-sm)", padding: "1rem 1.25rem", boxShadow: "var(--shadow-sm)", border: "1px solid var(--gray-200)", display: "flex", alignItems: "center", gap: "0.75rem", position: "relative" }}>
      <span style={{ fontSize: "1.5rem" }}>{icon}</span>
      <div>
        <div style={{ fontSize: "1.5rem", fontWeight: 700, color, lineHeight: 1 }}>{n}</div>
        <div style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>{label}</div>
      </div>
      {badge > 0 && <div style={{ position: "absolute", top: "6px", right: "8px", background: "var(--primary)", color: "#fff", borderRadius: "10px", padding: "0 6px", fontSize: "0.7rem", fontWeight: 700 }}>{badge} nuevos</div>}
    </div>
  );
}

function DocRow({ titulo, estado, vence }) {
  const map = { pendiente: ["var(--yellow-light)","var(--yellow)"], aprobado: ["var(--green-light)","var(--green)"], rechazado: ["var(--red-light)","var(--primary)"] };
  const [bg, color] = map[estado] || map.pendiente;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0", borderBottom: "1px solid var(--gray-200)" }}>
      <div>
        <div style={{ fontSize: "0.88rem", fontWeight: 500 }}>{titulo}</div>
        <div style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>Vence: {new Date(vence).toLocaleDateString("es-PE")}</div>
      </div>
      <span style={{ background: bg, color, padding: "0.15rem 0.7rem", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600 }}>{estado}</span>
    </div>
  );
}

function Field({ label, children }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}><label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--gray-600)" }}>{label}</label>{children}</div>;
}

function Empty({ msg }) {
  return <div style={{ textAlign: "center", padding: "2rem", color: "var(--gray-400)", fontSize: "0.88rem" }}>🍽️ {msg}</div>;
}

function EstadoBadge({ estado }) {
  const map = { pendiente: ["#fef3c7","#92400e"], confirmado: ["#dbeafe","#1e40af"], entregado: ["#d1fae5","#065f46"], cancelado: ["#fee2e2","#991b1b"] };
  const [bg, color] = map[estado] || ["#f3f4f6","#374151"];
  return <span style={{ background: bg, color, padding: "0.2rem 0.7rem", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 600 }}>{estado}</span>;
}

function Toast({ text, ok }) {
  return <div style={{ position: "fixed", top: "80px", right: "1.5rem", zIndex: 999, background: ok ? "#065f46" : "#991b1b", color: "#fff", padding: "0.75rem 1.25rem", borderRadius: "10px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", fontSize: "0.9rem" }}>{text}</div>;
}

const s = {
  page: { minHeight: "100vh", background: "var(--gray-50)" },
  header: { background: "linear-gradient(135deg, #c0392b, #7b241c)", color: "#fff", padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" },
  headerLeft: { display: "flex", alignItems: "center", gap: "1rem" },
  avatar: { width: "52px", height: "52px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 700 },
  negocioNombre: { fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", marginBottom: "0.3rem" },
  sello: { display: "inline-block", padding: "0.2rem 0.8rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600 },
  selloMsg: { fontSize: "0.85rem", opacity: 0.85, maxWidth: "300px" },
  kpiBar: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", padding: "1rem 1.5rem", background: "#fff", borderBottom: "1px solid var(--gray-200)" },
  tabBar: { display: "flex", gap: "0", background: "#fff", borderBottom: "1px solid var(--gray-200)", paddingLeft: "1.5rem", overflowX: "auto" },
  tab: { padding: "0.85rem 1.1rem", border: "none", background: "none", color: "var(--gray-600)", fontWeight: 500, fontSize: "0.88rem", borderBottom: "2px solid transparent", whiteSpace: "nowrap" },
  tabActive: { padding: "0.85rem 1.1rem", border: "none", background: "none", color: "var(--primary)", fontWeight: 600, fontSize: "0.88rem", borderBottom: "2px solid var(--primary)", whiteSpace: "nowrap" },
  content: { maxWidth: "1000px", margin: "0 auto", padding: "1.5rem" },
  iniciGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" },
  formCard: { background: "#fff", borderRadius: "var(--radius)", padding: "1.5rem", boxShadow: "var(--shadow-sm)", border: "1px solid var(--gray-200)" },
  listCard: { background: "#fff", borderRadius: "var(--radius)", padding: "1.5rem", boxShadow: "var(--shadow-sm)", border: "1px solid var(--gray-200)" },
  cardTitle: { fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--gray-200)" },
  form: { display: "flex", flexDirection: "column", gap: "0.85rem" },
  input: { padding: "0.6rem 0.8rem", border: "1.5px solid var(--gray-200)", borderRadius: "8px", fontSize: "0.9rem" },
  btn: { padding: "0.7rem", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, marginTop: "0.25rem" },
  prodRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0", borderBottom: "1px solid var(--gray-200)" },
  btnDel: { padding: "0.3rem 0.7rem", background: "var(--red-light)", color: "var(--primary)", border: "none", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600 },
  sectionTitle: { fontFamily: "'Playfair Display',serif", fontSize: "1.4rem", marginBottom: "1.25rem" },
  pedidoCard: { background: "#fff", borderRadius: "var(--radius)", padding: "1.25rem", marginBottom: "1rem", boxShadow: "var(--shadow-sm)", border: "1px solid var(--gray-200)" },
  pedidoHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" },
};
