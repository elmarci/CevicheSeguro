import React, { useEffect, useRef, useState } from "react";
import api from "../services/api";

const ESPECIES = ["pota","calamar","pulpo","lenguado","corvina","pejerrey","caballa","mixto"];
const DIAS = ["Lun-Dom","Lun-Vie","Lun-Sab","Mar-Dom","Fines de semana"];
const ESTADOS_PEDIDO = [
  { value:"confirmado", label:"✅ Confirmar", color:"#2980b9" },
  { value:"en_preparacion", label:"👨‍🍳 En preparación", color:"#f39c12" },
  { value:"listo", label:"🍽️ Listo para recoger/despachar", color:"#8e44ad" },
  { value:"en_camino", label:"🛵 En camino", color:"#e67e22" },
  { value:"entregado", label:"✅ Entregado", color:"#27ae60" },
  { value:"cancelado", label:"❌ Cancelar", color:"#c0392b" },
];

export default function VendedorPage() {
  const [tab, setTab] = useState("inicio");
  const [perfil, setPerfil] = useState(null);
  const [licencias, setLicencias] = useState([]);
  const [certificados, setCertificados] = useState([]);
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [msg, setMsg] = useState({ text:"", ok:true });
  const [loadingForm, setLoadingForm] = useState("");
  const [pedidoNota, setPedidoNota] = useState({});

  const [licForm, setLicForm] = useState({ numero_licencia:"", autoridad_emisora:"", fecha_emision:"", fecha_vencimiento:"" });
  const [certForm, setCertForm] = useState({ entidad_emisora:"", numero_certificado:"", fecha_emision:"", fecha_vencimiento:"" });
  const [prodForm, setProdForm] = useState({ nombre:"", especie_declarada:"pota", precio:"", descripcion:"" });
  const [perfilForm, setPerfilForm] = useState({
    nombre_negocio:"", descripcion:"", direccion:"", distrito:"", ciudad:"Lima",
    telefono_contacto:"", horario_apertura:"09:00", horario_cierre:"20:00",
    dias_atencion:"Lun-Dom", precio_minimo:"", precio_maximo:"", especialidad:"",
  });

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
      setPerfil(p.data); setLicencias(l.data); setCertificados(c.data);
      setProductos(pr.data); setPedidos(ped.data);
      setPerfilForm({
        nombre_negocio: p.data.nombre_negocio || "",
        descripcion: p.data.descripcion || "",
        direccion: p.data.direccion || "",
        distrito: p.data.distrito || "",
        ciudad: p.data.ciudad || "Lima",
        telefono_contacto: p.data.telefono_contacto || "",
        horario_apertura: p.data.horario_apertura || "09:00",
        horario_cierre: p.data.horario_cierre || "20:00",
        dias_atencion: p.data.dias_atencion || "Lun-Dom",
        precio_minimo: p.data.precio_minimo || "",
        precio_maximo: p.data.precio_maximo || "",
        especialidad: p.data.especialidad || "",
      });
    } catch {}
  }

  function flash(text, ok=true) { setMsg({text,ok}); setTimeout(()=>setMsg({text:"",ok:true}),4000); }

  async function guardarPerfil(e) {
    e.preventDefault(); setLoadingForm("perfil");
    try {
      const payload = { ...perfilForm };
      if (payload.precio_minimo) payload.precio_minimo = parseFloat(payload.precio_minimo);
      if (payload.precio_maximo) payload.precio_maximo = parseFloat(payload.precio_maximo);
      await api.put("/vendedores/mi-perfil", payload);
      flash("✅ Perfil del negocio actualizado y visible para los clientes.");
      cargarTodo();
    } catch(err) { flash(err.response?.data?.detail || "Error al actualizar perfil", false); }
    finally { setLoadingForm(""); }
  }

  async function subirLicencia(e) {
    e.preventDefault(); setLoadingForm("lic");
    try {
      await api.post("/vendedores/mis-licencias", { numero_licencia:licForm.numero_licencia, fecha_emision:licForm.fecha_emision, fecha_vencimiento:licForm.fecha_vencimiento });
      flash("✅ Licencia registrada. Pendiente de revisión por inspector.");
      setLicForm({ numero_licencia:"", autoridad_emisora:"", fecha_emision:"", fecha_vencimiento:"" });
      const r = await api.get("/vendedores/mis-licencias"); setLicencias(r.data);
    } catch(err) { flash(err.response?.data?.detail||"Error", false); }
    finally { setLoadingForm(""); }
  }

  async function subirCertificado(e) {
    e.preventDefault(); setLoadingForm("cert");
    try {
      await api.post("/vendedores/mis-certificados", { entidad_emisora:certForm.entidad_emisora, fecha_emision:certForm.fecha_emision, fecha_vencimiento:certForm.fecha_vencimiento });
      flash("✅ Certificado registrado. Pendiente de revisión por inspector.");
      setCertForm({ entidad_emisora:"", numero_certificado:"", fecha_emision:"", fecha_vencimiento:"" });
      const r = await api.get("/vendedores/mis-certificados"); setCertificados(r.data);
    } catch(err) { flash(err.response?.data?.detail||"Error", false); }
    finally { setLoadingForm(""); }
  }

  async function crearProducto(e) {
    e.preventDefault(); setLoadingForm("prod");
    try {
      await api.post("/productos", { nombre:prodForm.nombre, especie_declarada:prodForm.especie_declarada, precio:parseFloat(prodForm.precio), descripcion:prodForm.descripcion||null });
      flash("✅ Producto publicado. Ya visible para los clientes.");
      setProdForm({ nombre:"", especie_declarada:"pota", precio:"", descripcion:"" });
      const r = await api.get("/productos/mis-productos"); setProductos(r.data);
    } catch(err) { flash(err.response?.data?.detail||"Error", false); }
    finally { setLoadingForm(""); }
  }

  async function eliminarProducto(id) {
    if (!confirm("¿Eliminar este producto?")) return;
    await api.delete(`/productos/${id}`);
    setProductos(prev=>prev.filter(p=>p.id!==id));
  }

  async function cambiarEstadoPedido(pedidoId, estado) {
    const nota = pedidoNota[pedidoId] || "";
    try {
      await api.put(`/pedidos/${pedidoId}/estado`, { estado, nota: nota||null });
      flash(`✅ Pedido #${pedidoId} actualizado a: ${estado}`);
      setPedidoNota(prev=>({...prev,[pedidoId]:""}));
      const r = await api.get("/pedidos/pedidos-recibidos"); setPedidos(r.data);
    } catch(err) { flash(err.response?.data?.detail||"Error", false); }
  }

  const selloMap = {
    verificado:    { label:"✅ Verificado",    bg:"var(--green-light)",  color:"var(--green)",  tip:"Tu negocio está verificado. Los clientes pueden comprarte con confianza." },
    no_verificado: { label:"🔴 No verificado", bg:"var(--red-light)",    color:"var(--primary)",tip:"Un documento venció. Actualiza tu licencia o certificado." },
    pendiente:     { label:"⏳ Pendiente",      bg:"var(--yellow-light)", color:"#92400e",       tip:"El inspector aún no ha revisado tus documentos." },
  };
  const selloInfo = selloMap[perfil?.estado_verificacion] || selloMap.pendiente;
  const nuevosPedidos = pedidos.filter(p=>p.estado==="pendiente").length;

  return (
    <div style={s.page}>
      {msg.text && <Toast text={msg.text} ok={msg.ok} />}

      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.avatar}>{(perfil?.nombre_negocio||"?").charAt(0)}</div>
          <div>
            <h2 style={s.negocio}>{perfil?.nombre_negocio||"Mi negocio"}</h2>
            {perfil?.direccion && <div style={s.ubicacion}>📍 {perfil.direccion}{perfil.distrito ? `, ${perfil.distrito}` : ""}</div>}
            <div style={{...s.selloPill, background:selloInfo.bg, color:selloInfo.color}}>{selloInfo.label}</div>
            <p style={s.selloTip}>{selloInfo.tip}</p>
          </div>
        </div>
        <div style={s.kpis}>
          <Kpi n={licencias.filter(l=>l.estado==="aprobado").length} label="Licencias" icon="📋" />
          <Kpi n={certificados.filter(c=>c.estado==="aprobado").length} label="Certificados" icon="🏥" />
          <Kpi n={productos.length} label="Productos" icon="🍽️" />
          <Kpi n={nuevosPedidos} label="Pedidos nuevos" icon="📦" alert={nuevosPedidos>0} />
        </div>
      </div>

      <div style={s.tabBar}>
        {[["inicio","🏠 Inicio"],["perfil","🏪 Mi negocio"],["licencia","📋 Licencias"],["certificado","🏥 Certificados"],["productos","🍽️ Productos"],["pedidos",`📦 Pedidos${nuevosPedidos>0?` (${nuevosPedidos})`:""}` ]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={tab===t?s.tabActive:s.tab}>{l}</button>
        ))}
      </div>

      <div style={s.body}>

        {/* ── INICIO ── */}
        {tab==="inicio" && (
          <div>
            <h3 style={s.secTitle}>Requisitos para aparecer como Verificado</h3>
            <div style={s.guiaGrid}>
              <GuiaStep n={1} done={licencias.some(l=>l.estado==="aprobado")} pendiente={licencias.some(l=>l.estado==="pendiente")} titulo="Licencia municipal" desc="Sube tu licencia de funcionamiento emitida por la municipalidad." onClick={()=>setTab("licencia")} />
              <GuiaStep n={2} done={certificados.some(c=>c.estado==="aprobado")} pendiente={certificados.some(c=>c.estado==="pendiente")} titulo="Certificado sanitario" desc="Sube tu certificado emitido por DIGESA o autoridad de salud." onClick={()=>setTab("certificado")} />
              <GuiaStep n={3} done={!!perfil?.direccion} pendiente={false} titulo="Completa tu perfil" desc="Agrega dirección, horarios y rango de precios para atraer más clientes." onClick={()=>setTab("perfil")} />
              <GuiaStep n={4} done={productos.length>0} pendiente={false} titulo="Publica tus platos" desc="Registra tus platos con especie declarada para que los clientes confíen en ti." onClick={()=>setTab("productos")} />
            </div>
            {pedidos.length>0 && (
              <div style={s.card}>
                <h3 style={s.cardTitle}>Últimos pedidos</h3>
                {pedidos.slice(0,3).map(p=>(
                  <div key={p.id} style={s.pedidoRow}>
                    <span>Pedido #{p.id} · {new Date(p.created_at).toLocaleDateString("es-PE")}</span>
                    <div style={{display:"flex",gap:"0.75rem",alignItems:"center"}}>
                      <EstadoBadge estado={p.estado} />
                      <span style={{fontWeight:700,color:"var(--primary)"}}>S/. {parseFloat(p.total).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                {pedidos.length>3 && <button style={s.verMas} onClick={()=>setTab("pedidos")}>Ver todos →</button>}
              </div>
            )}
          </div>
        )}

        {/* ── PERFIL DEL NEGOCIO ── */}
        {tab==="perfil" && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>🏪 Perfil del negocio</h3>
            <form onSubmit={guardarPerfil} style={s.form}>
              <SectionLabel>Información básica</SectionLabel>
              <div style={s.row3}>
                <Field label="Nombre del negocio *"><input value={perfilForm.nombre_negocio} onChange={e=>setPerfilForm({...perfilForm,nombre_negocio:e.target.value})} style={s.input} required placeholder="Cevichería El Pulpo Dorado" /></Field>
                <Field label="Teléfono de contacto"><input value={perfilForm.telefono_contacto} onChange={e=>setPerfilForm({...perfilForm,telefono_contacto:e.target.value})} style={s.input} placeholder="987 654 321" /></Field>
                <Field label="Ciudad"><input value={perfilForm.ciudad} onChange={e=>setPerfilForm({...perfilForm,ciudad:e.target.value})} style={s.input} /></Field>
              </div>
              <div style={s.row2}>
                <Field label="Dirección exacta"><input value={perfilForm.direccion} onChange={e=>setPerfilForm({...perfilForm,direccion:e.target.value})} style={s.input} placeholder="Av. Larco 456, Stand 12" /></Field>
                <Field label="Distrito"><input value={perfilForm.distrito} onChange={e=>setPerfilForm({...perfilForm,distrito:e.target.value})} style={s.input} placeholder="Miraflores" /></Field>
              </div>
              <Field label="Descripción del negocio"><textarea value={perfilForm.descripcion} onChange={e=>setPerfilForm({...perfilForm,descripcion:e.target.value})} style={{...s.input,height:"70px",resize:"vertical"}} placeholder="Especialistas en ceviche de pota fresca. 10 años de experiencia..." /></Field>
              <Field label="Especialidad"><input value={perfilForm.especialidad} onChange={e=>setPerfilForm({...perfilForm,especialidad:e.target.value})} style={s.input} placeholder="Ceviche clásico, tiradito, leche de tigre" /></Field>

              <SectionLabel>Horario de atención</SectionLabel>
              <div style={s.row3}>
                <Field label="Apertura"><input type="time" value={perfilForm.horario_apertura} onChange={e=>setPerfilForm({...perfilForm,horario_apertura:e.target.value})} style={s.input} /></Field>
                <Field label="Cierre"><input type="time" value={perfilForm.horario_cierre} onChange={e=>setPerfilForm({...perfilForm,horario_cierre:e.target.value})} style={s.input} /></Field>
                <Field label="Días de atención">
                  <select value={perfilForm.dias_atencion} onChange={e=>setPerfilForm({...perfilForm,dias_atencion:e.target.value})} style={s.input}>
                    {DIAS.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
              </div>

              <SectionLabel>Rango de precios (referencial)</SectionLabel>
              <div style={s.row2}>
                <Field label="Precio mínimo (S/.)"><input type="number" step="0.50" min="0" value={perfilForm.precio_minimo} onChange={e=>setPerfilForm({...perfilForm,precio_minimo:e.target.value})} style={s.input} placeholder="12.00" /></Field>
                <Field label="Precio máximo (S/.)"><input type="number" step="0.50" min="0" value={perfilForm.precio_maximo} onChange={e=>setPerfilForm({...perfilForm,precio_maximo:e.target.value})} style={s.input} placeholder="35.00" /></Field>
              </div>

              <button type="submit" style={s.btn} disabled={loadingForm==="perfil"}>{loadingForm==="perfil"?"Guardando...":"Guardar perfil del negocio"}</button>
            </form>
          </div>
        )}

        {/* ── LICENCIAS ── */}
        {tab==="licencia" && (
          <div style={s.split}>
            <div style={s.card}>
              <h3 style={s.cardTitle}>➕ Registrar licencia</h3>
              <form onSubmit={subirLicencia} style={s.form}>
                <Field label="Número de licencia *"><input value={licForm.numero_licencia} onChange={e=>setLicForm({...licForm,numero_licencia:e.target.value})} style={s.input} placeholder="LM-2024-001234" required /></Field>
                <Field label="Autoridad emisora"><input value={licForm.autoridad_emisora} onChange={e=>setLicForm({...licForm,autoridad_emisora:e.target.value})} style={s.input} placeholder="Municipalidad de Miraflores" /></Field>
                <div style={s.row2}>
                  <Field label="Fecha emisión *"><input type="datetime-local" value={licForm.fecha_emision} onChange={e=>setLicForm({...licForm,fecha_emision:e.target.value})} style={s.input} required /></Field>
                  <Field label="Fecha vencimiento *"><input type="datetime-local" value={licForm.fecha_vencimiento} onChange={e=>setLicForm({...licForm,fecha_vencimiento:e.target.value})} style={s.input} required /></Field>
                </div>
                <InfoBox text="Un inspector revisará y aprobará tu licencia. Recibirás el cambio de estado en tu panel." />
                <button type="submit" style={s.btn} disabled={loadingForm==="lic"}>{loadingForm==="lic"?"Registrando...":"Registrar licencia"}</button>
              </form>
            </div>
            <div style={s.card} ref={listRef}>
              <h3 style={s.cardTitle}>Mis licencias ({licencias.length})</h3>
              {licencias.length===0?<Empty msg="Sin licencias aún." />:licencias.map(l=><DocCard key={l.id} titulo={l.numero_licencia} estado={l.estado} vence={l.fecha_vencimiento} />)}
            </div>
          </div>
        )}

        {/* ── CERTIFICADOS ── */}
        {tab==="certificado" && (
          <div style={s.split}>
            <div style={s.card}>
              <h3 style={s.cardTitle}>➕ Registrar certificado</h3>
              <form onSubmit={subirCertificado} style={s.form}>
                <Field label="Entidad emisora *">
                  <select value={certForm.entidad_emisora} onChange={e=>setCertForm({...certForm,entidad_emisora:e.target.value})} style={s.input} required>
                    <option value="">Selecciona...</option>
                    {["DIGESA","SANIPES","Municipalidad Provincial","Municipalidad Distrital","SENASA","Otra"].map(v=><option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Número de certificado"><input value={certForm.numero_certificado} onChange={e=>setCertForm({...certForm,numero_certificado:e.target.value})} style={s.input} placeholder="CERT-DIGESA-2024-0456" /></Field>
                <div style={s.row2}>
                  <Field label="Fecha emisión *"><input type="datetime-local" value={certForm.fecha_emision} onChange={e=>setCertForm({...certForm,fecha_emision:e.target.value})} style={s.input} required /></Field>
                  <Field label="Fecha vencimiento *"><input type="datetime-local" value={certForm.fecha_vencimiento} onChange={e=>setCertForm({...certForm,fecha_vencimiento:e.target.value})} style={s.input} required /></Field>
                </div>
                <InfoBox text="El certificado sanitario acredita que cumples con las normas de higiene y manipulación de alimentos." />
                <button type="submit" style={s.btn} disabled={loadingForm==="cert"}>{loadingForm==="cert"?"Registrando...":"Registrar certificado"}</button>
              </form>
            </div>
            <div style={s.card}>
              <h3 style={s.cardTitle}>Mis certificados ({certificados.length})</h3>
              {certificados.length===0?<Empty msg="Sin certificados aún." />:certificados.map(c=><DocCard key={c.id} titulo={c.entidad_emisora} estado={c.estado} vence={c.fecha_vencimiento} />)}
            </div>
          </div>
        )}

        {/* ── PRODUCTOS ── */}
        {tab==="productos" && (
          <div style={s.split}>
            <div style={s.card}>
              <h3 style={s.cardTitle}>➕ Publicar producto</h3>
              <form onSubmit={crearProducto} style={s.form}>
                <Field label="Nombre del plato *"><input value={prodForm.nombre} onChange={e=>setProdForm({...prodForm,nombre:e.target.value})} style={s.input} placeholder="Ceviche mixto especial" required /></Field>
                <div style={s.row2}>
                  <Field label="Especie declarada *">
                    <select value={prodForm.especie_declarada} onChange={e=>setProdForm({...prodForm,especie_declarada:e.target.value})} style={s.input}>
                      {ESPECIES.map(e=><option key={e} value={e}>{e.charAt(0).toUpperCase()+e.slice(1)}</option>)}
                    </select>
                  </Field>
                  <Field label="Precio (S/.) *"><input type="number" step="0.50" min="1" value={prodForm.precio} onChange={e=>setProdForm({...prodForm,precio:e.target.value})} style={s.input} placeholder="18.00" required /></Field>
                </div>
                <Field label="Descripción"><textarea value={prodForm.descripcion} onChange={e=>setProdForm({...prodForm,descripcion:e.target.value})} style={{...s.input,height:"60px",resize:"vertical"}} placeholder="Con leche de tigre, cebolla morada, ají limo y choclo" /></Field>
                <InfoBox text="La especie declarada es pública y auditable. Un inspector puede verificarla." />
                <button type="submit" style={s.btn} disabled={loadingForm==="prod"}>{loadingForm==="prod"?"Publicando...":"Publicar producto"}</button>
              </form>
            </div>
            <div style={s.card}>
              <h3 style={s.cardTitle}>Mis productos ({productos.length})</h3>
              {productos.length===0?<Empty msg="Sin productos aún." />:productos.map(p=>(
                <div key={p.id} style={s.prodRow}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600}}>{p.nombre}</div>
                    <div style={{display:"flex",gap:"0.35rem",flexWrap:"wrap",margin:"0.2rem 0"}}>
                      <span style={s.especieBadge}>🐟 {p.especie_declarada}</span>
                      {p.especie_verificada && <span style={s.verificBadge}>🔬 Verificada: {p.especie_verificada}</span>}
                    </div>
                    <span style={{fontWeight:700,color:"var(--primary)"}}>S/. {parseFloat(p.precio).toFixed(2)}</span>
                  </div>
                  <button onClick={()=>eliminarProducto(p.id)} style={s.btnElim}>🗑</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PEDIDOS ── */}
        {tab==="pedidos" && (
          <div>
            <h3 style={s.secTitle}>Gestión de pedidos ({pedidos.length})</h3>
            {pedidos.length===0?<Empty msg="Aún no tienes pedidos." />:pedidos.map(p=>(
              <div key={p.id} style={s.pedidoCard}>
                <div style={s.pedidoTop}>
                  <div>
                    <span style={{fontWeight:700,fontSize:"1rem"}}>Pedido #{p.id}</span>
                    <span style={{fontSize:"0.8rem",color:"var(--gray-400)",marginLeft:"0.75rem"}}>{new Date(p.created_at).toLocaleString("es-PE")}</span>
                  </div>
                  <EstadoBadge estado={p.estado} />
                </div>

                {(p.direccion_entrega||p.telefono_contacto||p.notas) && (
                  <div style={s.entregaInfo}>
                    {p.direccion_entrega && <span>📍 {p.direccion_entrega}</span>}
                    {p.telefono_contacto && <span>📞 {p.telefono_contacto}</span>}
                    {p.metodo_pago && <span>💳 {p.metodo_pago}</span>}
                    {p.notas && <span style={{fontStyle:"italic"}}>📝 "{p.notas}"</span>}
                  </div>
                )}

                <div style={s.detallesPedido}>
                  {p.detalles?.map(d=>(
                    <div key={d.id} style={{display:"flex",justifyContent:"space-between",fontSize:"0.85rem"}}>
                      <span>Producto #{d.producto_id} × {d.cantidad}</span>
                      <span>S/. {(d.precio_unitario*d.cantidad).toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{textAlign:"right",fontWeight:800,color:"var(--primary)",marginTop:"0.4rem"}}>Total: S/. {parseFloat(p.total).toFixed(2)}</div>
                </div>

                {p.historial?.length > 0 && (
                  <div style={s.historial}>
                    {p.historial.map(ev=>(
                      <span key={ev.id} style={s.eventoChip}>
                        {ev.evento} · {new Date(ev.created_at).toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})}
                      </span>
                    ))}
                  </div>
                )}

                {!["entregado","cancelado"].includes(p.estado) && (
                  <div style={s.accionesPedido}>
                    <input value={pedidoNota[p.id]||""} onChange={e=>setPedidoNota(prev=>({...prev,[p.id]:e.target.value}))} style={{...s.input,flex:1,fontSize:"0.82rem",padding:"0.4rem 0.6rem"}} placeholder="Nota opcional (ej: 'Listo en 15 min')" />
                    <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
                      {ESTADOS_PEDIDO.filter(e=>e.value!==p.estado).map(e=>(
                        <button key={e.value} onClick={()=>cambiarEstadoPedido(p.id,e.value)} style={{...s.btnEstado,background:e.color}}>{e.label}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function GuiaStep({ n, done, pendiente, titulo, desc, onClick }) {
  return (
    <div style={{background:"#fff",borderRadius:"var(--radius)",padding:"1.25rem",border:done?"1.5px solid var(--green)":pendiente?"1.5px solid var(--yellow)":"1px solid var(--gray-200)",boxShadow:"var(--shadow-sm)"}}>
      <div style={{display:"flex",gap:"0.75rem",marginBottom:"0.6rem"}}>
        <div style={{width:"32px",height:"32px",borderRadius:"50%",background:done?"var(--green)":pendiente?"var(--yellow)":"var(--gray-200)",color:done||pendiente?"#fff":"var(--gray-400)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"0.85rem",flexShrink:0}}>{done?"✓":pendiente?"⌛":n}</div>
        <h4 style={{fontFamily:"'Playfair Display',serif",fontSize:"0.95rem",alignSelf:"center"}}>{titulo}</h4>
      </div>
      <p style={{fontSize:"0.8rem",color:"var(--gray-600)",marginBottom:"0.75rem",lineHeight:1.5}}>{desc}</p>
      {done&&<span style={{color:"var(--green)",fontSize:"0.8rem",fontWeight:600}}>✅ Completado</span>}
      {pendiente&&<span style={{color:"#92400e",fontSize:"0.8rem",fontWeight:600}}>⌛ En revisión</span>}
      {!done&&!pendiente&&<button onClick={onClick} style={{padding:"0.35rem 0.85rem",background:"var(--primary-light)",color:"var(--primary)",border:"none",borderRadius:"8px",fontWeight:600,fontSize:"0.8rem"}}>Completar →</button>}
    </div>
  );
}

function DocCard({ titulo, estado, vence }) {
  const m={pendiente:["#fef3c7","#92400e","⌛ Pendiente"],aprobado:["var(--green-light)","var(--green)","✅ Aprobado"],rechazado:["var(--red-light)","var(--primary)","❌ Rechazado"]};
  const [bg,color,label]=m[estado]||m.pendiente;
  const dias=Math.ceil((new Date(vence)-new Date())/(1000*60*60*24));
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"0.65rem 0",borderBottom:"1px solid var(--gray-100)"}}>
      <div>
        <div style={{fontWeight:600,fontSize:"0.88rem"}}>{titulo}</div>
        <div style={{fontSize:"0.72rem",color:"var(--gray-400)"}}>
          Vence: {new Date(vence).toLocaleDateString("es-PE")}
          {estado==="aprobado"&&dias<=30&&dias>0&&<span style={{color:"var(--accent)",marginLeft:"0.4rem"}}>⚠️ {dias}d</span>}
          {estado==="aprobado"&&dias<=0&&<span style={{color:"var(--primary)",marginLeft:"0.4rem"}}>⛔ Vencido</span>}
        </div>
      </div>
      <span style={{background:bg,color,padding:"0.15rem 0.65rem",borderRadius:"12px",fontSize:"0.72rem",fontWeight:600,whiteSpace:"nowrap"}}>{label}</span>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const m={pendiente:["#fef3c7","#92400e"],confirmado:["#dbeafe","#1e40af"],en_preparacion:["#ede9fe","#5b21b6"],listo:["#d1fae5","#065f46"],en_camino:["#ffedd5","#9a3412"],entregado:["#d1fae5","#065f46"],cancelado:["#fee2e2","#991b1b"]};
  const [bg,color]=m[estado]||["#f3f4f6","#374151"];
  return <span style={{background:bg,color,padding:"0.15rem 0.65rem",borderRadius:"20px",fontSize:"0.75rem",fontWeight:600}}>{estado}</span>;
}

function Field({label,children}){return<div style={{display:"flex",flexDirection:"column",gap:"0.3rem"}}><label style={{fontSize:"0.78rem",fontWeight:600,color:"var(--gray-600)"}}>{label}</label>{children}</div>;}
function SectionLabel({children}){return<div style={{fontSize:"0.75rem",fontWeight:700,color:"var(--gray-400)",textTransform:"uppercase",letterSpacing:"0.06em",paddingTop:"0.5rem"}}>{children}</div>;}
function InfoBox({text}){return<div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:"8px",padding:"0.55rem 0.75rem",fontSize:"0.76rem",color:"#1e40af",lineHeight:1.5}}>ℹ️ {text}</div>;}
function Empty({msg}){return<div style={{textAlign:"center",padding:"2rem",color:"var(--gray-400)",fontSize:"0.85rem"}}>🍽️ {msg}</div>;}
function Toast({text,ok}){return<div style={{position:"fixed",top:"72px",right:"1.5rem",zIndex:999,background:ok?"#065f46":"#991b1b",color:"#fff",padding:"0.75rem 1.25rem",borderRadius:"10px",boxShadow:"0 4px 16px rgba(0,0,0,0.2)",fontSize:"0.88rem",maxWidth:"340px",lineHeight:1.5}}>{text}</div>;}
function Kpi({n,label,icon,alert}){return<div style={{background:"rgba(255,255,255,0.12)",borderRadius:"8px",padding:"0.6rem 0.9rem",textAlign:"center",border:alert?"1px solid #fde68a":"1px solid transparent"}}><div style={{fontSize:"1.1rem"}}>{icon}</div><div style={{fontSize:"1.2rem",fontWeight:700,color:alert?"#fde68a":"#fff",lineHeight:1}}>{n}</div><div style={{fontSize:"0.62rem",opacity:.8}}>{label}</div></div>;}

const s = {
  page:{minHeight:"100vh",background:"var(--gray-50)"},
  header:{background:"linear-gradient(135deg,#c0392b,#7b241c)",color:"#fff",padding:"1.25rem 2rem",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"1rem"},
  headerLeft:{display:"flex",gap:"1rem",alignItems:"flex-start"},
  avatar:{width:"52px",height:"52px",borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",fontWeight:700,flexShrink:0},
  negocio:{fontFamily:"'Playfair Display',serif",fontSize:"1.25rem",marginBottom:"0.2rem"},
  ubicacion:{fontSize:"0.78rem",opacity:.85,marginBottom:"0.3rem"},
  selloPill:{display:"inline-block",padding:"0.15rem 0.75rem",borderRadius:"20px",fontSize:"0.75rem",fontWeight:600,marginBottom:"0.25rem"},
  selloTip:{fontSize:"0.72rem",opacity:.8,margin:0},
  kpis:{display:"flex",gap:"0.6rem",flexWrap:"wrap"},
  tabBar:{display:"flex",background:"#fff",borderBottom:"1px solid var(--gray-200)",paddingLeft:"1.5rem",overflowX:"auto"},
  tab:{padding:"0.8rem 0.9rem",border:"none",background:"none",color:"var(--gray-600)",fontWeight:500,fontSize:"0.82rem",borderBottom:"2px solid transparent",whiteSpace:"nowrap"},
  tabActive:{padding:"0.8rem 0.9rem",border:"none",background:"none",color:"var(--primary)",fontWeight:600,fontSize:"0.82rem",borderBottom:"2px solid var(--primary)",whiteSpace:"nowrap"},
  body:{maxWidth:"1000px",margin:"0 auto",padding:"1.5rem"},
  secTitle:{fontFamily:"'Playfair Display',serif",fontSize:"1.2rem",marginBottom:"1rem"},
  guiaGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"1rem",marginBottom:"1.5rem"},
  card:{background:"#fff",borderRadius:"var(--radius)",padding:"1.5rem",boxShadow:"var(--shadow-sm)",border:"1px solid var(--gray-200)",marginBottom:"1rem"},
  cardTitle:{fontFamily:"'Playfair Display',serif",fontSize:"1rem",marginBottom:"1.25rem",paddingBottom:"0.65rem",borderBottom:"1px solid var(--gray-200)"},
  pedidoRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.5rem 0",borderBottom:"1px solid var(--gray-100)",fontSize:"0.85rem"},
  verMas:{marginTop:"0.65rem",padding:"0.35rem 0.8rem",background:"none",border:"1px solid var(--gray-200)",borderRadius:"8px",fontSize:"0.8rem",color:"var(--gray-600)",cursor:"pointer"},
  split:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.25rem"},
  form:{display:"flex",flexDirection:"column",gap:"0.85rem"},
  input:{padding:"0.6rem 0.75rem",border:"1.5px solid var(--gray-200)",borderRadius:"8px",fontSize:"0.88rem"},
  row2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"},
  row3:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.75rem"},
  btn:{padding:"0.7rem",background:"var(--primary)",color:"#fff",border:"none",borderRadius:"8px",fontWeight:600,fontSize:"0.9rem"},
  prodRow:{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.65rem 0",borderBottom:"1px solid var(--gray-100)"},
  especieBadge:{background:"var(--accent-light)",color:"#7c4a00",padding:"0.1rem 0.5rem",borderRadius:"10px",fontSize:"0.7rem",fontWeight:500},
  verificBadge:{background:"var(--green-light)",color:"var(--green)",padding:"0.1rem 0.5rem",borderRadius:"10px",fontSize:"0.7rem",fontWeight:500},
  btnElim:{background:"var(--red-light)",border:"none",borderRadius:"6px",padding:"0.35rem 0.55rem",fontSize:"0.85rem",cursor:"pointer",flexShrink:0},
  pedidoCard:{background:"#fff",borderRadius:"var(--radius)",padding:"1.25rem",marginBottom:"0.75rem",boxShadow:"var(--shadow-sm)",border:"1px solid var(--gray-200)"},
  pedidoTop:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.6rem"},
  entregaInfo:{display:"flex",gap:"1rem",flexWrap:"wrap",fontSize:"0.8rem",color:"var(--gray-600)",background:"var(--gray-50)",padding:"0.5rem 0.75rem",borderRadius:"6px",marginBottom:"0.6rem"},
  detallesPedido:{borderTop:"1px solid var(--gray-100)",paddingTop:"0.6rem",display:"flex",flexDirection:"column",gap:"0.2rem"},
  historial:{display:"flex",gap:"0.35rem",flexWrap:"wrap",marginTop:"0.6rem"},
  eventoChip:{background:"var(--gray-100)",color:"var(--gray-600)",padding:"0.15rem 0.6rem",borderRadius:"10px",fontSize:"0.7rem"},
  accionesPedido:{display:"flex",gap:"0.6rem",flexWrap:"wrap",alignItems:"center",marginTop:"0.75rem",paddingTop:"0.75rem",borderTop:"1px solid var(--gray-100)"},
  btnEstado:{padding:"0.35rem 0.75rem",color:"#fff",border:"none",borderRadius:"8px",fontSize:"0.78rem",fontWeight:600,cursor:"pointer"},
};
