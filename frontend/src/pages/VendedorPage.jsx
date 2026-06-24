import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function VendedorPage() {
  const [tab, setTab] = useState("licencia");
  const [licencias, setLicencias] = useState([]);
  const [certificados, setCertificados] = useState([]);
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [msg, setMsg] = useState("");

  const [licForm, setLicForm] = useState({ numero_licencia: "", fecha_emision: "", fecha_vencimiento: "" });
  const [certForm, setCertForm] = useState({ entidad_emisora: "", fecha_emision: "", fecha_vencimiento: "" });
  const [prodForm, setProdForm] = useState({ nombre: "", especie_declarada: "", precio: "", descripcion: "" });

  useEffect(() => {
    cargarTodo();
  }, []);

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
    } catch { /* token aún no listo en primer render */ }
  }

  function flash(m) { setMsg(m); setTimeout(() => setMsg(""), 3000); }

  async function subirLicencia(e) {
    e.preventDefault();
    try {
      await api.post("/vendedores/mis-licencias", licForm);
      flash("Licencia subida correctamente");
      setLicForm({ numero_licencia: "", fecha_emision: "", fecha_vencimiento: "" });
      cargarTodo();
    } catch (err) { flash("Error: " + (err.response?.data?.detail || err.message)); }
  }

  async function subirCertificado(e) {
    e.preventDefault();
    try {
      await api.post("/vendedores/mis-certificados", certForm);
      flash("Certificado subido correctamente");
      setCertForm({ entidad_emisora: "", fecha_emision: "", fecha_vencimiento: "" });
      cargarTodo();
    } catch (err) { flash("Error: " + (err.response?.data?.detail || err.message)); }
  }

  async function crearProducto(e) {
    e.preventDefault();
    try {
      await api.post("/productos", { ...prodForm, precio: parseFloat(prodForm.precio) });
      flash("Producto creado correctamente");
      setProdForm({ nombre: "", especie_declarada: "", precio: "", descripcion: "" });
      cargarTodo();
    } catch (err) { flash("Error: " + (err.response?.data?.detail || err.message)); }
  }

  async function eliminarProducto(id) {
    if (!confirm("¿Eliminar producto?")) return;
    await api.delete(`/productos/${id}`);
    cargarTodo();
  }

  const sello = perfil?.estado_verificacion === "verificado"
    ? { label: "✅ VERIFICADO", color: "#276749" }
    : perfil?.estado_verificacion === "no_verificado"
    ? { label: "🔴 NO VERIFICADO", color: "#c53030" }
    : { label: "⏳ PENDIENTE", color: "#b7791f" };

  return (
    <div style={styles.page}>
      {perfil && (
        <div style={styles.perfilBar}>
          <strong>{perfil.nombre_negocio}</strong>
          <span style={{ color: sello.color, fontWeight: "bold" }}>{sello.label}</span>
        </div>
      )}
      {msg && <div style={styles.flash}>{msg}</div>}

      <div style={styles.tabs}>
        {["licencia", "certificado", "productos", "pedidos"].map(t => (
          <button key={t} style={tab === t ? styles.tabActive : styles.tab} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "licencia" && (
        <div style={styles.section}>
          <h3>Subir Licencia Municipal</h3>
          <form onSubmit={subirLicencia} style={styles.form}>
            <input placeholder="Número de licencia" value={licForm.numero_licencia}
              onChange={e => setLicForm({ ...licForm, numero_licencia: e.target.value })} style={styles.input} required />
            <label>Fecha emisión</label>
            <input type="datetime-local" value={licForm.fecha_emision}
              onChange={e => setLicForm({ ...licForm, fecha_emision: e.target.value })} style={styles.input} required />
            <label>Fecha vencimiento</label>
            <input type="datetime-local" value={licForm.fecha_vencimiento}
              onChange={e => setLicForm({ ...licForm, fecha_vencimiento: e.target.value })} style={styles.input} required />
            <button type="submit" style={styles.btn}>Subir licencia</button>
          </form>
          <h4>Mis licencias</h4>
          <Table rows={licencias} cols={["id", "numero_licencia", "estado", "fecha_vencimiento"]} />
        </div>
      )}

      {tab === "certificado" && (
        <div style={styles.section}>
          <h3>Subir Certificado Sanitario</h3>
          <form onSubmit={subirCertificado} style={styles.form}>
            <input placeholder="Entidad emisora" value={certForm.entidad_emisora}
              onChange={e => setCertForm({ ...certForm, entidad_emisora: e.target.value })} style={styles.input} required />
            <label>Fecha emisión</label>
            <input type="datetime-local" value={certForm.fecha_emision}
              onChange={e => setCertForm({ ...certForm, fecha_emision: e.target.value })} style={styles.input} required />
            <label>Fecha vencimiento</label>
            <input type="datetime-local" value={certForm.fecha_vencimiento}
              onChange={e => setCertForm({ ...certForm, fecha_vencimiento: e.target.value })} style={styles.input} required />
            <button type="submit" style={styles.btn}>Subir certificado</button>
          </form>
          <h4>Mis certificados</h4>
          <Table rows={certificados} cols={["id", "entidad_emisora", "estado", "fecha_vencimiento"]} />
        </div>
      )}

      {tab === "productos" && (
        <div style={styles.section}>
          <h3>Publicar Producto</h3>
          <form onSubmit={crearProducto} style={styles.form}>
            <input placeholder="Nombre del producto" value={prodForm.nombre}
              onChange={e => setProdForm({ ...prodForm, nombre: e.target.value })} style={styles.input} required />
            <input placeholder="Especie declarada (ej: pota)" value={prodForm.especie_declarada}
              onChange={e => setProdForm({ ...prodForm, especie_declarada: e.target.value })} style={styles.input} required />
            <input type="number" step="0.01" placeholder="Precio (S/.)" value={prodForm.precio}
              onChange={e => setProdForm({ ...prodForm, precio: e.target.value })} style={styles.input} required />
            <input placeholder="Descripción (opcional)" value={prodForm.descripcion}
              onChange={e => setProdForm({ ...prodForm, descripcion: e.target.value })} style={styles.input} />
            <button type="submit" style={styles.btn}>Publicar producto</button>
          </form>
          <h4>Mis productos ({productos.length})</h4>
          <div style={styles.grid}>
            {productos.map(p => (
              <div key={p.id} style={styles.card}>
                <strong>{p.nombre}</strong>
                <p>Especie declarada: {p.especie_declarada}</p>
                {p.especie_verificada && <p style={{ color: "#276749" }}>✅ Verificada: {p.especie_verificada}</p>}
                <p>S/. {p.precio}</p>
                <button onClick={() => eliminarProducto(p.id)} style={styles.btnDanger}>Eliminar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "pedidos" && (
        <div style={styles.section}>
          <h3>Pedidos Recibidos ({pedidos.length})</h3>
          {pedidos.length === 0 && <p style={{ color: "#718096" }}>No tienes pedidos aún.</p>}
          {pedidos.map(p => (
            <div key={p.id} style={styles.pedidoCard}>
              <strong>Pedido #{p.id}</strong> — Estado: <em>{p.estado}</em> — Total: S/. {p.total}
              <br /><small>{new Date(p.created_at).toLocaleString()}</small>
              <ul>
                {p.detalles?.map(d => (
                  <li key={d.id}>Producto #{d.producto_id} × {d.cantidad} = S/. {(d.precio_unitario * d.cantidad).toFixed(2)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Table({ rows, cols }) {
  if (!rows.length) return <p style={{ color: "#718096" }}>Sin registros.</p>;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
      <thead>
        <tr>{cols.map(c => <th key={c} style={thStyle}>{c}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? "#f7fafc" : "#fff" }}>
            {cols.map(c => <td key={c} style={tdStyle}>{String(r[c] ?? "—")}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const thStyle = { background: "#e2e8f0", padding: "0.4rem 0.6rem", textAlign: "left", border: "1px solid #cbd5e0" };
const tdStyle = { padding: "0.4rem 0.6rem", border: "1px solid #e2e8f0" };

const styles = {
  page: { padding: "1rem 1.5rem", maxWidth: "900px", margin: "0 auto" },
  perfilBar: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ebf8ff", padding: "0.75rem 1rem", borderRadius: "6px", marginBottom: "1rem" },
  flash: { background: "#c6f6d5", color: "#276749", padding: "0.6rem 1rem", borderRadius: "4px", marginBottom: "1rem" },
  tabs: { display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" },
  tab: { padding: "0.4rem 1rem", border: "1px solid #cbd5e0", background: "#edf2f7", cursor: "pointer", borderRadius: "4px" },
  tabActive: { padding: "0.4rem 1rem", border: "1px solid #3182ce", background: "#3182ce", color: "#fff", cursor: "pointer", borderRadius: "4px" },
  section: { background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  form: { display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem", maxWidth: "400px" },
  input: { padding: "0.5rem 0.75rem", border: "1px solid #cbd5e0", borderRadius: "4px" },
  btn: { padding: "0.6rem", background: "#2b6cb0", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" },
  btnDanger: { padding: "0.3rem 0.7rem", background: "#c53030", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", marginTop: "0.5rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginTop: "0.5rem" },
  card: { border: "1px solid #e2e8f0", padding: "0.75rem", borderRadius: "6px" },
  pedidoCard: { border: "1px solid #e2e8f0", padding: "0.75rem", borderRadius: "6px", marginBottom: "0.75rem" },
};
