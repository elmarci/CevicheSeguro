import React, { useEffect, useState } from "react";
import api from "../services/api";

const ESTADO_REPORTE = ["pendiente","en_investigacion","inspeccion_programada","resuelto","descartado"];
const NIVEL_COLOR = { informativo:["#dbeafe","#1e40af","ℹ️"], alerta:["#fef3c7","#92400e","⚠️"], critico:["#fee2e2","#991b1b","🚨"] };

export default function InspectorPage() {
  const [tab, setTab] = useState("dashboard");
  const [licencias, setLicencias] = useState([]);
  const [certificados, setCertificados] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [alertasLic, setAlertasLic] = useState([]);
  const [alertasCert, setAlertasCert] = useState([]);
  const [comunicados, setComunicados] = useState([]);
  const [expedienteAbierto, setExpedienteAbierto] = useState(null);
  const [resumenVendedor, setResumenVendedor] = useState(null);
  const [obsTexto, setObsTexto] = useState("");
  const [obsAccion, setObsAccion] = useState("");
  const [obsEstado, setObsEstado] = useState("");
  const [docObs, setDocObs] = useState({ tipo:"", id:null, comentario:"", estado:"" });
  const [comForm, setComForm] = useState({ titulo:"", mensaje:"", nivel:"informativo" });
  const [filtroReporte, setFiltroReporte] = useState("todos");
  const [msg, setMsg] = useState({ text:"", ok:true });
  const [busquedaVendedor, setBusquedaVendedor] = useState("");

  useEffect(() => { cargarTodo(); }, []);

  async function cargarTodo() {
    try {
      const [l, c, r, al, ac, com] = await Promise.all([
        api.get("/inspector/licencias/pendientes"),
        api.get("/inspector/certificados/pendientes"),
        api.get("/expediente/reportes"),
        api.get("/alertas/licencias-por-vencer?dias=30"),
        api.get("/alertas/certificados-por-vencer?dias=30"),
        api.get("/comunicados"),
      ]);
      setLicencias(l.data); setCertificados(c.data); setReportes(r.data);
      setAlertasLic(al.data); setAlertasCert(ac.data); setComunicados(com.data);
    } catch {}
  }

  function flash(text, ok=true) { setMsg({text,ok}); setTimeout(()=>setMsg({text:"",ok:true}),4000); }

  async function decidirLicencia(id, estado, comentario="") {
    try {
      await api.put(`/inspector/licencias/${id}`, { estado });
      if (comentario) await api.post(`/expediente/documentos/licencia/${id}/observaciones`, { comentario, nuevo_estado:estado });
      flash(`Licencia ${estado}`); cargarTodo();
    } catch(err) { flash(err.response?.data?.detail||"Error", false); }
  }

  async function decidirCert(id, estado, comentario="") {
    try {
      await api.put(`/inspector/certificados/${id}`, { estado });
      if (comentario) await api.post(`/expediente/documentos/certificado/${id}/observaciones`, { comentario, nuevo_estado:estado });
      flash(`Certificado ${estado}`); cargarTodo();
    } catch(err) { flash(err.response?.data?.detail||"Error", false); }
  }

  async function agregarObservacionReporte(reporteId) {
    if (!obsTexto.trim()) return flash("Escribe una observación", false);
    try {
      await api.post(`/expediente/reportes/${reporteId}/observaciones`, {
        texto: obsTexto,
        accion_tomada: obsAccion || null,
        nuevo_estado: obsEstado || null,
      });
      flash("✅ Observación registrada en el expediente");
      setObsTexto(""); setObsAccion(""); setObsEstado("");
      const r = await api.get(`/expediente/reportes/${reporteId}`); setExpedienteAbierto(r.data);
      cargarTodo();
    } catch(err) { flash(err.response?.data?.detail||"Error", false); }
  }

  async function agregarObsDoc() {
    if (!docObs.comentario.trim()) return flash("Escribe un comentario", false);
    try {
      await api.post(`/expediente/documentos/${docObs.tipo}/${docObs.id}/observaciones`, {
        comentario: docObs.comentario,
        nuevo_estado: docObs.estado || null,
      });
      flash("✅ Comentario guardado"); setDocObs({tipo:"",id:null,comentario:"",estado:""});
      cargarTodo();
    } catch(err) { flash(err.response?.data?.detail||"Error", false); }
  }

  async function publicarComunicado(e) {
    e.preventDefault();
    try {
      await api.post("/comunicados", comForm);
      flash("✅ Comunicado publicado al sistema");
      setComForm({titulo:"",mensaje:"",nivel:"informativo"}); cargarTodo();
    } catch(err) { flash(err.response?.data?.detail||"Error", false); }
  }

  async function desactivarComunicado(id) {
    await api.put(`/comunicados/${id}/desactivar`); cargarTodo();
  }

  async function abrirExpediente(reporte) {
    const r = await api.get(`/expediente/reportes/${reporte.id}`);
    setExpedienteAbierto(r.data); setTab("expediente");
  }

  async function buscarVendedor() {
    const id = parseInt(busquedaVendedor);
    if (!id) return flash("Ingresa el ID del vendedor", false);
    try {
      const r = await api.get(`/expediente/vendedor/${id}/resumen`);
      setResumenVendedor(r.data);
    } catch(err) { flash(err.response?.data?.detail||"Vendedor no encontrado", false); }
  }

  const reportesFiltrados = filtroReporte === "todos" ? reportes : reportes.filter(r=>r.estado===filtroReporte);
  const totalPendientes = licencias.length + certificados.length + reportes.filter(r=>r.estado==="pendiente").length;

  return (
    <div style={s.page}>
      {msg.text && <Toast text={msg.text} ok={msg.ok} />}

      <div style={s.header}>
        <div>
          <h2 style={s.title}>Panel Inspector Sanitario 🔍</h2>
          <p style={s.sub}>Sistema de auditoría, verificación y gestión de reportes ciudadanos</p>
        </div>
        {totalPendientes > 0 && <div style={s.alertBanner}>⚠️ {totalPendientes} item(s) pendientes de atención</div>}
      </div>

      <div style={s.kpiBar}>
        <KPI icon="📋" n={licencias.length} label="Licencias pendientes" color="var(--accent)" onClick={()=>setTab("documentos")} />
        <KPI icon="🏥" n={certificados.length} label="Certificados pendientes" color="#2980b9" onClick={()=>setTab("documentos")} />
        <KPI icon="🚨" n={reportes.filter(r=>r.estado==="pendiente").length} label="Reportes pendientes" color="var(--primary)" onClick={()=>setTab("reportes")} />
        <KPI icon="⏰" n={alertasLic.length+alertasCert.length} label="Próx. a vencer (30d)" color="#8e44ad" onClick={()=>setTab("alertas")} />
        <KPI icon="📢" n={comunicados.length} label="Comunicados activos" color="var(--green)" onClick={()=>setTab("comunicados")} />
      </div>

      <div style={s.tabBar}>
        {[["dashboard","📊 Dashboard"],["documentos","📄 Documentos"],["reportes","🚨 Reportes"],["expediente","🗂️ Expediente"],["inspeccion","🔎 Inspecciones"],["alertas","⏰ Alertas"],["comunicados","📢 Comunicados"]].map(([t,l])=>(
          <button key={t} style={tab===t?s.tabActive:s.tab} onClick={()=>setTab(t)}>{l}</button>
        ))}
      </div>

      <div style={s.content}>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard" && (
          <div style={s.dashGrid}>
            <ResumenCard title="📋 Licencias pendientes" items={licencias.map(l=>({id:l.id,titulo:l.numero_licencia,sub:`Vendedor #${l.vendedor_id} · Vence ${new Date(l.fecha_vencimiento).toLocaleDateString("es-PE")}`}))} onAprobar={id=>decidirLicencia(id,"aprobado")} onRechazar={id=>decidirLicencia(id,"rechazado")} />
            <ResumenCard title="🏥 Certificados pendientes" items={certificados.map(c=>({id:c.id,titulo:c.entidad_emisora,sub:`Vendedor #${c.vendedor_id} · Vence ${new Date(c.fecha_vencimiento).toLocaleDateString("es-PE")}`}))} onAprobar={id=>decidirCert(id,"aprobado")} onRechazar={id=>decidirCert(id,"rechazado")} />
            <div style={s.card}>
              <h3 style={s.cardTitle}>🚨 Reportes recientes</h3>
              {reportes.filter(r=>r.estado==="pendiente").slice(0,4).map(r=>(
                <div key={r.id} style={s.reporteRow} onClick={()=>abrirExpediente(r)}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:"0.85rem"}}>{r.motivo}</div>
                    <div style={{fontSize:"0.72rem",color:"var(--gray-400)"}}>{r.nombre_vendedor} · {new Date(r.created_at).toLocaleDateString("es-PE")}</div>
                  </div>
                  <EstadoBadgeReporte estado={r.estado} />
                </div>
              ))}
              {reportes.filter(r=>r.estado==="pendiente").length===0&&<p style={s.emptyMsg}>✅ Sin reportes pendientes</p>}
            </div>
            <div style={s.card}>
              <h3 style={s.cardTitle}>📢 Último comunicado</h3>
              {comunicados[0] ? (
                <div style={{...s.comCard,...NIVEL_COLOR[comunicados[0].nivel]?{background:NIVEL_COLOR[comunicados[0].nivel][0],borderColor:NIVEL_COLOR[comunicados[0].nivel][0]}:{}}}>
                  <div style={{fontWeight:700}}>{NIVEL_COLOR[comunicados[0].nivel]?.[2]} {comunicados[0].titulo}</div>
                  <div style={{fontSize:"0.82rem",marginTop:"0.35rem"}}>{comunicados[0].mensaje.slice(0,120)}{comunicados[0].mensaje.length>120?"...":""}</div>
                </div>
              ) : <p style={s.emptyMsg}>Sin comunicados activos</p>}
              <button style={s.verMas} onClick={()=>setTab("comunicados")}>Gestionar comunicados →</button>
            </div>
          </div>
        )}

        {/* ── DOCUMENTOS ── */}
        {tab==="documentos" && (
          <>
            <h2 style={s.secTitle}>Revisión de documentos</h2>
            <h3 style={{...s.secTitle,fontSize:"1rem",marginBottom:"0.75rem"}}>📋 Licencias pendientes ({licencias.length})</h3>
            {licencias.length===0?<EmptyOk msg="Sin licencias pendientes" />:licencias.map(l=>(
              <DocRevCard key={l.id} tipo="licencia" doc={l} titulo={l.numero_licencia} meta={[`Vendedor #${l.vendedor_id}`,`Emitida: ${new Date(l.fecha_emision).toLocaleDateString("es-PE")}`,`Vence: ${new Date(l.fecha_vencimiento).toLocaleDateString("es-PE")}`]}
                onAprobar={(com)=>decidirLicencia(l.id,"aprobado",com)} onRechazar={(com)=>decidirLicencia(l.id,"rechazado",com)}
                onObservar={()=>setDocObs({tipo:"licencia",id:l.id,comentario:"",estado:""})} />
            ))}
            <h3 style={{...s.secTitle,fontSize:"1rem",margin:"1.5rem 0 0.75rem"}}>🏥 Certificados pendientes ({certificados.length})</h3>
            {certificados.length===0?<EmptyOk msg="Sin certificados pendientes" />:certificados.map(c=>(
              <DocRevCard key={c.id} tipo="certificado" doc={c} titulo={c.entidad_emisora} meta={[`Vendedor #${c.vendedor_id}`,`Emitido: ${new Date(c.fecha_emision).toLocaleDateString("es-PE")}`,`Vence: ${new Date(c.fecha_vencimiento).toLocaleDateString("es-PE")}`]}
                onAprobar={(com)=>decidirCert(c.id,"aprobado",com)} onRechazar={(com)=>decidirCert(c.id,"rechazado",com)}
                onObservar={()=>setDocObs({tipo:"certificado",id:c.id,comentario:"",estado:""})} />
            ))}
            {docObs.id && (
              <div style={s.obsPanel}>
                <h4 style={{marginBottom:"0.75rem"}}>💬 Comentario sobre {docObs.tipo} #{docObs.id}</h4>
                <textarea value={docObs.comentario} onChange={e=>setDocObs({...docObs,comentario:e.target.value})} style={{...s.input,height:"70px",resize:"vertical",width:"100%"}} placeholder="Escribe tu observación técnica..." />
                <div style={{display:"flex",gap:"0.75rem",marginTop:"0.5rem",alignItems:"center"}}>
                  <select value={docObs.estado} onChange={e=>setDocObs({...docObs,estado:e.target.value})} style={{...s.input,width:"auto"}}>
                    <option value="">Sin cambio de estado</option>
                    <option value="aprobado">Aprobar</option>
                    <option value="rechazado">Rechazar</option>
                  </select>
                  <button onClick={agregarObsDoc} style={s.btn}>Guardar observación</button>
                  <button onClick={()=>setDocObs({tipo:"",id:null,comentario:"",estado:""})} style={s.btnGray}>Cancelar</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── REPORTES ── */}
        {tab==="reportes" && (
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:"0.75rem"}}>
              <h2 style={s.secTitle}>Reportes ciudadanos ({reportes.length})</h2>
              <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
                {["todos",...ESTADO_REPORTE].map(e=>(
                  <button key={e} style={filtroReporte===e?s.filtroActive:s.filtro} onClick={()=>setFiltroReporte(e)}>{e}</button>
                ))}
              </div>
            </div>
            {reportesFiltrados.length===0?<EmptyOk msg="Sin reportes en esta categoría" />:reportesFiltrados.map(r=>(
              <div key={r.id} style={s.reporteCard}>
                <div style={s.reporteTop}>
                  <div>
                    <div style={{fontWeight:700}}>🚨 {r.motivo}</div>
                    <div style={{fontSize:"0.78rem",color:"var(--gray-400)",marginTop:"0.15rem"}}>
                      {r.nombre_vendedor||`Vendedor #${r.vendedor_id}`} · Cliente #{r.cliente_id} · {new Date(r.created_at).toLocaleString("es-PE")}
                    </div>
                  </div>
                  <EstadoBadgeReporte estado={r.estado} />
                </div>
                {r.descripcion && <p style={s.reporteDesc}>{r.descripcion}</p>}
                {r.foto_url && (
                  <div style={{marginBottom:"0.75rem"}}>
                    <a href={`http://localhost:8000${r.foto_url}`} target="_blank" rel="noreferrer">
                      <img src={`http://localhost:8000${r.foto_url}`} alt="Foto del reporte" style={{maxHeight:"120px",borderRadius:"6px",border:"1px solid var(--gray-200)"}} />
                    </a>
                  </div>
                )}
                <div style={{display:"flex",gap:"0.5rem"}}>
                  <button style={s.btnOk} onClick={()=>abrirExpediente(r)}>🗂️ Abrir expediente</button>
                </div>
                {r.observaciones?.length > 0 && (
                  <div style={s.obsResumen}>
                    <span style={{fontSize:"0.75rem",color:"var(--gray-400)"}}>💬 {r.observaciones.length} observación(es) del inspector</span>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* ── EXPEDIENTE ── */}
        {tab==="expediente" && expedienteAbierto && (
          <div>
            <button style={s.backBtn} onClick={()=>setTab("reportes")}>← Volver a reportes</button>
            <div style={s.expedienteCard}>
              <div style={s.expedienteHeader}>
                <h2 style={{color:"#fff",fontFamily:"'Playfair Display',serif"}}>🗂️ Expediente #{expedienteAbierto.id}</h2>
                <EstadoBadgeReporte estado={expedienteAbierto.estado} />
              </div>
              <div style={{padding:"1.5rem"}}>
                <div style={s.expGrid}>
                  <InfoField label="Vendedor" value={expedienteAbierto.nombre_vendedor||`#${expedienteAbierto.vendedor_id}`} />
                  <InfoField label="Cliente" value={`Cliente #${expedienteAbierto.cliente_id}`} />
                  <InfoField label="Fecha" value={new Date(expedienteAbierto.created_at).toLocaleString("es-PE")} />
                  <InfoField label="Estado actual" value={expedienteAbierto.estado} />
                </div>
                <div style={{background:"var(--gray-50)",padding:"1rem",borderRadius:"8px",margin:"1rem 0"}}>
                  <div style={{fontWeight:600,marginBottom:"0.25rem"}}>Motivo del reporte:</div>
                  <div>{expedienteAbierto.motivo}</div>
                  {expedienteAbierto.descripcion && <div style={{marginTop:"0.5rem",color:"var(--gray-600)",fontSize:"0.9rem"}}>{expedienteAbierto.descripcion}</div>}
                </div>
                {expedienteAbierto.foto_url && (
                  <div style={{marginBottom:"1rem"}}>
                    <div style={{fontWeight:600,marginBottom:"0.5rem"}}>📷 Evidencia fotográfica:</div>
                    <a href={`http://localhost:8000${expedienteAbierto.foto_url}`} target="_blank" rel="noreferrer">
                      <img src={`http://localhost:8000${expedienteAbierto.foto_url}`} alt="Evidencia" style={{maxHeight:"200px",borderRadius:"8px",border:"1px solid var(--gray-200)"}} />
                    </a>
                  </div>
                )}

                <h4 style={{marginBottom:"0.75rem",borderBottom:"1px solid var(--gray-200)",paddingBottom:"0.5rem"}}>📋 Historial de observaciones</h4>
                {expedienteAbierto.observaciones?.length===0 && <p style={s.emptyMsg}>Sin observaciones aún. Sé el primero en registrar una acción.</p>}
                {expedienteAbierto.observaciones?.map(o=>(
                  <div key={o.id} style={s.obsCard}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.3rem"}}>
                      <span style={{fontWeight:600,fontSize:"0.85rem"}}>Inspector #{o.inspector_id}</span>
                      <span style={{fontSize:"0.75rem",color:"var(--gray-400)"}}>{new Date(o.created_at).toLocaleString("es-PE")}</span>
                    </div>
                    <p style={{margin:0,fontSize:"0.88rem"}}>{o.texto}</p>
                    {o.accion_tomada&&<div style={{marginTop:"0.3rem",fontSize:"0.78rem",color:"var(--green)",fontWeight:500}}>✅ Acción: {o.accion_tomada}</div>}
                  </div>
                ))}

                <div style={s.obsFormBox}>
                  <h4 style={{marginBottom:"0.75rem"}}>➕ Agregar observación al expediente</h4>
                  <textarea value={obsTexto} onChange={e=>setObsTexto(e.target.value)} style={{...s.input,height:"80px",resize:"vertical",width:"100%"}} placeholder="Describe las acciones tomadas, hallazgos o próximos pasos..." />
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginTop:"0.75rem"}}>
                    <Field label="Acción tomada (opcional)"><input value={obsAccion} onChange={e=>setObsAccion(e.target.value)} style={s.input} placeholder="Ej: Se notificó al vendedor" /></Field>
                    <Field label="Cambiar estado del reporte">
                      <select value={obsEstado} onChange={e=>setObsEstado(e.target.value)} style={s.input}>
                        <option value="">Sin cambio</option>
                        {ESTADO_REPORTE.map(e=><option key={e} value={e}>{e}</option>)}
                      </select>
                    </Field>
                  </div>
                  <button onClick={()=>agregarObservacionReporte(expedienteAbierto.id)} style={{...s.btn,marginTop:"0.75rem"}}>Registrar en expediente</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {tab==="expediente" && !expedienteAbierto && (
          <div style={s.emptyCenter}><div style={{fontSize:"3rem"}}>🗂️</div><p>Selecciona un reporte desde la pestaña "Reportes" para abrir su expediente.</p></div>
        )}

        {/* ── INSPECCIONES ── */}
        {tab==="inspeccion" && (
          <div>
            <h2 style={s.secTitle}>🔎 Consulta rápida para inspecciones</h2>
            <div style={s.card}>
              <p style={{color:"var(--gray-600)",fontSize:"0.88rem",marginBottom:"1rem"}}>Ingresa el ID del vendedor para consultar su historial de reportes, documentos y estado antes de una inspección de campo.</p>
              <div style={{display:"flex",gap:"0.75rem",marginBottom:"1.5rem"}}>
                <input value={busquedaVendedor} onChange={e=>setBusquedaVendedor(e.target.value)} style={{...s.input,flex:1}} placeholder="ID del vendedor (ej: 1, 2, 3...)" onKeyDown={e=>e.key==="Enter"&&buscarVendedor()} />
                <button onClick={buscarVendedor} style={s.btn}>Consultar</button>
              </div>
              {resumenVendedor && (
                <div>
                  <div style={s.resumenHeader}>
                    <div>
                      <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.1rem"}}>{resumenVendedor.vendedor.nombre_negocio}</h3>
                      <div style={{fontSize:"0.82rem",color:"var(--gray-400)"}}>
                        {resumenVendedor.vendedor.direccion&&`📍 ${resumenVendedor.vendedor.direccion}`}
                        {resumenVendedor.vendedor.distrito&&`, ${resumenVendedor.vendedor.distrito}`}
                        {resumenVendedor.vendedor.telefono_contacto&&` · 📞 ${resumenVendedor.vendedor.telefono_contacto}`}
                      </div>
                    </div>
                    <EstadoBadgeVerif estado={resumenVendedor.vendedor.estado_verificacion} />
                  </div>
                  <div style={s.resumenGrid}>
                    <ResumenBox title="📋 Documentos" items={[
                      {label:"Licencias registradas",value:resumenVendedor.documentos.licencias_total},
                      {label:"Licencias aprobadas",value:resumenVendedor.documentos.licencias_aprobadas,ok:true},
                      {label:"Licencias vencidas",value:resumenVendedor.documentos.licencias_vencidas,bad:resumenVendedor.documentos.licencias_vencidas>0},
                      {label:"Certs. registrados",value:resumenVendedor.documentos.certificados_total},
                      {label:"Certs. aprobados",value:resumenVendedor.documentos.certificados_aprobados,ok:true},
                    ]} />
                    <ResumenBox title="🚨 Reportes" items={[
                      {label:"Total de reportes",value:resumenVendedor.reportes.total},
                      {label:"Pendientes",value:resumenVendedor.reportes.pendientes,bad:resumenVendedor.reportes.pendientes>0},
                      {label:"En investigación",value:resumenVendedor.reportes.en_investigacion},
                      {label:"Resueltos",value:resumenVendedor.reportes.resueltos,ok:true},
                    ]} />
                    <ResumenBox title="🍽️ Actividad" items={[
                      {label:"Productos publicados",value:resumenVendedor.productos_total},
                      {label:"Pedidos totales",value:resumenVendedor.pedidos_total},
                      {label:"Estado",value:resumenVendedor.vendedor.activo?"Activo":"Inactivo"},
                    ]} />
                  </div>
                  <button style={{...s.btn,marginTop:"1rem"}} onClick={()=>{setFiltroReporte("todos");setTab("reportes");}}>Ver reportes de este vendedor →</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ALERTAS ── */}
        {tab==="alertas" && (
          <>
            <h2 style={s.secTitle}>⏰ Documentos próximos a vencer (30 días)</h2>
            <div style={s.alertGrid}>
              <div>
                <h3 style={{marginBottom:"1rem",fontSize:"1rem",color:"var(--accent)"}}>📋 Licencias ({alertasLic.length})</h3>
                {alertasLic.length===0?<EmptyOk msg="Ninguna" />:alertasLic.map(l=><AlertRow key={l.id} titulo={l.numero_licencia} vendedor={l.vendedor_id} vence={l.fecha_vencimiento} />)}
              </div>
              <div>
                <h3 style={{marginBottom:"1rem",fontSize:"1rem",color:"#2980b9"}}>🏥 Certificados ({alertasCert.length})</h3>
                {alertasCert.length===0?<EmptyOk msg="Ninguno" />:alertasCert.map(c=><AlertRow key={c.id} titulo={c.entidad_emisora} vendedor={c.vendedor_id} vence={c.fecha_vencimiento} />)}
              </div>
            </div>
          </>
        )}

        {/* ── COMUNICADOS ── */}
        {tab==="comunicados" && (
          <div style={s.comLayout}>
            <div>
              <h2 style={s.secTitle}>📢 Comunicados activos ({comunicados.length})</h2>
              {comunicados.length===0&&<EmptyOk msg="Sin comunicados activos" />}
              {comunicados.map(c=>{
                const [bg,color,icon]=NIVEL_COLOR[c.nivel]||["#f3f4f6","#374151","📢"];
                return(
                  <div key={c.id} style={{...s.comCardFull,background:bg,border:`1px solid ${bg}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontWeight:700,color,marginBottom:"0.35rem"}}>{icon} {c.titulo}</div>
                        <div style={{fontSize:"0.8rem",color:"var(--gray-400)"}}>Por: {c.nombre_inspector||`Inspector #${c.inspector_id}`} · {new Date(c.created_at).toLocaleString("es-PE")}</div>
                      </div>
                      <button onClick={()=>desactivarComunicado(c.id)} style={s.btnGrayXs}>Desactivar</button>
                    </div>
                    <p style={{margin:"0.75rem 0 0",fontSize:"0.9rem",color:color,lineHeight:1.6}}>{c.mensaje}</p>
                  </div>
                );
              })}
            </div>
            <div style={s.card}>
              <h3 style={s.cardTitle}>➕ Nuevo comunicado</h3>
              <form onSubmit={publicarComunicado} style={s.form}>
                <Field label="Título *"><input value={comForm.titulo} onChange={e=>setComForm({...comForm,titulo:e.target.value})} style={s.input} placeholder="Ej: Alerta por brote de salmonela en Miraflores" required /></Field>
                <Field label="Mensaje *"><textarea value={comForm.mensaje} onChange={e=>setComForm({...comForm,mensaje:e.target.value})} style={{...s.input,height:"100px",resize:"vertical"}} placeholder="Describe la situación, recomendaciones y acciones a tomar..." required /></Field>
                <Field label="Nivel de alerta">
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.5rem"}}>
                    {["informativo","alerta","critico"].map(n=>{
                      const [bg,color,icon]=NIVEL_COLOR[n];
                      return(
                        <label key={n} style={{border:`1.5px solid ${comForm.nivel===n?color:bg}`,borderRadius:"8px",padding:"0.5rem",textAlign:"center",cursor:"pointer",background:comForm.nivel===n?bg:"#fff"}}>
                          <input type="radio" name="nivel" value={n} checked={comForm.nivel===n} onChange={()=>setComForm({...comForm,nivel:n})} style={{display:"none"}} />
                          <div style={{fontSize:"1.2rem"}}>{icon}</div>
                          <div style={{fontSize:"0.75rem",fontWeight:600,color}}>{n}</div>
                        </label>
                      );
                    })}
                  </div>
                </Field>
                <button type="submit" style={s.btn}>Publicar comunicado</button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Sub-componentes ─────────────────────────────────────────────────────────

function DocRevCard({ tipo, doc, titulo, meta, onAprobar, onRechazar, onObservar }) {
  const [comentario, setComentario] = useState("");
  return (
    <div style={{background:"#fff",borderRadius:"var(--radius)",padding:"1.25rem",marginBottom:"0.75rem",boxShadow:"var(--shadow-sm)",border:"1px solid var(--gray-200)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"1rem",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:"0.75rem"}}>
          <span style={{fontSize:"1.3rem"}}>{tipo==="licencia"?"📋":"🏥"}</span>
          <div>
            <div style={{fontWeight:600}}>{titulo}</div>
            {meta.map((m,i)=><div key={i} style={{fontSize:"0.78rem",color:"var(--gray-400)"}}>{m}</div>)}
          </div>
        </div>
        <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
          <button onClick={()=>onAprobar(comentario)} style={s.btnOk}>✅ Aprobar</button>
          <button onClick={()=>onRechazar(comentario)} style={s.btnRed}>❌ Rechazar</button>
          <button onClick={onObservar} style={s.btnGray}>💬 Observar</button>
        </div>
      </div>
      <input value={comentario} onChange={e=>setComentario(e.target.value)} style={{...s.input,marginTop:"0.75rem",width:"100%",fontSize:"0.82rem"}} placeholder="Comentario al aprobar/rechazar (opcional)..." />
    </div>
  );
}

function ResumenCard({ title, items, onAprobar, onRechazar }) {
  return (
    <div style={s.card}>
      <h3 style={s.cardTitle}>{title}</h3>
      {items.length===0?<p style={s.emptyMsg}>✅ Sin pendientes</p>:items.slice(0,4).map(item=>(
        <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.5rem 0",borderBottom:"1px solid var(--gray-100)"}}>
          <div><div style={{fontSize:"0.85rem",fontWeight:500}}>{item.titulo}</div><div style={{fontSize:"0.72rem",color:"var(--gray-400)"}}>{item.sub}</div></div>
          <div style={{display:"flex",gap:"0.3rem"}}>
            <button onClick={()=>onAprobar(item.id)} style={{padding:"0.25rem 0.6rem",background:"var(--green-light)",color:"var(--green)",border:"none",borderRadius:"6px",fontSize:"0.75rem",fontWeight:600}}>✅</button>
            <button onClick={()=>onRechazar(item.id)} style={{padding:"0.25rem 0.6rem",background:"var(--red-light)",color:"var(--primary)",border:"none",borderRadius:"6px",fontSize:"0.75rem",fontWeight:600}}>❌</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ResumenBox({ title, items }) {
  return (
    <div style={s.card}>
      <h4 style={{marginBottom:"0.75rem",fontSize:"0.9rem",fontWeight:700}}>{title}</h4>
      {items.map((item,i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"0.35rem 0",borderBottom:"1px solid var(--gray-100)",fontSize:"0.85rem"}}>
          <span style={{color:"var(--gray-600)"}}>{item.label}</span>
          <span style={{fontWeight:700,color:item.ok?"var(--green)":item.bad?"var(--primary)":"var(--gray-800)"}}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function AlertRow({ titulo, vendedor, vence }) {
  const dias=Math.ceil((new Date(vence)-new Date())/(1000*60*60*24));
  return(
    <div style={{background:dias<=7?"var(--red-light)":"var(--yellow-light)",border:`1px solid ${dias<=7?"#fca5a5":"#fde68a"}`,borderRadius:"8px",padding:"0.6rem 0.85rem",marginBottom:"0.5rem"}}>
      <div style={{fontSize:"0.85rem",fontWeight:600}}>{titulo}</div>
      <div style={{fontSize:"0.75rem",color:"var(--gray-600)"}}>Vendedor #{vendedor} · <strong style={{color:dias<=7?"var(--primary)":"#92400e"}}>{dias<=0?"¡Vencido!":`Vence en ${dias} días`}</strong></div>
    </div>
  );
}

function EstadoBadgeReporte({ estado }) {
  const m={pendiente:["#fef3c7","#92400e"],en_investigacion:["#dbeafe","#1e40af"],inspeccion_programada:["#ede9fe","#5b21b6"],resuelto:["#d1fae5","#065f46"],descartado:["#f3f4f6","#374151"]};
  const [bg,color]=m[estado]||["#f3f4f6","#374151"];
  return<span style={{background:bg,color,padding:"0.15rem 0.65rem",borderRadius:"20px",fontSize:"0.72rem",fontWeight:600,whiteSpace:"nowrap"}}>{estado}</span>;
}

function EstadoBadgeVerif({ estado }) {
  const m={verificado:["var(--green-light)","var(--green)"],no_verificado:["var(--red-light)","var(--primary)"],pendiente:["var(--yellow-light)","#92400e"]};
  const [bg,color]=m[estado]||["#f3f4f6","#374151"];
  return<span style={{background:bg,color,padding:"0.2rem 0.8rem",borderRadius:"20px",fontSize:"0.82rem",fontWeight:600}}>{estado}</span>;
}

function KPI({ icon, n, label, color, onClick }) {
  return(
    <div onClick={onClick} style={{background:"#fff",borderRadius:"var(--radius-sm)",padding:"0.9rem 1.1rem",boxShadow:"var(--shadow-sm)",border:"1px solid var(--gray-200)",cursor:"pointer",display:"flex",alignItems:"center",gap:"0.65rem"}}>
      <span style={{fontSize:"1.4rem"}}>{icon}</span>
      <div><div style={{fontSize:"1.4rem",fontWeight:700,color,lineHeight:1}}>{n}</div><div style={{fontSize:"0.72rem",color:"var(--gray-400)"}}>{label}</div></div>
    </div>
  );
}

function InfoField({ label, value }) {
  return(
    <div><div style={{fontSize:"0.72rem",color:"var(--gray-400)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</div><div style={{fontWeight:600,fontSize:"0.9rem"}}>{value}</div></div>
  );
}

function Field({label,children}){return<div style={{display:"flex",flexDirection:"column",gap:"0.3rem"}}><label style={{fontSize:"0.78rem",fontWeight:600,color:"var(--gray-600)"}}>{label}</label>{children}</div>;}
function EmptyOk({msg}){return<div style={{textAlign:"center",padding:"1.5rem",color:"var(--gray-400)",fontSize:"0.85rem"}}>✅ {msg}</div>;}
function Toast({text,ok}){return<div style={{position:"fixed",top:"72px",right:"1.5rem",zIndex:999,background:ok?"#065f46":"#991b1b",color:"#fff",padding:"0.75rem 1.25rem",borderRadius:"10px",boxShadow:"0 4px 16px rgba(0,0,0,0.2)",fontSize:"0.88rem",maxWidth:"360px",lineHeight:1.5}}>{text}</div>;}

const s={
  page:{minHeight:"100vh",background:"var(--gray-50)"},
  header:{background:"linear-gradient(135deg,#1a3a5c,#2980b9)",color:"#fff",padding:"1.25rem 2rem",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem"},
  title:{fontFamily:"'Playfair Display',serif",fontSize:"1.3rem",marginBottom:"0.2rem"},
  sub:{opacity:.8,fontSize:"0.82rem",margin:0},
  alertBanner:{background:"rgba(255,255,255,0.18)",padding:"0.5rem 1rem",borderRadius:"8px",fontSize:"0.85rem",fontWeight:600},
  kpiBar:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:"0.75rem",padding:"1rem 1.5rem",background:"#fff",borderBottom:"1px solid var(--gray-200)"},
  tabBar:{display:"flex",background:"#fff",borderBottom:"1px solid var(--gray-200)",paddingLeft:"1.5rem",overflowX:"auto"},
  tab:{padding:"0.75rem 0.9rem",border:"none",background:"none",color:"var(--gray-600)",fontWeight:500,fontSize:"0.82rem",borderBottom:"2px solid transparent",whiteSpace:"nowrap"},
  tabActive:{padding:"0.75rem 0.9rem",border:"none",background:"none",color:"#2980b9",fontWeight:600,fontSize:"0.82rem",borderBottom:"2px solid #2980b9",whiteSpace:"nowrap"},
  content:{maxWidth:"1000px",margin:"0 auto",padding:"1.5rem"},
  dashGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.25rem"},
  card:{background:"#fff",borderRadius:"var(--radius)",padding:"1.5rem",boxShadow:"var(--shadow-sm)",border:"1px solid var(--gray-200)",marginBottom:"0.5rem"},
  cardTitle:{fontFamily:"'Playfair Display',serif",fontSize:"1rem",marginBottom:"1rem",paddingBottom:"0.6rem",borderBottom:"1px solid var(--gray-200)"},
  secTitle:{fontFamily:"'Playfair Display',serif",fontSize:"1.3rem",marginBottom:"1.25rem"},
  form:{display:"flex",flexDirection:"column",gap:"0.85rem"},
  input:{padding:"0.6rem 0.75rem",border:"1.5px solid var(--gray-200)",borderRadius:"8px",fontSize:"0.88rem"},
  btn:{padding:"0.65rem 1.25rem",background:"var(--primary)",color:"#fff",border:"none",borderRadius:"8px",fontWeight:600,fontSize:"0.88rem",cursor:"pointer"},
  btnOk:{padding:"0.4rem 0.85rem",background:"var(--green)",color:"#fff",border:"none",borderRadius:"8px",fontWeight:600,fontSize:"0.82rem",cursor:"pointer"},
  btnRed:{padding:"0.4rem 0.85rem",background:"var(--primary)",color:"#fff",border:"none",borderRadius:"8px",fontWeight:600,fontSize:"0.82rem",cursor:"pointer"},
  btnGray:{padding:"0.4rem 0.85rem",background:"var(--gray-100)",color:"var(--gray-600)",border:"none",borderRadius:"8px",fontWeight:600,fontSize:"0.82rem",cursor:"pointer"},
  btnGrayXs:{padding:"0.25rem 0.6rem",background:"var(--gray-100)",color:"var(--gray-600)",border:"none",borderRadius:"6px",fontSize:"0.75rem",cursor:"pointer"},
  reporteCard:{background:"#fff",borderRadius:"var(--radius)",padding:"1.25rem",marginBottom:"0.75rem",boxShadow:"var(--shadow-sm)",border:"1px solid var(--gray-200)"},
  reporteTop:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem",gap:"0.75rem"},
  reporteDesc:{fontSize:"0.85rem",color:"var(--gray-600)",background:"var(--gray-50)",padding:"0.5rem 0.75rem",borderRadius:"6px",margin:"0.5rem 0"},
  reporteRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.5rem 0",borderBottom:"1px solid var(--gray-100)",cursor:"pointer"},
  obsResumen:{marginTop:"0.5rem",fontSize:"0.75rem",color:"var(--gray-400)"},
  obsPanel:{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:"8px",padding:"1rem",marginTop:"1rem"},
  filtro:{padding:"0.3rem 0.75rem",border:"1px solid var(--gray-200)",borderRadius:"20px",background:"#fff",fontSize:"0.78rem",color:"var(--gray-600)",cursor:"pointer"},
  filtroActive:{padding:"0.3rem 0.75rem",border:"1px solid var(--primary)",borderRadius:"20px",background:"var(--primary-light)",fontSize:"0.78rem",color:"var(--primary)",fontWeight:600,cursor:"pointer"},
  expedienteCard:{background:"#fff",borderRadius:"var(--radius)",boxShadow:"var(--shadow-md)",overflow:"hidden",border:"1px solid var(--gray-200)"},
  expedienteHeader:{background:"linear-gradient(135deg,#1a3a5c,#2980b9)",color:"#fff",padding:"1.25rem 1.5rem",display:"flex",justifyContent:"space-between",alignItems:"center"},
  expGrid:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"1rem"},
  obsCard:{background:"var(--gray-50)",borderRadius:"8px",padding:"0.85rem",marginBottom:"0.5rem",border:"1px solid var(--gray-200)"},
  obsFormBox:{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:"8px",padding:"1.25rem",marginTop:"1.5rem"},
  backBtn:{padding:"0.4rem 0.9rem",background:"var(--gray-100)",border:"none",borderRadius:"8px",color:"var(--gray-600)",fontSize:"0.85rem",fontWeight:500,cursor:"pointer",marginBottom:"1rem"},
  emptyCenter:{textAlign:"center",padding:"4rem",color:"var(--gray-400)",display:"flex",flexDirection:"column",alignItems:"center",gap:"0.75rem"},
  emptyMsg:{textAlign:"center",color:"var(--gray-400)",fontSize:"0.85rem",padding:"1rem 0"},
  inspeccion:{},
  resumenHeader:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem"},
  resumenGrid:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem"},
  alertGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem"},
  comLayout:{display:"grid",gridTemplateColumns:"1fr 380px",gap:"1.5rem",alignItems:"start"},
  comCard:{borderRadius:"8px",padding:"1rem",border:"1px solid var(--gray-200)",marginBottom:"0.75rem"},
  comCardFull:{borderRadius:"var(--radius)",padding:"1.25rem",marginBottom:"0.75rem",boxShadow:"var(--shadow-sm)"},
  verMas:{padding:"0.35rem 0.8rem",background:"none",border:"1px solid var(--gray-200)",borderRadius:"8px",fontSize:"0.8rem",color:"var(--gray-600)",cursor:"pointer",marginTop:"0.75rem"},
};
