import { money, nf, fdate, esc, today } from './utils/format.js';
import { seed } from './data/catalogo.js';

const K='sisdecar-demo-v3', IVA=0.19;
const $=s=>document.querySelector(s);

function load(){try{const r=localStorage.getItem(K);if(r)return JSON.parse(r)}catch(e){}return seed()}
function save(){try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}}
let S=load();

const pieza=id=>S.piezas.find(p=>p.id===+id);
const cliente=id=>S.clientes.find(c=>c.id===+id);
const item=k=>k[0]==='p'?pieza(k.slice(1)):S.servicios.find(s=>s.id===+k.slice(1));
const itemName=k=>{const it=item(k);return it?it.nombre:'—'};
const totals=items=>{const sub=items.reduce((a,l)=>a+l.c*l.v,0);return {sub,iva:sub*IVA,total:sub*(1+IVA)}};
const status=p=>p.stock<=0?['bad','Agotado']:p.stock<p.min?['bad','Bajo mínimo']:p.stock<p.min*1.5?['warn','Por pedir']:['ok','OK'];
const kitsPosibles=()=>Math.min(...S.piezas.filter(p=>p.kit>0).map(p=>Math.floor(p.stock/p.kit)));
const lastMonth=()=>S.remisiones.reduce((m,r)=>r.fecha>m?r.fecha:m,'').slice(0,7);
const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

let view='panel',arg=null,draft=null,inv={q:'',cat:'Todas',low:false},remQ='',plateF=null,formErr='';

function go(v,a){view=v;arg=a??null;formErr='';if(v==='nueva'&&!draft)draft=newDraft();if(v==='cliente')plateF=null;render();window.scrollTo(0,0)}
function render(){
  const navKey={remision:'remisiones',cliente:'clientes'}[view]||view;
  document.querySelectorAll('#nav [data-nav], #tabbar [data-nav]').forEach(b=>b.classList.toggle('on',b.dataset.nav===navKey));
  $('#main').innerHTML=V[view](arg);
}
function toast(msg){const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2600)}

const V={};

V.panel=()=>{
  const mes=lastMonth(), rm=S.remisiones.filter(r=>r.fecha.startsWith(mes));
  const ventas=rm.reduce((a,r)=>a+totals(r.items).sub,0);
  const valInv=S.piezas.reduce((a,p)=>a+p.stock*p.costo,0);
  const bajos=S.piezas.filter(p=>p.stock<p.min);
  const porCli=S.clientes.map(c=>({c,v:rm.filter(r=>r.cli===c.id).reduce((a,r)=>a+totals(r.items).sub,0)})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v);
  const maxV=Math.max(...porCli.map(x=>x.v),1);
  const kp=kitsPosibles();
  const lim=S.piezas.filter(p=>p.kit>0&&Math.floor(p.stock/p.kit)===kp).map(p=>p.nombre);
  const [y,m]=mes.split('-');
  return `<div class="hero"><div class="hero-txt"><span class="hero-eye">Panel de ${MESES[+m-1]} ${y}</span>
      <h1>Bodega y despachos</h1><p>Lo que entra, lo que sale en cada remisión y lo que hay que reponer, sin talonario ni checklist en papel.</p>
      <div class="row"><button class="btn primary" data-nav="nueva">+ Nueva remisión</button><button class="btn" data-nav="inventario">Ver inventario</button></div></div>
    <div class="hero-img"><img src="${import.meta.env.BASE_URL}hero.png" alt="Volqueta con sistema de carpado Sisdecar"></div></div>
  <div class="grid g4">
    <div class="panel kpi"><div class="lbl">Ventas del mes</div><div class="val">${money(ventas)}</div><div class="note">antes de IVA</div></div>
    <div class="panel kpi"><div class="lbl">Remisiones del mes</div><div class="val">${rm.length}</div><div class="note">última Nº ${Math.max(...S.remisiones.map(r=>r.num))}</div></div>
    <div class="panel kpi"><div class="lbl">Inventario al costo</div><div class="val">${money(valInv)}</div><div class="note">${S.piezas.length} referencias</div></div>
    <div class="panel kpi ${bajos.length?'alert':''}"><div class="lbl">Bajo mínimo</div><div class="val">${bajos.length}</div><div class="note">referencias por reponer</div></div>
  </div>
  <div class="callout" style="margin-top:16px"><div><div class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.06em">Sistemas completos que se pueden instalar con el stock actual</div>
    <b>${kp} ${kp===1?'instalación':'instalaciones'}</b> <span class="muted">· limita: ${esc(lim.join(', '))}</span></div>
    <button class="btn" data-nav="kits">Ver kit de carpado</button></div>
  <div class="grid g2" style="margin-top:16px">
    <div class="panel"><h2>Por reponer</h2>
      ${bajos.length?`<div class="tw"><table class="rt"><tr><th>Pieza</th><th class="num">Stock</th><th class="num">Mínimo</th><th></th></tr>
      ${bajos.map(p=>`<tr><td class="cm">${esc(p.nombre)} <span class="code">${p.cod}</span></td><td class="num" data-label="Stock"><span class="pill bad">${nf(p.stock)} ${p.und}</span></td><td class="num" data-label="Mínimo">${nf(p.min)}</td><td class="num ca"><button class="btn sm" data-act="entrada" data-id="${p.id}">Registrar entrada</button></td></tr>`).join('')}</table></div>`:'<p class="muted">Todo el inventario está sobre el mínimo.</p>'}
    </div>
    <div class="panel"><h2>Ventas por cliente</h2><div class="bars">
      ${porCli.map(x=>`<div class="bar"><span class="name">${esc(x.c.nombre)}</span><span class="t"><i style="width:${x.v/maxV*100}%"></i></span><span class="n">${money(x.v)}</span></div>`).join('')}
    </div></div>
  </div>
  <div style="margin-top:16px"><h2>Últimas remisiones</h2>${remTable(S.remisiones.slice().sort((a,b)=>b.num-a.num).slice(0,5))}</div>`;
};

