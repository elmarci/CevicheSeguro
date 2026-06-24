import React, { useEffect, useRef, useState } from "react";
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
const TIMELINE_ESTADOS = ["pendiente","confirmado","en_preparacion","listo","en_camino","entregado"];
const EMOJIS = ["🦑","🐟","🦐","🍋","🌶️","🥗","🍤","🧅"];

export default function ClientePage() {
  const [tab, setTab] = useState("vendedores");
  const [vendedores, setVendedores] = useState([]);
  const [vendedorSel, setVendedorSel] = useState(null);
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState({});
  const [checkout, setCheckout] = useState(null);
  const [checkoutData, setCheckoutData] = useState({ direccion:"", telefono:"", notas:"", metodoPago:"efectivo" });
  const [pedidoConfirmado, setPedidoConfirmado] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [comunicados, setComunicados] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [msg, setMsg] = useState({ text:"", ok:true });
  const [reporteForm, setReporteForm] = useState({ vendedor_id:"", motivo:"", motivo_libre:"", descripcion:"", foto_url:"" });
  const [loadingPedido, setLoadingPedido] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fotoInputRef = useRef(null);

  useEffect(() => { cargarTodo(); }, []);

  async function cargarTodo() {
    try {
      const [vs, ped, coms, perfil] = await Promise.all([
        api.get("/vendedores"),
        api.get("/pedidos/mis-pedidos"),
        api.get("/comunicados"),
        api.get("/clientes/mi-perfil").catch(()=>null),
      ]);
      setVendedores(vs.data);
      setPedidos(ped.data);
      setComunicados(coms.data);
      if (perfil) setCheckoutData(prev=>({...prev, direccion:perfil.data.direccion||"", telefono:perfil.data.telefono||""}));
    } catch {}
  }

  async function abrirVendedor(v) {
    setVendedorSel(v); setCarrito({});
    const r = await api.get(`/productos?vendedor_id=${v.id}`);
    setProductos(r.data); setTab("productos");
  }

  function cambiarCantidad(pid, delta) {
    setCarrito(prev=>{
      const n=Math.max(0,(prev[pid]||0)+delta);
      if(n===0){const{[pid]:_,...r}=prev;return r;}
      return{...prev,[pid]:n};
    });
  }

  function flash(text,ok=true){setMsg({text,ok});setTimeout(()=>setMsg({text:"",ok:true}),4500);}

  const itemsCarrito = productos.filter(p=>carrito[p.id]);
  const totalCarrito = itemsCarrito.reduce((a,p)=>a+parseFloat(p.precio)*carrito[p.id],0);
  const cantidadTotal = Object.values(carrito).reduce((a,b)=>a+b,0);

  async function confirmarPedido(e) {
    e.preventDefault();
    if (!checkoutData.direccion.trim()) return flash("La dirección de entrega es obligatoria.", false);
    setLoadingPedido(true);
    try {
      const detalles = itemsCarrito.map(p=>({producto_id:p.id,cantidad:carrito[p.id]}));
      const r = await api.post("/pedidos", {
        vendedor_id:vendedorSel.id, detalles,
        direccion_entrega:checkoutData.direccion,
        telefono_contacto:checkoutData.telefono||null,
        notas:checkoutData.notas||null,
        metodo_pago:checkoutData.metodoPago,
      });
      setPedidoConfirmado(r.data); setCheckout("confirmado"); setCarrito({});
      setPedidos(prev=>[r.data,...prev]);
    } catch(err){flash(err.response?.data?.detail||"Error al crear pedido",false);}
    finally{setLoadingPedido(false);}
  }

  async function subirFoto(e) {
    const file = e.target.files?.[0]; if(!file) return;
    setUploadingFoto(true);
    try {
      const form = new FormData(); form.append("file", file);
      const r = await api.post("/uploads", form, {headers:{"Content-Type":"multipart/form-data"}});
      setReporteForm(prev=>({...prev,foto_url:r.data.url}));
      flash("✅ Foto cargada correctamente");
    } catch(err){flash(err.response?.data?.detail||"Error al subir foto",false);}
    finally{setUploadingFoto(false);}
  }

  async function enviarReporte(e) {
    e.preventDefault();
    const motivo = reporteForm.motivo==="Otro motivo" ? reporteForm.motivo_libre : reporteForm.motivo;
    if(!motivo.trim()) return flash("Selecciona o describe el motivo.", false);
    try {
      await api.post("/reportes",{
        vendedor_id:+reporteForm.vendedor_id, motivo, descripcion:reporteForm.descripcion||null,
        foto_url:reporteForm.foto_url||null,
      });
      flash("✅ Reporte enviado. Un inspector lo revisará pronto. Gracias por proteger tu comunidad.");
      setReporteForm({vendedor_id:"",motivo:"",motivo_libre:"",descripcion:"",foto_url:""});
    } catch(err){flash(err.response?.data?.detail||"Error",false);}
  }

  const vendedoresFiltrados = vendedores.filter(v=>filtro==="todos"||v.estado_verificacion===filtro);

  // ── CHECKOUT ──────────────────────────────────────────────────────────────
  if (checkout==="form") {
    return (
      <div style={s.page}>
        <div style={s.checkoutWrap}>
          <div style={s.checkoutCard}>
            <div style={s.checkoutHdr}>
              <button onClick={()=>setCheckout(null)} style={s.backBtn}>← Volver</button>
              <h2 style={{color:"#fff",fontFamily:"'Playfair Display',serif",margin:0}}>Confirmar pedido</h2>
            </div>
            <div style={s.checkoutBody}>
              <div>
                <h3 style={s.miniTitle}>📋 Resumen — {vendedorSel?.nombre_negocio}</h3>
                <div style={s.resumenBox}>
                  {itemsCarrito.map(p=>(
                    <div key={p.id} style={s.resumenRow}>
                      <div><div style={{fontWeight:600,fontSize:"0.9rem"}}>{p.nombre}</div><div style={{fontSize:"0.72rem",color:"var(--gray-400)"}}>🐟 {p.especie_declarada} · S/. {parseFloat(p.precio).toFixed(2)} c/u</div></div>
                      <div style={{textAlign:"right"}}><div style={{fontWeight:600}}>× {carrito[p.id]}</div><div style={{color:"var(--primary)",fontWeight:700}}>S/. {(parseFloat(p.precio)*carrito[p.id]).toFixed(2)}</div></div>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",padding:"1rem",fontWeight:700}}><span>Total</span><span style={{fontSize:"1.3rem",color:"var(--primary)"}}>S/. {totalCarrito.toFixed(2)}</span></div>
                </div>
              </div>
              <form onSubmit={confirmarPedido} style={s.entregaForm}>
                <h3 style={s.miniTitle}>📍 Datos de entrega</h3>
                <Field label="Dirección de entrega *"><input value={checkoutData.direccion} onChange={e=>setCheckoutData({...checkoutData,direccion:e.target.value})} style={s.input} placeholder="Av. Larco 123, Miraflores, Lima" required /></Field>
                <Field label="Teléfono de contacto"><input value={checkoutData.telefono} onChange={e=>setCheckoutData({...checkoutData,telefono:e.target.value})} style={s.input} placeholder="987 654 321" /></Field>
                <Field label="Notas para el vendedor"><textarea value={checkoutData.notas} onChange={e=>setCheckoutData({...checkoutData,notas:e.target.value})} style={{...s.input,height:"60px",resize:"vertical"}} placeholder="Sin picante, extra limón..." /></Field>
                <Field label="💳 Método de pago">
                  <div style={s.pagoGrid}>
                    {[["efectivo","💵 Efectivo"],["yape","📱 Yape"],["plin","📱 Plin"],["tarjeta","💳 Tarjeta"]].map(([v,l])=>(
                      <label key={v} style={{...s.pagoOpt,...(checkoutData.metodoPago===v?s.pagoOptActive:{})}}>
                        <input type="radio" name="pago" value={v} checked={checkoutData.metodoPago===v} onChange={()=>setCheckoutData({...checkoutData,metodoPago:v})} style={{display:"none"}} />{l}
                      </label>
                    ))}
                  </div>
                </Field>
                {msg.text&&<div style={{...s.alertBox,background:msg.ok?"#d1fae5":"#fee2e2",color:msg.ok?"#065f46":"#991b1b"}}>{msg.text}</div>}
                <button type="submit" style={s.btnConfirmar} disabled={loadingPedido}>{loadingPedido?"Procesando...":"✅ Confirmar pedido · S/. "+totalCarrito.toFixed(2)}</button>
                <p style={{fontSize:"0.73rem",color:"var(--gray-400)",textAlign:"center"}}>El vendedor recibirá tu pedido y actualizará el estado en tiempo real.</p>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (checkout==="confirmado"&&pedidoConfirmado) {
    return (
      <div style={s.page}>
        <div style={s.confirWrap}>
          <div style={s.confirCard}>
            <div style={{fontSize:"4rem",marginBottom:"0.75rem"}}>🎉</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",color:"var(--green)",marginBottom:"0.5rem"}}>¡Pedido confirmado!</h2>
            <p style={{color:"var(--gray-600)",marginBottom:"1.5rem"}}>El vendedor recibirá tu pedido y podrás seguir el estado en tiempo real.</p>
            <div style={s.confirBox}>
              {[["Pedido #",pedidoConfirmado.id],["Vendedor",vendedorSel?.nombre_negocio],["Pago",checkoutData.metodoPago],["Dirección",checkoutData.direccion],["Total",`S/. ${parseFloat(pedidoConfirmado.total).toFixed(2)}`]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"0.7rem 1rem",borderBottom:"1px solid var(--gray-200)",fontSize:"0.88rem"}}><span style={{color:"var(--gray-600)"}}>{k}</span><strong>{v}</strong></div>
              ))}
            </div>
            <div style={{display:"flex",gap:"0.75rem",marginTop:"1.5rem"}}>
              <button onClick={()=>{setCheckout(null);setPedidoConfirmado(null);setTab("pedidos");}} style={s.btnSecundario}>Ver mis pedidos</button>
              <button onClick={()=>{setCheckout(null);setPedidoConfirmado(null);setTab("vendedores");}} style={s.btnConfirmar}>Seguir comprando →</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── VISTA PRINCIPAL ───────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {msg.text&&<Toast text={msg.text} ok={msg.ok} />}

      {comunicados.filter(c=>c.nivel!=="informativo").length>0 && (
        <div style={s.comunicadoBanner}>
          {comunicados.filter(c=>c.nivel!=="informativo").slice(0,1).map(c=>(
            <div key={c.id}>{c.nivel==="critico"?"🚨":"⚠️"} <strong>{c.titulo}:</strong> {c.mensaje.slice(0,120)}{c.mensaje.length>120?"...":""}</div>
          ))}
        </div>
      )}

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
        {[["vendedores","🏪 Vendedores"],["productos","🛒 Productos"],["pedidos","📦 Seguimiento"],["reporte","🚨 Reportar"]].map(([t,l])=>(
          <button key={t} style={tab===t?s.tabActive:s.tab} onClick={()=>setTab(t)}>
            {l}{t==="pedidos"&&pedidos.length>0&&<span style={s.tabBadge}>{pedidos.length}</span>}
          </button>
        ))}
      </div>

      <div style={s.content}>

        {/* ── VENDEDORES ── */}
        {tab==="vendedores"&&(
          <>
            <div style={s.filtroBar}>
              {[["todos","Todos"],["verificado","✅ Verificados"],["pendiente","⏳ En revisión"],["no_verificado","🔴 No verificados"]].map(([v,l])=>(
                <button key={v} style={filtro===v?s.filtroActive:s.filtro} onClick={()=>setFiltro(v)}>{l}</button>
              ))}
              <span style={{marginLeft:"auto",fontSize:"0.78rem",color:"var(--gray-400)",alignSelf:"center"}}>{vendedoresFiltrados.length} vendedores</span>
            </div>
            <div style={s.vendGrid}>
              {vendedoresFiltrados.map(v=>{
                const sello=SELLO[v.estado_verificacion]||SELLO.pendiente;
                return(
                  <div key={v.id} style={s.vendCard}>
                    <div style={s.vendBanner}><span style={{fontSize:"3rem"}}>{EMOJIS[v.id%EMOJIS.length]}</span></div>
                    <div style={s.vendBody}>
                      <span style={{...s.selloPill,background:sello.bg,color:sello.color,border:`1px solid ${sello.border}`}}>{sello.label}</span>
                      <h3 style={s.vendNombre}>{v.nombre_negocio}</h3>
                      {v.direccion&&<div style={s.vendMeta}>📍 {v.direccion}{v.distrito?`, ${v.distrito}`:""}</div>}
                      {v.horario_apertura&&<div style={s.vendMeta}>🕐 {v.horario_apertura} - {v.horario_cierre} · {v.dias_atencion}</div>}
                      {v.precio_minimo&&<div style={s.vendMeta}>💰 S/. {parseFloat(v.precio_minimo).toFixed(0)} - {parseFloat(v.precio_maximo||v.precio_minimo).toFixed(0)}</div>}
                      {v.telefono_contacto&&<div style={s.vendMeta}>📞 {v.telefono_contacto}</div>}
                      {v.especialidad&&<div style={{...s.vendMeta,fontStyle:"italic",color:"var(--accent)"}}>⭐ {v.especialidad}</div>}
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
        {tab==="productos"&&(
          <>
            {vendedorSel?(
              <>
                <div style={s.prodHeader}>
                  <button onClick={()=>setTab("vendedores")} style={s.backBtn}>← Volver</button>
                  <div>
                    <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.4rem",marginBottom:"0.2rem"}}>{vendedorSel.nombre_negocio}</h2>
                    <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap",fontSize:"0.8rem",color:"var(--gray-500)"}}>
                      {vendedorSel.direccion&&<span>📍 {vendedorSel.direccion}</span>}
                      {vendedorSel.horario_apertura&&<span>🕐 {vendedorSel.horario_apertura}-{vendedorSel.horario_cierre}</span>}
                      {vendedorSel.telefono_contacto&&<span>📞 {vendedorSel.telefono_contacto}</span>}
                    </div>
                    <span style={{...s.selloPill,...SELLO[vendedorSel.estado_verificacion],marginTop:"0.3rem",display:"inline-block"}}>{SELLO[vendedorSel.estado_verificacion]?.label}</span>
                  </div>
                </div>

                {productos.length===0
                  ?<div style={s.emptyState}><div style={{fontSize:"3rem"}}>🍽️</div><p>Este vendedor aún no publicó productos.</p></div>
                  :<div style={s.prodLayout}>
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
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"0.6rem"}}>
                              <span style={{fontSize:"1.05rem",fontWeight:700,color:"var(--primary)"}}>S/. {parseFloat(p.precio).toFixed(2)}</span>
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
                    <div style={s.carritoSide}>
                      <h3 style={s.miniTitle}>🛒 Mi carrito</h3>
                      {cantidadTotal===0
                        ?<p style={{color:"var(--gray-400)",fontSize:"0.82rem",textAlign:"center",padding:"1.5rem 0"}}>Agrega productos para iniciar tu pedido</p>
                        :<>
                          {itemsCarrito.map(p=>(
                            <div key={p.id} style={s.carritoItem}>
                              <div style={{flex:1}}><div style={{fontSize:"0.82rem",fontWeight:600}}>{p.nombre}</div><div style={{fontSize:"0.72rem",color:"var(--gray-400)"}}>S/. {parseFloat(p.precio).toFixed(2)} c/u</div></div>
                              <div style={{display:"flex",alignItems:"center",gap:"0.35rem"}}>
                                <button style={s.cBtnSm} onClick={()=>cambiarCantidad(p.id,-1)}>−</button>
                                <span style={{fontSize:"0.85rem",fontWeight:700,minWidth:"18px",textAlign:"center"}}>{carrito[p.id]}</span>
                                <button style={s.cBtnSm} onClick={()=>cambiarCantidad(p.id,1)}>+</button>
                              </div>
                              <div style={{fontWeight:700,color:"var(--primary)",fontSize:"0.85rem",minWidth:"55px",textAlign:"right"}}>S/. {(parseFloat(p.precio)*carrito[p.id]).toFixed(2)}</div>
                            </div>
                          ))}
                          <div style={{display:"flex",justifyContent:"space-between",padding:"0.65rem 0",borderTop:"1px solid var(--gray-200)",marginTop:"0.25rem"}}>
                            <span style={{fontSize:"0.88rem"}}>Total ({cantidadTotal} items)</span>
                            <strong style={{color:"var(--primary)"}}>S/. {totalCarrito.toFixed(2)}</strong>
                          </div>
                          <button style={s.btnPedir} onClick={()=>setCheckout("form")}>Proceder al pago →</button>
                        </>
                      }
                    </div>
                  </div>
                }
              </>
            ):<div style={s.emptyState}><div style={{fontSize:"3rem"}}>🏪</div><p>Selecciona un vendedor para ver su carta</p></div>}
          </>
        )}

        {/* ── SEGUIMIENTO DE PEDIDOS ── */}
        {tab==="pedidos"&&(
          <>
            <h2 style={s.secTitle}>Seguimiento de pedidos ({pedidos.length})</h2>
            {pedidos.length===0
              ?<div style={s.emptyState}><div style={{fontSize:"3rem"}}>📦</div><p>Aún no realizaste pedidos. ¡Encuentra tu cevichería y ordena!</p></div>
              :pedidos.map(p=>(
                <div key={p.id} style={s.pedidoCard}>
                  <div style={s.pedidoTop}>
                    <div>
                      <span style={{fontWeight:700}}>Pedido #{p.id}</span>
                      <span style={{fontSize:"0.78rem",color:"var(--gray-400)",marginLeft:"0.75rem"}}>{new Date(p.created_at).toLocaleString("es-PE")}</span>
                    </div>
                    <EstadoBadge estado={p.estado} />
                  </div>

                  {/* Timeline */}
                  <div style={s.timeline}>
                    {TIMELINE_ESTADOS.map((e,i)=>{
                      const idx=TIMELINE_ESTADOS.indexOf(p.estado);
                      const done=i<=idx&&p.estado!=="cancelado";
                      const current=e===p.estado&&p.estado!=="cancelado";
                      return(
                        <div key={e} style={{display:"flex",flexDirection:"column",alignItems:"center",flex:1,position:"relative"}}>
                          {i<TIMELINE_ESTADOS.length-1&&<div style={{position:"absolute",top:"12px",left:"50%",width:"100%",height:"2px",background:done&&i<idx?"var(--green)":"var(--gray-200)",zIndex:0}} />}
                          <div style={{width:"24px",height:"24px",borderRadius:"50%",background:current?"var(--primary)":done?"var(--green)":"var(--gray-200)",border:current?"2px solid var(--primary-dark)":"none",zIndex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.6rem",color:"#fff",fontWeight:700}}>
                            {done||current?"✓":""}
                          </div>
                          <div style={{fontSize:"0.62rem",color:current?"var(--primary)":done?"var(--green)":"var(--gray-400)",marginTop:"0.25rem",textAlign:"center",fontWeight:current?700:400,lineHeight:1.2}}>{e.replace("_"," ")}</div>
                        </div>
                      );
                    })}
                  </div>

                  {(p.direccion_entrega||p.notas||p.metodo_pago)&&(
                    <div style={{display:"flex",gap:"1rem",flexWrap:"wrap",fontSize:"0.78rem",color:"var(--gray-600)",background:"var(--gray-50)",padding:"0.5rem 0.75rem",borderRadius:"6px",marginBottom:"0.6rem"}}>
                      {p.direccion_entrega&&<span>📍 {p.direccion_entrega}</span>}
                      {p.metodo_pago&&<span>💳 {p.metodo_pago}</span>}
                      {p.notas&&<span style={{fontStyle:"italic"}}>📝 "{p.notas}"</span>}
                    </div>
                  )}

                  <div style={{borderTop:"1px solid var(--gray-100)",paddingTop:"0.6rem"}}>
                    {p.detalles?.map(d=>(
                      <div key={d.id} style={{display:"flex",justifyContent:"space-between",fontSize:"0.82rem",padding:"0.15rem 0"}}>
                        <span style={{color:"var(--gray-600)"}}>Producto #{d.producto_id} × {d.cantidad}</span>
                        <span>S/. {(d.precio_unitario*d.cantidad).toFixed(2)}</span>
                      </div>
                    ))}
                    <div style={{textAlign:"right",fontWeight:700,marginTop:"0.4rem",color:"var(--primary)"}}>Total: S/. {parseFloat(p.total).toFixed(2)}</div>
                  </div>

                  {p.historial?.length>0&&(
                    <div style={{marginTop:"0.6rem",paddingTop:"0.6rem",borderTop:"1px dashed var(--gray-200)"}}>
                      <div style={{fontSize:"0.72rem",color:"var(--gray-400)",marginBottom:"0.35rem",fontWeight:600}}>HISTORIAL</div>
                      {p.historial.map(ev=>(
                        <div key={ev.id} style={{fontSize:"0.78rem",color:"var(--gray-600)",display:"flex",gap:"0.5rem",padding:"0.15rem 0"}}>
                          <span style={{color:"var(--green)"}}>●</span>
                          <span>{ev.evento.replace("_"," ")}{ev.nota&&` — ${ev.nota}`}</span>
                          <span style={{marginLeft:"auto",color:"var(--gray-400)"}}>{new Date(ev.created_at).toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            }
          </>
        )}

        {/* ── REPORTE ── */}
        {tab==="reporte"&&(
          <div style={s.reporteWrap}>
            <div style={s.reporteCard}>
              <div style={{fontSize:"2.5rem",textAlign:"center",marginBottom:"0.5rem"}}>🚨</div>
              <h2 style={s.secTitle}>Reportar un vendedor</h2>
              <p style={{color:"var(--gray-600)",fontSize:"0.86rem",marginBottom:"1.5rem",lineHeight:1.6}}>Tu reporte es <strong>confidencial</strong> y será atendido por un inspector sanitario. Ayudas a proteger la salud de toda la comunidad.</p>
              <form onSubmit={enviarReporte} style={s.form}>
                <Field label="¿A qué vendedor reportas? *">
                  <select value={reporteForm.vendedor_id} onChange={e=>setReporteForm({...reporteForm,vendedor_id:e.target.value})} style={s.input} required>
                    <option value="">Selecciona un vendedor...</option>
                    {vendedores.map(v=><option key={v.id} value={v.id}>{v.nombre_negocio} ({v.estado_verificacion})</option>)}
                  </select>
                </Field>
                <Field label="Motivo del reporte *">
                  <select value={reporteForm.motivo} onChange={e=>setReporteForm({...reporteForm,motivo:e.target.value})} style={s.input} required>
                    <option value="">Selecciona el motivo...</option>
                    {MOTIVOS_REPORTE.map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                {reporteForm.motivo==="Otro motivo"&&(
                  <Field label="Describe el motivo *"><input value={reporteForm.motivo_libre} onChange={e=>setReporteForm({...reporteForm,motivo_libre:e.target.value})} style={s.input} placeholder="Describe el motivo" required /></Field>
                )}
                <Field label="Descripción detallada">
                  <textarea value={reporteForm.descripcion} onChange={e=>setReporteForm({...reporteForm,descripcion:e.target.value})} style={{...s.input,height:"90px",resize:"vertical"}} placeholder="Fecha, hora, lugar, qué observaste exactamente..." />
                </Field>
                <Field label="📷 Evidencia fotográfica (opcional)">
                  <div style={{border:"1.5px dashed var(--gray-200)",borderRadius:"8px",padding:"1rem",textAlign:"center"}}>
                    {reporteForm.foto_url
                      ?<div><img src={`http://localhost:8000${reporteForm.foto_url}`} alt="Evidencia" style={{maxHeight:"120px",borderRadius:"6px"}} /><br/><button type="button" onClick={()=>setReporteForm({...reporteForm,foto_url:""})} style={{...s.btnGray,marginTop:"0.5rem",fontSize:"0.78rem"}}>Quitar foto</button></div>
                      :<div><div style={{fontSize:"1.5rem",marginBottom:"0.35rem"}}>📷</div><button type="button" onClick={()=>fotoInputRef.current?.click()} style={{...s.btn,background:"var(--gray-100)",color:"var(--gray-700)",padding:"0.45rem 1rem",fontSize:"0.85rem"}} disabled={uploadingFoto}>{uploadingFoto?"Subiendo...":"Subir foto"}</button><div style={{fontSize:"0.72rem",color:"var(--gray-400)",marginTop:"0.35rem"}}>JPG, PNG o WEBP · máx. 5MB</div></div>
                    }
                    <input ref={fotoInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={subirFoto} />
                  </div>
                </Field>
                <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:"8px",padding:"0.65rem 0.85rem",display:"flex",gap:"0.6rem"}}>
                  <span>⚠️</span><p style={{margin:0,fontSize:"0.76rem",color:"#92400e"}}>Los reportes falsos o maliciosos pueden tener consecuencias legales. Reporta solo situaciones reales observadas personalmente.</p>
                </div>
                {msg.text&&<div style={{...s.alertBox,background:msg.ok?"#d1fae5":"#fee2e2",color:msg.ok?"#065f46":"#991b1b"}}>{msg.text}</div>}
                <button type="submit" style={s.btn}>Enviar reporte</button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function Field({label,children}){return<div style={{display:"flex",flexDirection:"column",gap:"0.35rem"}}><label style={{fontSize:"0.8rem",fontWeight:600,color:"var(--gray-600)"}}>{label}</label>{children}</div>;}
function Stat({n,icon,label}){return<div style={{textAlign:"center",background:"rgba(255,255,255,0.15)",padding:"0.65rem 1.25rem",borderRadius:"10px",minWidth:"85px"}}><div style={{fontSize:"1.2rem"}}>{icon}</div><div style={{fontSize:"1.5rem",fontWeight:700,color:"#fff",lineHeight:1}}>{n}</div><div style={{fontSize:"0.68rem",color:"rgba(255,255,255,0.8)"}}>{label}</div></div>;}
function EstadoBadge({estado}){const m={pendiente:["#fef3c7","#92400e"],confirmado:["#dbeafe","#1e40af"],en_preparacion:["#ede9fe","#5b21b6"],listo:["#d1fae5","#065f46"],en_camino:["#ffedd5","#9a3412"],entregado:["#d1fae5","#065f46"],cancelado:["#fee2e2","#991b1b"]};const[bg,color]=m[estado]||["#f3f4f6","#374151"];return<span style={{background:bg,color,padding:"0.2rem 0.75rem",borderRadius:"20px",fontSize:"0.75rem",fontWeight:600}}>{estado.replace("_"," ")}</span>;}
function Toast({text,ok}){return<div style={{position:"fixed",top:"72px",right:"1.5rem",zIndex:999,background:ok?"#065f46":"#991b1b",color:"#fff",padding:"0.75rem 1.25rem",borderRadius:"10px",boxShadow:"0 4px 16px rgba(0,0,0,0.2)",fontSize:"0.85rem",maxWidth:"340px",lineHeight:1.5}}>{text}</div>;}

const s={
  page:{minHeight:"100vh",background:"var(--gray-50)"},
  comunicadoBanner:{background:"#7c2d12",color:"#fff",padding:"0.6rem 1.5rem",fontSize:"0.85rem",textAlign:"center"},
  hero:{background:"linear-gradient(135deg,#c0392b,#7b241c)",color:"#fff",padding:"2rem 2rem",textAlign:"center"},
  heroTitle:{fontSize:"1.7rem",marginBottom:"0.4rem"},
  heroSub:{fontSize:"0.88rem",opacity:.85,marginBottom:"1.25rem",maxWidth:"500px",margin:"0 auto 1.25rem"},
  heroStats:{display:"flex",justifyContent:"center",gap:"0.75rem",flexWrap:"wrap"},
  tabBar:{display:"flex",background:"#fff",borderBottom:"1px solid var(--gray-200)",paddingLeft:"1.5rem",overflowX:"auto"},
  tab:{padding:"0.8rem 1.1rem",border:"none",background:"none",color:"var(--gray-600)",fontWeight:500,fontSize:"0.85rem",borderBottom:"2px solid transparent",whiteSpace:"nowrap"},
  tabActive:{padding:"0.8rem 1.1rem",border:"none",background:"none",color:"var(--primary)",fontWeight:600,fontSize:"0.85rem",borderBottom:"2px solid var(--primary)",whiteSpace:"nowrap"},
  tabBadge:{background:"var(--primary)",color:"#fff",borderRadius:"10px",padding:"0 5px",fontSize:"0.65rem",marginLeft:"4px"},
  content:{maxWidth:"1050px",margin:"0 auto",padding:"1.5rem"},
  filtroBar:{display:"flex",gap:"0.4rem",marginBottom:"1.25rem",flexWrap:"wrap",alignItems:"center"},
  filtro:{padding:"0.3rem 0.85rem",border:"1px solid var(--gray-200)",borderRadius:"20px",background:"#fff",fontSize:"0.8rem",color:"var(--gray-600)",cursor:"pointer"},
  filtroActive:{padding:"0.3rem 0.85rem",border:"1px solid var(--primary)",borderRadius:"20px",background:"var(--primary-light)",fontSize:"0.8rem",color:"var(--primary)",fontWeight:600,cursor:"pointer"},
  vendGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"1.25rem"},
  vendCard:{background:"#fff",borderRadius:"var(--radius)",boxShadow:"var(--shadow-sm)",overflow:"hidden",border:"1px solid var(--gray-200)"},
  vendBanner:{height:"80px",background:"linear-gradient(135deg,#fff5f5,#ffe4e1)",display:"flex",alignItems:"center",justifyContent:"center"},
  vendBody:{padding:"0.85rem"},
  selloPill:{display:"inline-block",padding:"0.15rem 0.6rem",borderRadius:"20px",fontSize:"0.7rem",fontWeight:600,marginBottom:"0.4rem"},
  vendNombre:{fontFamily:"'Playfair Display',serif",fontSize:"0.95rem",marginBottom:"0.35rem"},
  vendMeta:{fontSize:"0.72rem",color:"var(--gray-500)",marginBottom:"0.15rem"},
  btnVerCarta:{width:"100%",padding:"0.5rem",background:"var(--primary)",color:"#fff",border:"none",borderRadius:"8px",fontWeight:600,fontSize:"0.85rem",marginTop:"0.5rem",cursor:"pointer"},
  prodHeader:{display:"flex",alignItems:"flex-start",gap:"1rem",marginBottom:"1.5rem"},
  backBtn:{padding:"0.4rem 0.85rem",background:"var(--gray-100)",border:"none",borderRadius:"8px",color:"var(--gray-600)",fontSize:"0.82rem",fontWeight:500,cursor:"pointer",whiteSpace:"nowrap"},
  prodLayout:{display:"grid",gridTemplateColumns:"1fr 300px",gap:"1.5rem",alignItems:"start"},
  prodGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:"1rem"},
  prodCard:{background:"#fff",borderRadius:"var(--radius)",boxShadow:"var(--shadow-sm)",overflow:"hidden",border:"1px solid var(--gray-200)"},
  prodEmoji:{fontSize:"2.2rem",textAlign:"center",padding:"0.85rem",background:"linear-gradient(135deg,#fff9f0,#fef3e2)"},
  prodInfo:{padding:"0.85rem"},
  prodNombre:{fontFamily:"'Playfair Display',serif",fontSize:"0.9rem",marginBottom:"0.4rem"},
  especieRow:{display:"flex",gap:"0.3rem",flexWrap:"wrap",marginBottom:"0.35rem"},
  especieBadge:{background:"var(--accent-light)",color:"#7c4a00",padding:"0.1rem 0.45rem",borderRadius:"10px",fontSize:"0.68rem",fontWeight:500},
  verificBadge:{background:"var(--green-light)",color:"var(--green)",padding:"0.1rem 0.45rem",borderRadius:"10px",fontSize:"0.68rem",fontWeight:500},
  prodDesc:{fontSize:"0.75rem",color:"var(--gray-400)",lineHeight:1.4,marginBottom:"0.35rem"},
  contador:{display:"flex",alignItems:"center",gap:"0.35rem"},
  cBtn:{width:"26px",height:"26px",borderRadius:"50%",border:"1.5px solid var(--gray-200)",background:"#fff",fontWeight:700,fontSize:"0.95rem",cursor:"pointer"},
  cNum:{fontSize:"0.9rem",fontWeight:700,minWidth:"20px",textAlign:"center"},
  carritoSide:{background:"#fff",borderRadius:"var(--radius)",padding:"1.25rem",boxShadow:"var(--shadow-md)",border:"1px solid var(--gray-200)",position:"sticky",top:"80px"},
  miniTitle:{fontFamily:"'Playfair Display',serif",fontSize:"0.95rem",marginBottom:"0.85rem",paddingBottom:"0.5rem",borderBottom:"1px solid var(--gray-200)"},
  carritoItem:{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.45rem 0",borderBottom:"1px solid var(--gray-100)"},
  cBtnSm:{width:"20px",height:"20px",borderRadius:"50%",border:"1px solid var(--gray-200)",background:"var(--gray-50)",fontWeight:700,fontSize:"0.8rem",cursor:"pointer"},
  btnPedir:{width:"100%",padding:"0.7rem",background:"var(--green)",color:"#fff",border:"none",borderRadius:"8px",fontWeight:700,fontSize:"0.9rem",marginTop:"0.5rem",cursor:"pointer"},
  secTitle:{fontFamily:"'Playfair Display',serif",fontSize:"1.3rem",marginBottom:"1.25rem"},
  pedidoCard:{background:"#fff",borderRadius:"var(--radius)",padding:"1.25rem",marginBottom:"0.75rem",boxShadow:"var(--shadow-sm)",border:"1px solid var(--gray-200)"},
  pedidoTop:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"},
  timeline:{display:"flex",justifyContent:"space-between",padding:"0 0 1rem",marginBottom:"0.75rem",borderBottom:"1px solid var(--gray-100)"},
  reporteWrap:{display:"flex",justifyContent:"center"},
  reporteCard:{background:"#fff",borderRadius:"var(--radius)",padding:"2rem",maxWidth:"540px",width:"100%",boxShadow:"var(--shadow-sm)",border:"1px solid var(--gray-200)"},
  form:{display:"flex",flexDirection:"column",gap:"0.9rem"},
  input:{padding:"0.6rem 0.8rem",border:"1.5px solid var(--gray-200)",borderRadius:"8px",fontSize:"0.9rem"},
  btn:{padding:"0.7rem",background:"var(--primary)",color:"#fff",border:"none",borderRadius:"8px",fontWeight:600,fontSize:"0.9rem",cursor:"pointer"},
  btnGray:{padding:"0.4rem 0.85rem",background:"var(--gray-100)",color:"var(--gray-600)",border:"none",borderRadius:"8px",fontWeight:500,fontSize:"0.82rem",cursor:"pointer"},
  btnSecundario:{flex:1,padding:"0.75rem",background:"var(--gray-100)",color:"var(--gray-800)",border:"none",borderRadius:"8px",fontWeight:600,fontSize:"0.9rem",cursor:"pointer"},
  btnConfirmar:{padding:"0.75rem 1.25rem",background:"var(--green)",color:"#fff",border:"none",borderRadius:"8px",fontWeight:700,fontSize:"0.9rem",cursor:"pointer"},
  alertBox:{padding:"0.6rem 0.85rem",borderRadius:"8px",fontSize:"0.85rem",fontWeight:500},
  emptyState:{textAlign:"center",padding:"3rem",color:"var(--gray-400)",display:"flex",flexDirection:"column",alignItems:"center",gap:"0.65rem"},
  checkoutWrap:{display:"flex",justifyContent:"center",padding:"2rem 1.5rem"},
  checkoutCard:{background:"#fff",borderRadius:"var(--radius)",boxShadow:"var(--shadow-lg)",width:"100%",maxWidth:"820px",overflow:"hidden"},
  checkoutHdr:{background:"linear-gradient(135deg,#c0392b,#7b241c)",padding:"1.1rem 1.5rem",display:"flex",alignItems:"center",gap:"1rem"},
  checkoutBody:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0"},
  resumenBox:{background:"var(--gray-50)",margin:"1.5rem",borderRadius:"8px",overflow:"hidden",border:"1px solid var(--gray-200)"},
  resumenRow:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"0.75rem 1rem",borderBottom:"1px solid var(--gray-200)"},
  entregaForm:{padding:"1.5rem",display:"flex",flexDirection:"column",gap:"0.85rem",borderLeft:"1px solid var(--gray-200)"},
  pagoGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem"},
  pagoOpt:{border:"1.5px solid var(--gray-200)",borderRadius:"8px",padding:"0.5rem 0.65rem",fontSize:"0.82rem",fontWeight:500,textAlign:"center",cursor:"pointer"},
  pagoOptActive:{border:"1.5px solid var(--primary)",background:"var(--primary-light)",color:"var(--primary)",fontWeight:600},
  confirWrap:{display:"flex",justifyContent:"center",padding:"3rem 1.5rem"},
  confirCard:{background:"#fff",borderRadius:"var(--radius)",padding:"2.5rem",maxWidth:"440px",width:"100%",textAlign:"center",boxShadow:"var(--shadow-lg)"},
  confirBox:{background:"var(--gray-50)",borderRadius:"8px",overflow:"hidden",border:"1px solid var(--gray-200)",marginBottom:"0.5rem",textAlign:"left"},
};