function remTable(list){
  if(!list.length)return '<p class="muted">No hay remisiones que coincidan.</p>';
  return `<div class="tw"><table class="rt"><tr><th>Nº</th><th>Fecha</th><th>Cliente</th><th>Placa</th><th>Técnico</th><th class="num">Total con IVA</th></tr>
  ${list.map(r=>`<tr class="click" data-act="open-rem" data-num="${r.num}"><td class="code rem-n" data-label="Remisión">${r.num}</td><td data-label="Fecha">${fdate(r.fecha)}</td><td class="cm">${esc(cliente(r.cli)?.nombre)}</td><td data-label="Placa"><span class="plate">${esc(r.placa)}</span></td><td data-label="Técnico">${esc(r.tec)}</td><td class="num rem-t" data-label="Total con IVA">${money(totals(r.items).total)}${r.alerta?' <span class="pill warn">revisar</span>':''}</td></tr>`).join('')}</table></div>`;
}

V.inventario=()=>{
  const cats=['Todas',...new Set(S.piezas.map(p=>p.cat))];
  const q=inv.q.toLowerCase();
  const list=S.piezas.filter(p=>(inv.cat==='Todas'||p.cat===inv.cat)&&(!inv.low||p.stock<p.min)&&(!q||(p.nombre+' '+p.cod).toLowerCase().includes(q)));
  return `<div class="head"><div><h1>Inventario</h1><p class="sub">${S.piezas.length} referencias: el catálogo de sisdecar.com más las piezas del listado del sistema de carpado</p></div>
    <button class="btn primary" data-act="entrada">Registrar entrada</button></div>
  <div class="toolbar"><input type="search" id="inv-q" class="search" placeholder="Buscar pieza o código" value="${esc(inv.q)}">
    <div class="chips scroll">${cats.map(c=>`<button class="chip ${inv.cat===c?'on':''}" data-act="cat" data-cat="${c}">${c}</button>`).join('')}</div>
    <label class="row" style="font-size:13px"><input type="checkbox" id="inv-low" ${inv.low?'checked':''}> Solo bajo mínimo</label></div>
  <div class="tw" id="inv-table">${invTable(list)}</div>
  ${S.entradas.length?`<div style="margin-top:22px"><h2>Últimas entradas a bodega</h2><div class="tw"><table class="rt"><tr><th>Fecha</th><th>Pieza</th><th class="num">Cantidad</th><th>Nota</th></tr>
  ${S.entradas.slice().reverse().slice(0,6).map(e=>`<tr><td class="cm">${esc(pieza(e.pid)?.nombre)}</td><td data-label="Fecha">${fdate(e.fecha)}</td><td class="num" data-label="Cantidad">+${nf(e.c)} ${pieza(e.pid)?.und}</td><td class="muted ca" data-label="Nota">${esc(e.nota)}</td></tr>`).join('')}</table></div></div>`:''}`;
};
function invTable(list){
  if(!list.length)return '<p class="muted" style="padding:14px">Ninguna pieza coincide con el filtro.</p>';
  return `<table class="rt rt-inv"><tr><th>Código</th><th>Pieza</th><th>Categoría</th><th class="num">Stock</th><th class="num">Mínimo</th><th>Estado</th><th class="num">Costo</th><th class="num">Precio venta</th><th></th></tr>
  ${list.map(p=>{const [c,t]=status(p);const pct=Math.min(100,p.stock/(p.min*2)*100);
    return `<tr><td class="code rt-code">${p.cod}</td><td class="cm">${esc(p.nombre)}</td><td class="muted hide-sm">${p.cat}</td>
    <td class="num" data-label="Stock">${nf(p.stock)} ${p.und}<span class="stockbar"><i style="width:${pct}%;background:var(--${c})"></i></span></td>
    <td class="num hide-sm">${nf(p.min)}</td><td data-label="Estado"><span class="pill ${c}">${t}</span></td><td class="num hide-sm">${money(p.costo)}</td><td class="num" data-label="Precio">${money(p.precio)}</td>
    <td class="num ca"><button class="btn sm" data-act="entrada" data-id="${p.id}">+ Entrada</button></td></tr>`}).join('')}</table>`;
}

V.kits=()=>{
  const ps=S.piezas.filter(p=>p.kit>0), kp=kitsPosibles();
  const precio=ps.reduce((a,p)=>a+p.kit*p.precio,0), costo=ps.reduce((a,p)=>a+p.kit*p.costo,0);
  return `<div class="head"><div><h1>Sistema de carpado completo</h1><p class="sub">Lista de materiales de una instalación (${ps.length} referencias). Al cargar el kit en una remisión, se descuentan todas de una vez.</p></div>
    <button class="btn primary" data-act="new-kit">Remisión con kit completo</button></div>
  <div class="grid g4">
    <div class="panel kpi ${kp<2?'alert':''}"><div class="lbl">Instalaciones posibles</div><div class="val">${kp}</div><div class="note">con el stock actual</div></div>
    <div class="panel kpi"><div class="lbl">Precio piezas del kit</div><div class="val">${money(precio)}</div><div class="note">sin mano de obra</div></div>
    <div class="panel kpi"><div class="lbl">Costo del kit</div><div class="val">${money(costo)}</div><div class="note">margen ${Math.round((1-costo/precio)*100)} %</div></div>
    <div class="panel kpi"><div class="lbl">Instalación</div><div class="val">${money(S.servicios[0].precio)}</div><div class="note">servicio aparte</div></div>
  </div>
  <div class="tw" style="margin-top:16px"><table class="rt"><tr><th>Código</th><th>Pieza</th><th class="num">Por kit</th><th class="num">En stock</th><th class="num">Alcanza para</th><th class="num">Subtotal</th></tr>
  ${ps.map(p=>{const a=Math.floor(p.stock/p.kit);const c=a===kp?'bad':a<=kp+1?'warn':'neutral';
    return `<tr><td class="code hide-sm">${p.cod}</td><td class="cm">${esc(p.nombre)}</td><td class="num" data-label="Por kit">${nf(p.kit)} ${p.und}</td><td class="num" data-label="En stock">${nf(p.stock)}</td><td class="num" data-label="Alcanza para"><span class="pill ${c}">${a} kits</span></td><td class="num" data-label="Subtotal">${money(p.kit*p.precio)}</td></tr>`}).join('')}</table></div>`;
};

V.remisiones=()=>{
  const q=remQ.toLowerCase();
  const list=S.remisiones.slice().sort((a,b)=>b.num-a.num).filter(r=>!q||[r.num,r.placa,r.tec,cliente(r.cli)?.nombre].join(' ').toLowerCase().includes(q));
  return `<div class="head"><div><h1>Remisiones</h1><p class="sub">Consecutivo automático. Cada remisión descuenta del inventario lo que despacha.</p></div>
    <button class="btn primary" data-nav="nueva">+ Nueva remisión</button></div>
  <div class="toolbar"><input type="search" id="rem-q" class="search wide" placeholder="Buscar por número, cliente, placa o técnico" value="${esc(remQ)}"></div>
  <div id="rem-list">${remTable(list)}</div>`;
};

V.remision=num=>{
  const r=S.remisiones.find(x=>x.num===+num); if(!r)return '<p>No existe esa remisión.</p>';
  const c=cliente(r.cli), t=totals(r.items), [y,m,d]=r.fecha.split('-');
  return `<div class="head"><div><button class="btn sm ghost" data-nav="remisiones">← Remisiones</button><h1 style="margin-top:6px">Remisión ${r.num}</h1></div>
    <div class="row"><button class="btn" data-act="copy" data-num="${r.num}">Copiar para WhatsApp</button><button class="btn" data-act="dup" data-num="${r.num}">Duplicar</button></div></div>
  ${r.alerta?`<div class="banner warn"><div><strong>Diferencia con el papel del técnico.</strong> ${esc(r.alerta)}</div></div>`:''}
  <div class="doc">
    <div class="doc-h">
      <div><img class="doc-logo" src="${import.meta.env.BASE_URL}logo.png" alt="Sisdecar S.A.S." width="250" height="94">
        <div class="doc-meta">Sistemas de carpado para volquetas · NIT 900.672.723-4 · Régimen común<br>Cra. 52 No. 117-15 Medellín, Antioquia · Tel. (604) 366 59 31<br>comercial@sisdecar.com · WhatsApp 320 659 3082 · sisdecar.com</div></div>
      <div><div class="doc-num"><span class="t">REMISIÓN</span><span class="n">Nº ${r.num}</span></div>
        <div class="doc-date"><div><span>DÍA</span><b>${d}</b></div><div><span>MES</span><b>${m}</b></div><div><span>AÑO</span><b>${y}</b></div></div></div>
    </div>
    <div class="doc-fields">
      <div><span>Señor(es)</span>${esc(c?.nombre)}</div><div><span>C.C. o NIT</span>${esc(c?.nit)}</div>
      <div><span>Ciudad</span>${esc(c?.ciudad||'—')}</div><div><span>Placa</span><span class="plate" style="display:inline-block;margin-top:2px">${esc(r.placa)}</span></div>
    </div>
    <div class="doc-bar">Despachamos a Uds. los siguientes artículos y/o prestamos los servicios</div>
    <div style="overflow-x:auto"><table class="rt rt3"><tr><th class="num">Cantidad</th><th>Descripción</th><th class="num">Vr. unitario</th><th class="num">Vr. total</th></tr>
      ${r.items.map(l=>{const it=item(l.k);return `<tr><td class="num" data-label="Cant.">${nf(l.c)} ${l.k[0]==='p'?it?.und:''}</td><td class="cm">${esc(it?.nombre)}${l.k[0]==='s'?' <span class="pill neutral">servicio</span>':''}</td><td class="num" data-label="Vr. unitario">${money(l.v)}</td><td class="num" data-label="Vr. total">${money(l.c*l.v)}</td></tr>`}).join('')}
    </table></div>
    <div class="doc-tot"><dl><dt>Subtotal</dt><dd>${money(t.sub)}</dd><dt>IVA 19 %</dt><dd>${money(t.iva)}</dd><dt class="big">Total</dt><dd class="big">${money(t.total)}</dd></dl></div>
    ${r.obs?`<div style="padding:10px 16px;border-top:1px solid var(--line);font-size:13px"><b>Observaciones:</b> ${esc(r.obs)}</div>`:''}
    <div class="doc-sign"><div><span>Autorizó</span>${esc(r.aut||'')}</div><div><span>Ejecutó / despachó</span>${esc(r.tec||'')}</div><div><span>Recibió</span></div></div>
  </div>`;
};

function newDraft(){return {cli:S.clientes[0].id,placa:'',tec:S.tecnicos[0],aut:'',fecha:today(),obs:'',lines:[{k:'p'+S.piezas[0].id,c:1,v:S.piezas[0].precio}]}}
const nextNum=()=>Math.max(...S.remisiones.map(r=>r.num))+1;

V.nueva=()=>{
  const d=draft, c=cliente(d.cli);
  return `<div class="head"><div><h1>Nueva remisión <span class="code" style="font-size:20px;color:var(--red)">Nº ${nextNum()}</span></h1><p class="sub">Esta remisión reemplaza el talonario y el checklist del técnico: lo que se registra aquí es lo que sale de bodega.</p></div></div>
  ${formErr?`<div class="banner bad"><div><strong>No se pudo guardar.</strong> ${esc(formErr)}</div></div>`:''}
  <div class="panel"><div class="form">
    <label class="f">Cliente<select id="d-cli">${S.clientes.map(x=>`<option value="${x.id}" ${x.id===d.cli?'selected':''}>${esc(x.nombre)}</option>`).join('')}</select></label>
    <label class="f">Placa<input type="text" id="d-placa" list="placas" placeholder="Ej. WFN-631" value="${esc(d.placa)}"><datalist id="placas">${(c?.placas||[]).map(p=>`<option value="${p}">`).join('')}</datalist></label>
    <label class="f">Técnico que ejecuta<select id="d-tec">${S.tecnicos.map(x=>`<option ${x===d.tec?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
    <label class="f">Fecha<input type="date" id="d-fecha" value="${d.fecha}"></label>
    <label class="f">Autorizó<input type="text" id="d-aut" placeholder="Nombre de quien autoriza" value="${esc(d.aut)}"></label>
    <label class="f f-wide">Observaciones<input type="text" id="d-obs" value="${esc(d.obs)}"></label>
  </div></div>
  <div class="panel" style="margin-top:16px">
    <div class="row" style="margin-bottom:10px"><h2 style="margin:0">Artículos y servicios</h2><span class="sp"></span>
      <button class="btn sm" data-act="add-kit">Cargar kit completo</button><button class="btn sm" data-act="add-line">+ Agregar línea</button></div>
    <div style="overflow-x:auto"><table class="lines rt"><tr><th>Descripción</th><th class="num">Cantidad</th><th class="num">Vr. unitario</th><th class="num">Total</th><th>Stock</th><th></th></tr>
    ${d.lines.map((l,i)=>{const it=item(l.k);const p=l.k[0]==='p';const short=p&&l.c>it.stock;
      return `<tr><td class="cm"><select data-line="${i}" data-f="k">
        <optgroup label="Piezas">${S.piezas.map(x=>`<option value="p${x.id}" ${l.k==='p'+x.id?'selected':''}>${esc(x.nombre)} (${x.cod})</option>`).join('')}</optgroup>
        <optgroup label="Servicios">${S.servicios.map(x=>`<option value="s${x.id}" ${l.k==='s'+x.id?'selected':''}>${esc(x.nombre)}</option>`).join('')}</optgroup></select></td>
        <td class="num" data-label="Cantidad"><input type="number" min="0" step="1" inputmode="numeric" data-line="${i}" data-f="c" value="${l.c}"></td>
        <td class="num" data-label="Vr. unitario"><input type="number" min="0" step="500" inputmode="numeric" data-line="${i}" data-f="v" value="${l.v}" class="in-price"></td>
        <td class="num" data-label="Total" id="lt-${i}">${money(l.c*l.v)}</td>
        <td data-label="En stock" id="ls-${i}">${p?`<span class="pill ${short?'bad':'neutral'}">${nf(it.stock)} ${it.und}</span>`:'<span class="muted">—</span>'}</td>
        <td class="del"><button class="btn sm ghost danger" data-act="del-line" data-i="${i}" aria-label="Quitar línea">✕</button></td></tr>`}).join('')}
    </table></div>
    <div class="tot-box" id="tot-box">${totBox()}</div>
  </div>
  <div class="row actions" style="margin-top:16px;justify-content:flex-end"><button class="btn" data-act="cancel">Descartar</button><button class="btn primary" data-act="save">Guardar remisión y descontar inventario</button></div>`;
};
function totBox(){const t=totals(draft.lines);return `<span class="muted">Subtotal ${money(t.sub)}</span><span class="muted">IVA 19 % ${money(t.iva)}</span><span>Total <b>${money(t.total)}</b></span>`}

V.clientes=()=>`<div class="head"><div><h1>Clientes y vehículos</h1><p class="sub">Historial por empresa y por placa de volqueta</p></div></div>
  <div class="cards">${S.clientes.map(c=>{const rs=S.remisiones.filter(r=>r.cli===c.id);
    return `<div class="card" data-act="open-cli" data-id="${c.id}" tabindex="0"><h3>${esc(c.nombre)}</h3><div class="code">NIT ${esc(c.nit)} · ${esc(c.ciudad||'—')}</div>
    <div class="chips">${c.placas.map(p=>`<span class="plate">${esc(p)}</span>`).join('')}</div>
    <div class="row muted" style="font-size:13px"><span>${rs.length} remisiones</span><span class="sp"></span><span>${money(rs.reduce((a,r)=>a+totals(r.items).sub,0))}</span></div></div>`}).join('')}</div>
  <div class="panel" style="margin-top:20px;max-width:760px"><h2>Agregar cliente</h2><div class="form" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
    <label class="f">Razón social<input type="text" id="c-nom"></label><label class="f">NIT o C.C.<input type="text" id="c-nit"></label>
    <label class="f">Ciudad<input type="text" id="c-ciu"></label><label class="f">Placas (separadas por coma)<input type="text" id="c-pla"></label></div>
    <div style="margin-top:12px"><button class="btn primary" data-act="add-cli">Guardar cliente</button></div></div>`;

V.cliente=id=>{
  const c=cliente(id), rs=S.remisiones.filter(r=>r.cli===c.id&&(!plateF||r.placa===plateF)).sort((a,b)=>b.num-a.num);
  return `<div class="head"><div><button class="btn sm ghost" data-nav="clientes">← Clientes</button><h1 style="margin-top:6px">${esc(c.nombre)}</h1><p class="sub">NIT ${esc(c.nit)} · ${esc(c.ciudad||'—')}</p></div>
    <button class="btn primary" data-act="new-for" data-id="${c.id}">+ Remisión para este cliente</button></div>
  <div class="toolbar"><span class="muted">Vehículos:</span><div class="chips scroll"><button class="chip ${!plateF?'on':''}" data-act="plate" data-p="">Todos</button>${c.placas.map(p=>`<button class="chip ${plateF===p?'on':''}" data-act="plate" data-p="${esc(p)}">${esc(p)}</button>`).join('')}</div></div>
  ${remTable(rs)}`;
};

/* Modal de entrada a bodega */
function openEntrada(pid){
  $('#layer').innerHTML=`<div class="overlay" data-act="close-modal"><div class="modal" role="dialog" aria-label="Registrar entrada">
    <h2 style="margin:0">Registrar entrada a bodega</h2>
    <label class="f">Pieza<select id="e-p">${S.piezas.map(p=>`<option value="${p.id}" ${+pid===p.id?'selected':''}>${esc(p.nombre)} (stock ${nf(p.stock)} ${p.und})</option>`).join('')}</select></label>
    <label class="f">Cantidad que entra<input type="number" id="e-c" min="1" value="10"></label>
    <label class="f">Nota (proveedor, factura de compra)<input type="text" id="e-n" placeholder="Ej. Factura proveedor 1234"></label>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-act="close-modal">Cancelar</button><button class="btn primary" data-act="save-entrada">Sumar al inventario</button></div>
  </div></div>`;
  $('#e-c').focus();
}

const A={
  'open-rem':d=>go('remision',d.num),
  'open-cli':d=>go('cliente',d.id),
  plate:d=>{plateF=d.p||null;render()},
  cat:d=>{inv.cat=d.cat;render()},
  entrada:d=>openEntrada(d.id),
  'close-modal':(d,t,e)=>{if(e.target===t)$('#layer').innerHTML=''},
  'save-entrada':()=>{const p=pieza($('#e-p').value),c=Math.floor(+$('#e-c').value);
    if(!(c>0)){$('#e-c').focus();return}
    p.stock+=c;S.entradas.push({fecha:today(),pid:p.id,c,nota:$('#e-n').value.trim()||'Entrada manual'});save();
    $('#layer').innerHTML='';render();toast(`Entraron ${nf(c)} ${p.und} de ${p.nombre}. Stock: ${nf(p.stock)}`)},
  'add-line':()=>{draft.lines.push({k:'p'+S.piezas[0].id,c:1,v:S.piezas[0].precio});render()},
  'del-line':d=>{draft.lines.splice(+d.i,1);render()},
  'add-kit':()=>{S.piezas.filter(p=>p.kit>0).forEach(p=>{const ex=draft.lines.find(l=>l.k==='p'+p.id);if(ex)ex.c+=p.kit;else draft.lines.push({k:'p'+p.id,c:p.kit,v:p.precio})});
    if(!draft.lines.some(l=>l.k==='s1'))draft.lines.push({k:'s1',c:1,v:S.servicios[0].precio});
    draft.lines=draft.lines.filter(l=>l.c>0);render();toast('Kit completo cargado con la instalación')},
  'new-kit':()=>{draft=newDraft();draft.lines=[];go('nueva');A['add-kit']()},
  'new-for':d=>{draft=newDraft();draft.cli=+d.id;draft.placa=cliente(d.id).placas[0]||'';go('nueva')},
  dup:d=>{const r=S.remisiones.find(x=>x.num===+d.num);draft=Object.assign(newDraft(),{cli:r.cli,placa:r.placa,tec:r.tec,aut:r.aut,lines:r.items.map(l=>({...l}))});go('nueva')},
  cancel:()=>{draft=null;go('remisiones')},
  save:()=>{
    const d=draft, lines=d.lines.filter(l=>l.c>0);
    if(!d.placa.trim()){formErr='Falta la placa del vehículo.';render();return}
    if(!lines.length){formErr='Agregue al menos un artículo o servicio.';render();return}
    const need={};lines.forEach(l=>{if(l.k[0]==='p')need[l.k]=(need[l.k]||0)+l.c});
    const falt=Object.entries(need).filter(([k,c])=>c>item(k).stock).map(([k,c])=>`${item(k).nombre} (pide ${nf(c)}, hay ${nf(item(k).stock)})`);
    if(falt.length){formErr='No hay stock suficiente de: '+falt.join('; ')+'. Registre la entrada o ajuste las cantidades.';render();return}
    Object.entries(need).forEach(([k,c])=>{item(k).stock-=c});
    const placa=d.placa.trim().toUpperCase(), c=cliente(d.cli);
    if(!c.placas.includes(placa))c.placas.push(placa);
    const num=nextNum();
    S.remisiones.push({num,fecha:d.fecha||today(),cli:d.cli,placa,tec:d.tec,aut:d.aut.trim(),obs:d.obs.trim(),items:lines.map(l=>({k:l.k,c:l.c,v:l.v}))});
    save();draft=null;go('remision',num);toast(`Remisión ${num} guardada. Inventario actualizado.`)},
  copy:d=>{const r=S.remisiones.find(x=>x.num===+d.num),t=totals(r.items);
    const txt=`*SISDECAR S.A.S* · Remisión Nº ${r.num}\nFecha: ${fdate(r.fecha)}\nCliente: ${cliente(r.cli).nombre} (NIT ${cliente(r.cli).nit})\nPlaca: ${r.placa}\n\n`+
      r.items.map(l=>`${nf(l.c)} × ${itemName(l.k)} = ${money(l.c*l.v)}`).join('\n')+`\n\nSubtotal: ${money(t.sub)}\nIVA 19%: ${money(t.iva)}\n*Total: ${money(t.total)}*`;
    navigator.clipboard.writeText(txt).then(()=>toast('Resumen copiado. Péguelo en WhatsApp.'),()=>{
      $('#layer').innerHTML=`<div class="overlay" data-act="close-modal"><div class="modal"><h2 style="margin:0">Copie el resumen</h2><textarea id="cp" rows="12" style="width:100%;font:13px var(--mono);border:1px solid var(--line);border-radius:6px;padding:8px;background:var(--sunk);color:var(--ink)">${esc(txt)}</textarea><div class="row" style="justify-content:flex-end"><button class="btn" data-act="close-modal">Cerrar</button></div></div></div>`;
      $('#cp').select()})},
  'add-cli':()=>{const nom=$('#c-nom').value.trim();if(!nom){$('#c-nom').focus();return}
    S.clientes.push({id:Math.max(...S.clientes.map(c=>c.id))+1,nombre:nom,nit:$('#c-nit').value.trim(),ciudad:$('#c-ciu').value.trim(),tel:'',
      placas:$('#c-pla').value.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean)});save();render();toast('Cliente agregado')},
};

document.addEventListener('click',e=>{
  const n=e.target.closest('[data-nav]');if(n){if(n.dataset.nav==='nueva')draft=null;go(n.dataset.nav);return}
  const t=e.target.closest('[data-act]');if(t&&A[t.dataset.act])A[t.dataset.act](t.dataset,t,e);
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape')$('#layer').innerHTML='';
  if(e.key==='Enter'&&e.target.matches('.card[data-act]'))e.target.click();
});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.id==='inv-q'){inv.q=t.value;const q=inv.q.toLowerCase();
    $('#inv-table').innerHTML=invTable(S.piezas.filter(p=>(inv.cat==='Todas'||p.cat===inv.cat)&&(!inv.low||p.stock<p.min)&&(!q||(p.nombre+' '+p.cod).toLowerCase().includes(q))));return}
  if(t.id==='rem-q'){remQ=t.value;const q=remQ.toLowerCase();
    $('#rem-list').innerHTML=remTable(S.remisiones.slice().sort((a,b)=>b.num-a.num).filter(r=>!q||[r.num,r.placa,r.tec,cliente(r.cli)?.nombre].join(' ').toLowerCase().includes(q)));return}
  if(!draft)return;
  const map={'d-placa':'placa','d-aut':'aut','d-obs':'obs','d-fecha':'fecha'};
  if(map[t.id]){draft[map[t.id]]=t.value;return}
  if(t.dataset.line&&(t.dataset.f==='c'||t.dataset.f==='v')){
    const i=+t.dataset.line,l=draft.lines[i];l[t.dataset.f]=Math.max(0,+t.value||0);
    $('#lt-'+i).textContent=money(l.c*l.v);
    if(l.k[0]==='p'){const it=item(l.k);$('#ls-'+i).innerHTML=`<span class="pill ${l.c>it.stock?'bad':'neutral'}">${nf(it.stock)} ${it.und}</span>`}
    $('#tot-box').innerHTML=totBox();
  }
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='inv-low'){inv.low=t.checked;render();return}
  if(!draft)return;
  if(t.id==='d-cli'){draft.cli=+t.value;draft.placa=cliente(t.value).placas[0]||'';render();return}
  if(t.id==='d-tec'){draft.tec=t.value;return}
  if(t.dataset.f==='k'){const l=draft.lines[+t.dataset.line];l.k=t.value;l.v=item(t.value).precio;render()}
});
const rb=$('#reset');let armed=false;
rb.addEventListener('click',()=>{
  if(!armed){armed=true;rb.textContent='Confirmar: borrar cambios';setTimeout(()=>{armed=false;rb.textContent='Restablecer datos del demo'},4000);return}
  S=seed();save();draft=null;armed=false;rb.textContent='Restablecer datos del demo';go('panel');toast('Datos del demo restablecidos');
});
go('panel');
