/* CELSIUS V23 · Catálogo de equipos y refacciones.
   - Consulta y administración de catálogos (solo Gestor y Administrador).
   - Selección guiada de la refacción en "Nueva garantía": al completar la selección,
     los datos del equipo quedan fijos en una ficha (no editables) hasta pulsar "Cambiar".
   - Lectura de Excel (.xlsx) y CSV sin internet; escritura con assets/vendor/celsius-xlsx.js.
   Prototipo sin backend: los catálogos cargados se guardan en el navegador (IndexedDB). */
'use strict';
(function(){
const MANAGERS=['master','corp'];        // consultan, cargan, exportan y eliminan catálogos
const PAGE=25;
const ROLE_NAME={E:'Evaporadora',C:'Condensadora'};
const h=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const key=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const fmtN=n=>Number(n||0).toLocaleString('es-MX');
const toast=m=>typeof notify==='function'?notify(m):alert(m);
const currentRole=()=>{try{return role}catch(e){return 'guest'}};
const isManager=()=>MANAGERS.includes(currentRole());
const words=q=>norm(q).trim().split(/\s+/).filter(Boolean);
const matches=(hay,q)=>{const n=norm(hay);return words(q).every(w=>n.includes(w))};

/* ---------- Categorías (si el Excel no trae la columna) ---------- */
const CAT_RULES=[[/remote|wired controller|control remoto/,'Control remoto'],[/capacitor/,'Capacitores'],[/compressor.*(wire|cable)/,'Cableado y terminales'],[/(bolt|screw|foot).*compressor|compressor.*(bolt|foot)/,'Tornillería y sujeción'],[/compressor|compresor/,'Compresor'],[/sensor|termistor|thermistor/,'Sensores'],[/motor (cover|support|holder|bracket|clip|plate)|shaft sleeve/,'Soportes y estructura'],[/motor/,'Motores'],[/fan|ventilador|turbina|aspa/,'Ventiladores'],[/valve|valvula/,'Válvulas'],[/evaporator|condenser|serpent/,'Serpentines'],[/reactor|inductor|transformer|contactor|relay|radiator|heater/,'Componentes eléctricos'],[/display|board|pcb|controller|module|tarjeta|placa/,'Tarjetas electrónicas'],[/pipe|tube|capillary|nut|accumulator|muffler|hose|tubo/,'Tubería y conexiones'],[/drain|water collect|stopple|pump|charola/,'Drenaje'],[/filter|filtro/,'Filtros'],[/terminal|wire|cable|harness/,'Cableado y terminales'],[/panel|cover|chassis|frame|grille|grill|louver|blade|vane|cabinet|casing|box|tapa|gabinete/,'Gabinete y plásticos'],[/foam|insulat|seal|rubber|paper/,'Aislamientos y empaques'],[/bolt|screw|clamp|clip|tie|hook|washer/,'Tornillería y sujeción'],[/accessor|bag|putty|kit|manual/,'Accesorios'],[/plate|bracket|support|holder|handle|foot|bearing|volute|partition|clapboard/,'Soportes y estructura']];
const inferCat=d=>{const t=norm(d);for(const [rx,c] of CAT_RULES)if(rx.test(t))return c;return 'Otros'};

/* ---------- Almacén ---------- */
const S={brands:{},ready:false,storage:'memoria',seedHidden:false};
const view={tab:'browse',brand:'',family:'',type:'',q:'',mode:'models',page:0,sel:null,role:'E',cat:'',part:null,confirmDel:''};
const imp={fileName:'',brandInput:'',mode:'replace',result:null,busy:false};

function fromSeed(seed){
  const cols=seed.systemsCols;
  const systems=seed.systems.map(r=>{const o={};cols.forEach((c,i)=>o[c]=r[i]);
    return {key:o.modelo||('EQ:'+(o.evaporadora||o.condensadora)),id:o.id,family:o.familia,model:o.modelo,desc:o.descripcion,type:o.tipo,tech:o.tecnologia,func:o.funcion,refr:o.refrigerante,tr:o.capacidad_tr,volt:o.voltaje,evap:o.evaporadora,cond:o.condensadora}});
  const equipment={};Object.entries(seed.equipment).forEach(([code,e])=>equipment[code]={code,role:e.r,alt:e.a||'',desc:e.d||'',parts:e.p});
  const parts={};Object.entries(seed.parts).forEach(([pn,p])=>parts[pn]={pn,desc:p[0],cat:seed.categories[p[1]]});
  return {name:seed.brand,version:seed.version,source:seed.source,importedAt:'',origin:'seed',systems,equipment,parts,history:[]};
}
let db=null;
const META='__meta';
function idb(){return new Promise((res,rej)=>{if(!('indexedDB' in window))return rej(new Error('sin IndexedDB'));const r=indexedDB.open('celsius-catalog',1);r.onupgradeneeded=()=>r.result.createObjectStore('brands',{keyPath:'name'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function idbAll(){return new Promise((res,rej)=>{const t=db.transaction('brands').objectStore('brands').getAll();t.onsuccess=()=>res(t.result);t.onerror=()=>rej(t.error)})}
function idbPut(b){if(!db)return Promise.resolve();const clean={...b};delete clean._idx;return new Promise((res,rej)=>{const t=db.transaction('brands','readwrite');t.objectStore('brands').put(clean);t.oncomplete=res;t.onerror=()=>rej(t.error)})}
function idbDel(name){if(!db)return Promise.resolve();return new Promise((res,rej)=>{const t=db.transaction('brands','readwrite');t.objectStore('brands').delete(name);t.oncomplete=res;t.onerror=()=>rej(t.error)})}
const saveMeta=()=>idbPut({name:META,seedHidden:S.seedHidden});
async function init(){
  let stored=[];
  try{db=await idb();S.storage='navegador';stored=await idbAll()}catch(e){S.storage='memoria'}
  const meta=stored.find(b=>b.name===META);S.seedHidden=!!(meta&&meta.seedHidden);
  if(window.CELSIUS_CATALOG_SEED&&!S.seedHidden){const b=fromSeed(window.CELSIUS_CATALOG_SEED);S.brands[b.name]=b}
  stored.filter(b=>b.name!==META).forEach(b=>S.brands[b.name]=b);
  S.ready=true;refresh();
}
const brandList=()=>Object.values(S.brands).sort((a,b)=>a.name.localeCompare(b.name));
function idx(b){if(b._idx)return b._idx;const partEq={},eqSys={};
  Object.values(b.equipment).forEach(e=>e.parts.forEach(pn=>(partEq[pn]=partEq[pn]||[]).push(e.code)));
  b.systems.forEach((s,i)=>[s.evap,s.cond].forEach(c=>{if(c)(eqSys[c]=eqSys[c]||[]).push(i)}));
  return b._idx={partEq,eqSys}}
const famOf=(b,code)=>{const s=(idx(b).eqSys[code]||[]).map(i=>b.systems[i].family);return [...new Set(s.length?s:[code.slice(0,4)])]};
const sysIndex=(b,k)=>b.systems.findIndex(s=>s.key===k);

/* =====================================================================
   PÁGINA DE CATÁLOGO (Gestor y Administrador)
   ===================================================================== */
function btn(t,a,cls='',extra=''){return `<button class="btn ${cls}" type="button" data-cat="${a}" ${extra}>${h(t)}</button>`}
function options(list,val,all){return (all!=null?`<option value="">${h(all)}</option>`:'')+list.map(o=>`<option value="${h(o)}" ${o===val?'selected':''}>${h(o)}</option>`).join('')}
function catalogPage(){
  if(!isManager())return `<section class="panel"><h2>Sin acceso</h2><p class="muted">El catálogo de refacciones está disponible para Gestor y Administrador.</p></section>`;
  const intro=head('CATÁLOGO','Catálogo de refacciones','Consulta modelos, unidades y refacciones por marca, y administra los catálogos cargados desde Excel.',`<div class="row wrap">${btn('Descargar plantilla','tpl','secondary')}${btn('Exportar a Excel','export')}</div>`);
  return `${intro}<div class="catTabs" role="tablist"><button type="button" role="tab" aria-selected="${view.tab==='browse'}" class="${view.tab==='browse'?'on':''}" data-cat="tab" data-v="browse">Consultar</button><button type="button" role="tab" aria-selected="${view.tab==='admin'}" class="${view.tab==='admin'?'on':''}" data-cat="tab" data-v="admin">Administrar catálogos <span>${brandList().length}</span></button></div><div id="catalogRoot">${catalogInner()}</div>`}
function catalogInner(){
  if(!S.ready)return `<section class="panel"><p class="muted">Cargando catálogo…</p></section>`;
  if(view.tab==='admin')return adminView();
  const bl=brandList();
  if(!bl.length)return `<section class="panel catEmpty"><h2>No hay catálogos cargados</h2><p>Descarga la plantilla, captura los equipos y refacciones de la marca y cárgala desde “Administrar catálogos”.</p>${btn('Ir a Administrar catálogos','tab','','data-v="admin"')}</section>`;
  if(view.brand&&!S.brands[view.brand])view.brand='';
  const sc=scopeBrands();
  const nSys=sc.reduce((a,b)=>a+b.systems.length,0),nEq=sc.reduce((a,b)=>a+Object.keys(b.equipment).length,0),nP=sc.reduce((a,b)=>a+Object.keys(b.parts).length,0);
  const fams=[...new Set(sc.flatMap(b=>b.systems.map(s=>s.family)))].sort(),types=[...new Set(sc.flatMap(b=>b.systems.map(s=>s.type)))].filter(Boolean).sort();
  const cats=[...new Set(sc.flatMap(b=>Object.values(b.parts).map(p=>p.cat)))].sort();
  const strip=`<div class="catBrands" role="tablist" aria-label="Marcas">${[['','Todas las marcas',`${bl.length} ${bl.length===1?'catálogo':'catálogos'}`],...bl.map(b=>[b.name,b.name,b.origin==='seed'?'Catálogo base':'Cargado '+new Date(b.importedAt).toLocaleDateString('es-MX')])].map(([v,t,s])=>`<button type="button" role="tab" aria-selected="${view.brand===v}" class="catBrand ${view.brand===v?'on':''}" data-cat="brand" data-v="${h(v)}"><b>${h(t)}</b><small>${h(s)}</small></button>`).join('')}</div>`;
  const kpi=[['Modelos',nSys],['Unidades',nEq],['Refacciones',nP],['Familias',fams.length]].map(([t,n])=>`<div class="catKpi"><span>${t}</span><b>${fmtN(n)}</b></div>`).join('');
  const tools=`<div class="catTools"><div class="field catSearch"><label for="catQ">Buscar</label><input id="catQ" data-cat-input="q" type="search" value="${h(view.q)}" placeholder="${view.mode==='models'?'Modelo, código de evaporadora o condensadora':'Número de parte o descripción'}" autocomplete="off"></div><div class="field"><label for="catFam">Familia</label><select id="catFam" data-cat-change="family">${options(fams,view.family,'Todas')}</select></div>${view.mode==='models'?`<div class="field"><label for="catType">Tipo de equipo</label><select id="catType" data-cat-change="type">${options(types,view.type,'Todos')}</select></div>`:`<div class="field"><label for="catCat">Categoría</label><select id="catCat" data-cat-change="cat">${options(cats,view.cat,'Todas')}</select></div>`}<div class="catSeg" role="group" aria-label="Ver por"><button type="button" class="${view.mode==='models'?'on':''}" data-cat="mode" data-v="models">Por modelo</button><button type="button" class="${view.mode==='parts'?'on':''}" data-cat="mode" data-v="parts">Por refacción</button></div></div>`;
  return `${strip}<div class="catKpis">${kpi}</div><section class="panel catMain">${tools}${view.mode==='models'?modelsView():partsView()}</section>`;
}
function scopeBrands(){return view.brand?brandList().filter(b=>b.name===view.brand):brandList()}
function filteredSystems(){const out=[];
  scopeBrands().forEach(b=>b.systems.forEach((s,i)=>{
    if(view.family&&s.family!==view.family)return;if(view.type&&s.type!==view.type)return;
    if(view.q&&!matches([s.model,s.desc,s.evap,s.cond,s.family,b.name,(b.equipment[s.evap]||{}).alt,(b.equipment[s.cond]||{}).alt].join(' '),view.q))return;
    out.push({b,s,i})}));return out}
function filteredParts(){const qk=key(view.q);const out=[];
  scopeBrands().forEach(b=>{const ix=idx(b);Object.values(b.parts).forEach(p=>{
    if(view.cat&&p.cat!==view.cat)return;
    const eqs=ix.partEq[p.pn]||[];
    if(view.family&&!eqs.some(c=>famOf(b,c).includes(view.family)))return;
    if(view.q&&!((qk&&key(p.pn).includes(qk))||matches(p.desc+' '+p.cat,view.q)))return;
    out.push({b,p,n:eqs.length})})});
  return out.sort((a,b)=>b.n-a.n||a.p.pn.localeCompare(b.p.pn))}
function pager(total){const pages=Math.max(1,Math.ceil(total/PAGE));if(view.page>=pages)view.page=pages-1;
  return `<div class="catPager"><span>${fmtN(total)} resultados · página ${view.page+1} de ${pages}</span><div class="row">${btn('Anterior','pg-prev','secondary sm',view.page<=0?'disabled':'')}${btn('Siguiente','pg-next','secondary sm',view.page>=pages-1?'disabled':'')}</div></div>`}
function modelsView(){
  const list=filteredSystems();const slice=list.slice(view.page*PAGE,view.page*PAGE+PAGE);
  const rows=slice.map(({b,s,i})=>{const on=view.sel&&view.sel.b===b.name&&view.sel.i===i;
    return `<tr class="${on?'on':''}"><td><button type="button" class="catRowBtn" data-cat="sel" data-b="${h(b.name)}" data-i="${i}"><b>${h(s.model||'Modelo sin código de sistema')}</b><small>${h(s.desc||'')}</small></button></td><td><div class="catUnits"><span><em>Evap.</em>${h(s.evap||'—')}</span><span><em>Cond.</em>${h(s.cond||'—')}</span></div></td><td>${s.tr?h(s.tr)+' TR':'—'}</td><td>${h(view.brand?s.family:b.name+' · '+s.family)}</td></tr>`}).join('');
  const table=list.length?`<div class="tableWrap"><table class="catTable"><thead><tr><th>Modelo</th><th>Unidades</th><th>Capacidad</th><th>${view.brand?'Familia':'Marca y familia'}</th></tr></thead><tbody>${rows}</tbody></table></div>${pager(list.length)}`:`<p class="catNone">Ningún modelo coincide. Prueba con parte del código, por ejemplo <b>YHFE12</b>, o quita filtros.</p>`;
  return `<div class="catLayout"><div class="catList">${table}</div><aside class="catDetail" aria-live="polite">${view.part?partDetail():sysDetail()}</aside></div>`}
function sysDetail(){
  if(!view.sel)return `<div class="catHint"><h3>Selecciona un modelo</h3><p>Verás su evaporadora y condensadora con todas sus refacciones y números de parte.</p></div>`;
  const b=S.brands[view.sel.b];const s=b&&b.systems[view.sel.i];if(!s)return '';
  const code=view.role==='E'?s.evap:s.cond;const e=b.equipment[code];const ix=idx(b);
  const facts=[['Marca',b.name],['Familia',s.family],['Tipo',s.type],['Tecnología',s.tech],['Función',s.func],['Refrigerante',s.refr],['Capacidad',s.tr?s.tr+' TR':''],['Voltaje',s.volt]].filter(x=>x[1]);
  let parts=e?e.parts.map(pn=>b.parts[pn]||{pn,desc:'',cat:'Otros'}):[];
  const cats=[...new Set(parts.map(p=>p.cat))].sort();if(view.cat&&!cats.includes(view.cat))view.cat='';
  if(view.cat)parts=parts.filter(p=>p.cat===view.cat);
  const tab=(rk,c)=>`<button type="button" role="tab" aria-selected="${view.role===rk}" class="${view.role===rk?'on':''}" data-cat="role" data-v="${rk}" ${c?'':'disabled'}>${ROLE_NAME[rk]}<small>${h(c||'No indicada')}</small></button>`;
  return `<div class="catDetailHead"><h3>${h(s.model||'Modelo sin código de sistema')}</h3><p>${h(s.desc||'')}</p><dl class="catFacts">${facts.map(([k,v])=>`<div><dt>${k}</dt><dd>${h(v)}</dd></div>`).join('')}</dl></div>
  <div class="catRoleTabs" role="tablist">${tab('E',s.evap)}${tab('C',s.cond)}</div>
  ${e?`${e.desc?`<p class="small muted">${h(e.desc)}${e.alt?' · también '+h(e.alt):''}</p>`:''}<div class="catChips">${['',...cats].map(c=>`<button type="button" class="catChip ${view.cat===c?'on':''}" data-cat="pcat" data-v="${h(c)}">${h(c||'Todas')} <span>${c?e.parts.filter(pn=>(b.parts[pn]||{}).cat===c).length:e.parts.length}</span></button>`).join('')}</div>
  <div class="tableWrap"><table class="catTable compact"><thead><tr><th>No. de parte</th><th>Descripción</th><th>Usada en</th></tr></thead><tbody>${parts.map(p=>{const n=(ix.partEq[p.pn]||[]).length;return `<tr><td><button type="button" class="catPn" data-cat="part" data-b="${h(b.name)}" data-v="${h(p.pn)}">${h(p.pn)}</button></td><td>${h(p.desc)}<small class="catCat">${h(p.cat)}</small></td><td class="${n>1?'catShared':''}">${n>1?n+' unidades':'Solo esta'}</td></tr>`}).join('')}</tbody></table></div>`:`<p class="catNone">Esta unidad no tiene refacciones cargadas.</p>`}`}
function partDetail(){
  const b=S.brands[view.part.b];const p=b&&b.parts[view.part.pn];if(!p)return '';
  const eqs=(idx(b).partEq[p.pn]||[]).slice().sort();const byFam={};eqs.forEach(c=>famOf(b,c).forEach(f=>(byFam[f]=byFam[f]||[]).push(c)));
  const other=brandList().filter(x=>x!==b&&x.parts[p.pn]).map(x=>x.name);
  return `<button type="button" class="link" data-cat="part-close">Volver</button><div class="catDetailHead"><h3>${h(p.pn)}</h3><p>${h(p.desc)}</p><dl class="catFacts"><div><dt>Categoría</dt><dd>${h(p.cat)}</dd></div><div><dt>Marca</dt><dd>${h(b.name)}</dd></div><div><dt>Unidades compatibles</dt><dd>${eqs.length}</dd></div><div><dt>Familias</dt><dd>${Object.keys(byFam).length}</dd></div></dl></div>
  ${other.length?`<div class="callout">Este número de parte también aparece en: ${h(other.join(', '))}.</div>`:''}
  <h3 class="catSub">Compatible con</h3>${Object.entries(byFam).sort().map(([f,cs])=>`<div class="catCompat"><b>${h(f)}</b><div>${[...new Set(cs)].map(c=>`<span class="catCode ${(b.equipment[c]||{}).role==='C'?'cond':'evap'}" title="${ROLE_NAME[(b.equipment[c]||{}).role]||''}">${h(c)}</span>`).join('')}</div></div>`).join('')||'<p class="catNone">Sin unidades asociadas.</p>'}`}
function partsView(){
  const list=filteredParts();const slice=list.slice(view.page*PAGE,view.page*PAGE+PAGE);
  const rows=slice.map(({b,p,n})=>`<tr class="${view.part&&view.part.pn===p.pn&&view.part.b===b.name?'on':''}"><td><button type="button" class="catPn" data-cat="part" data-b="${h(b.name)}" data-v="${h(p.pn)}">${h(p.pn)}</button></td><td>${h(p.desc)}</td><td>${h(p.cat)}</td><td class="${n>1?'catShared':''}">${n}</td>${view.brand?'':`<td>${h(b.name)}</td>`}</tr>`).join('');
  const table=list.length?`<div class="tableWrap"><table class="catTable"><thead><tr><th>No. de parte</th><th>Descripción</th><th>Categoría</th><th>Unidades</th>${view.brand?'':'<th>Marca</th>'}</tr></thead><tbody>${rows}</tbody></table></div>${pager(list.length)}`:`<p class="catNone">Ninguna refacción coincide. Busca por número de parte completo o parcial, o por una palabra de la descripción.</p>`;
  return `<div class="catLayout"><div class="catList">${table}</div><aside class="catDetail" aria-live="polite">${view.part?partDetail():`<div class="catHint"><h3>Selecciona una refacción</h3><p>Verás en qué evaporadoras y condensadoras se usa, agrupadas por familia.</p></div>`}</aside></div>`}

/* ---------- Administrar catálogos ---------- */
function adminView(){
  const bl=brandList();
  const rows=bl.map(b=>{const del=view.confirmDel===b.name;const last=(b.history||[]).slice(-1)[0];
    return `<tr class="${del?'catDanger':''}"><td><b>${h(b.name)}</b><small class="catCat">${b.origin==='seed'?'Catálogo base incluido en el portal':h(b.source||'')}</small></td><td>${b.origin==='seed'?'—':new Date(b.importedAt).toLocaleString('es-MX')}${last&&b.origin!=='seed'?`<small class="catCat">${last.mode==='merge'?'Actualización':last.mode==='replace'?'Reemplazo':'Alta'} · ${fmtN(last.rows)} filas</small>`:''}</td><td>${fmtN(b.systems.length)}</td><td>${fmtN(Object.keys(b.equipment).length)}</td><td>${fmtN(Object.keys(b.parts).length)}</td><td>${del?`<div class="catConfirm"><span>¿Eliminar ${h(b.name)}?</span>${btn('Sí, eliminar','delete-yes','danger sm',`data-v="${h(b.name)}"`)}${btn('Cancelar','delete-no','secondary sm')}</div>`:`<div class="row catRowActions">${btn('Ver','view-brand','secondary sm',`data-v="${h(b.name)}"`)}${btn('Exportar','export-brand','secondary sm',`data-v="${h(b.name)}"`)}${btn('Eliminar','delete','danger sm',`data-v="${h(b.name)}"`)}</div>`}</td></tr>`}).join('');
  return `<section class="panel"><div class="row between wrap"><h2 style="margin:0">Catálogos cargados</h2>${S.seedHidden&&window.CELSIUS_CATALOG_SEED&&!S.brands[window.CELSIUS_CATALOG_SEED.brand]?btn('Restaurar catálogo base YORK','restore-seed','secondary sm'):''}</div>
  ${bl.length?`<div class="tableWrap" style="margin-top:14px"><table class="catTable"><thead><tr><th>Marca</th><th>Cargado</th><th>Modelos</th><th>Unidades</th><th>Refacciones</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:`<p class="catNone">No hay catálogos. Carga el primero con el formulario de abajo.</p>`}
  <p class="hint">Al eliminar una marca, deja de aparecer en la consulta y en el formulario de garantía. Las garantías ya capturadas conservan sus datos.</p></section>${importPanel()}`}

/* ---------- Importación ---------- */
function importPanel(){
  const r=imp.result;let res='';
  if(imp.busy)res=`<p class="muted" style="margin-top:14px">Leyendo ${h(imp.fileName)}…</p>`;
  else if(r){const ok=r.rowsOk>0&&r.brands.length;
    res=`<div class="catImportResult"><div class="catKpis small">${[['Filas leídas',r.rowsRead],['Filas válidas',r.rowsOk],['Filas con error',r.rowsBad],['Modelos',r.nSys],['Unidades',r.nEq],['Refacciones',r.nParts]].map(([t,n])=>`<div class="catKpi ${t==='Filas con error'&&n?'bad':''}"><span>${t}</span><b>${fmtN(n)}</b></div>`).join('')}</div>
    <p>Archivo <b>${h(imp.fileName)}</b> · formato: ${h(r.format)}${r.brands.length?` · marca: <b>${h(r.brands.join(', '))}</b>`:''}</p>
    ${r.errors.length?`<details open class="catIssues bad"><summary>${fmtN(r.errors.length)} ${r.errors.length===1?'error':'errores'} (estas filas no se cargarán)</summary><ul>${r.errors.slice(0,40).map(x=>`<li>${h(x)}</li>`).join('')}${r.errors.length>40?`<li>… y ${r.errors.length-40} más</li>`:''}</ul></details>`:''}
    ${r.warnings.length?`<details class="catIssues"><summary>${fmtN(r.warnings.length)} ${r.warnings.length===1?'aviso':'avisos'} para revisar</summary><ul>${r.warnings.slice(0,40).map(x=>`<li>${h(x)}</li>`).join('')}${r.warnings.length>40?`<li>… y ${r.warnings.length-40} más</li>`:''}</ul></details>`:''}
    ${ok?`${r.brands.some(n=>S.brands[n])?`<fieldset class="catMode"><legend>${h(r.brands.filter(n=>S.brands[n]).join(', '))} ya existe</legend><label class="check"><input type="radio" name="catMode" value="replace" data-cat-change="impmode" ${imp.mode==='replace'?'checked':''}> Reemplazar el catálogo por este archivo</label><label class="check"><input type="radio" name="catMode" value="merge" data-cat-change="impmode" ${imp.mode==='merge'?'checked':''}> Agregar y actualizar (conserva lo que no venga en el archivo)</label></fieldset>`:''}<div class="row">${btn('Cargar catálogo','commit')}${btn('Cancelar','cancel','secondary')}</div>`:`<div class="row">${btn('Elegir otro archivo','cancel','secondary')}</div>`}</div>`}
  return `<section class="panel catImport"><h2>Cargar catálogo desde Excel</h2>
  <ol class="catSteps"><li>Descarga la plantilla y llena la hoja <b>catalogo</b>: una fila por cada refacción de cada unidad.</li><li>Selecciona el archivo. Antes de guardar verás las filas válidas y los errores.</li><li>Confirma con <b>Cargar catálogo</b>. Si la marca ya existe, eliges reemplazarla o actualizarla.</li></ol>
  <div class="grid"><div class="field"><label for="catBrandIn">Marca (si el archivo no trae la columna marca)</label><input id="catBrandIn" data-cat-input="brandIn" value="${h(imp.brandInput)}" placeholder="Ej. Midea, Hitachi, Carrier"></div>
  <div class="field"><label for="catFile">Archivo (.xlsx o .csv)</label><input id="catFile" type="file" accept=".xlsx,.csv" data-cat-file></div></div>
  <p class="hint">También acepta el Excel de tablas para Python (hojas sistemas, sistema_equipos, refacciones y catalogo_partes). Funciona sin conexión a internet.</p>${res}</section>`}

const COLS=['marca','familia','modelo_sistema','descripcion_sistema','tipo_equipo','tecnologia','funcion','refrigerante','capacidad_tr','voltaje','rol','equipo_codigo','equipo_descripcion','no_parte','descripcion_parte','categoria'];
const REQUIRED=['rol','equipo_codigo','no_parte','descripcion_parte'];
const ALIAS={numero_de_parte:'no_parte',no_de_parte:'no_parte','no._de_parte':'no_parte',part_number:'no_parte',num_de_parte:'no_parte',numero_parte:'no_parte',sku:'no_parte',
  descripcion:'descripcion_parte',refaccion:'descripcion_parte',pieza:'descripcion_parte',description:'descripcion_parte',descripcion_estandar:'descripcion_parte',
  modelo:'modelo_sistema',modelo_del_sistema:'modelo_sistema',codigo_equipo:'equipo_codigo',codigo_del_equipo:'equipo_codigo',equipo:'equipo_codigo',
  tipo:'rol',evap_cond:'rol',brand:'marca',capacidad:'capacidad_tr'};
const colKey=c=>{const k=norm(c).trim().replace(/[\s\-\/]+/g,'_').replace(/[^a-z0-9_.]/g,'');return ALIAS[k]||k};
function parseRole(v){const t=norm(v).trim();if(/^(e|x|evap|interior|indoor)$/.test(t)||t.startsWith('evap'))return 'E';if(/^(c|y|cond|exterior|outdoor)$/.test(t)||t.startsWith('cond'))return 'C';return ''}
const cleanPn=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,'');
function toObjects(aoa){
  const hi=aoa.findIndex(r=>r&&r.some(v=>String(v??'').trim()!==''));if(hi<0)return [];
  const hdr=aoa[hi].map(colKey);
  return aoa.slice(hi+1).map(r=>{const o={};hdr.forEach((k,j)=>{if(k)o[k]=r&&r[j]!=null?r[j]:''});return o});
}
function tidyToFlat(t){
  const sis={};t.sistemas.forEach(r=>sis[r.sistema_id]=r);
  const eqDesc={};(t.sistema_equipos||[]).forEach(r=>eqDesc[r.equipo_codigo]=r.equipo_descripcion);
  const pcat={};(t.catalogo_partes||[]).forEach(r=>pcat[cleanPn(r.no_parte)]=r);
  return t.refacciones.map(r=>{const s=sis[r.sistema_id]||{};const pc=pcat[cleanPn(r.no_parte)]||{};
    return {marca:r.marca||'',familia:s.familia||r.familia||'',modelo_sistema:s.modelo_sistema||'',descripcion_sistema:s.descripcion_sistema||'',tipo_equipo:s.tipo_equipo||'',tecnologia:s.tecnologia||'',funcion:s.funcion||'',refrigerante:s.refrigerante||'',capacidad_tr:s.capacidad_tr??'',voltaje:s.voltaje||'',
      rol:r.rol,equipo_codigo:r.equipo_codigo,equipo_descripcion:eqDesc[r.equipo_codigo]||'',no_parte:r.no_parte,descripcion_parte:pc.descripcion_estandar||r.descripcion_limpia||r.descripcion_original||'',categoria:pc.categoria||'',_sid:r.sistema_id}})}
function buildFromFlat(rows,defaultBrand){
  const errors=[],warnings=[],brands={};let ok=0;
  const present=new Set(rows.flatMap(r=>Object.keys(r)));
  const missing=REQUIRED.filter(c=>!present.has(c));
  if(missing.length)return {errors:[`Faltan columnas obligatorias: ${missing.join(', ')}. Usa la plantilla (hoja catalogo).`],warnings,rowsOk:0,brands:{}};
  if(!present.has('marca')&&!String(defaultBrand||'').trim())return {errors:['El archivo no trae la columna marca. Escribe la marca en el campo “Marca” y vuelve a seleccionar el archivo.'],warnings,rowsOk:0,brands:{}};
  const seen=new Set(),descVotes={};
  rows.forEach((r,n)=>{const line=n+2;
    if(!Object.values(r).some(v=>String(v??'').trim()!==''))return;
    const brand=String(r.marca||defaultBrand||'').trim().toUpperCase();
    const role=parseRole(r.rol),code=String(r.equipo_codigo||'').trim().toUpperCase(),pnRaw=r.no_parte,pn=cleanPn(pnRaw),desc=String(r.descripcion_parte||'').trim();
    const e=[];if(!brand)e.push('marca');if(!role)e.push(`rol “${r.rol}” (usa evaporadora o condensadora)`);if(!code)e.push('equipo_codigo');if(!pn)e.push('no_parte');if(!desc)e.push('descripcion_parte');
    if(e.length){errors.push(`Fila ${line}: falta o no es válido: ${e.join(', ')}.`);return}
    if(typeof pnRaw==='number')warnings.push(`Fila ${line}: el número de parte ${pn} venía como número; si tenía ceros a la izquierda se perdieron. Formatea la columna como texto.`);
    if(!/\d/.test(pn))warnings.push(`Fila ${line}: el número de parte “${pn}” no contiene dígitos; revisa que no sea una descripción.`);
    const skey=String(r.modelo_sistema||'').trim().toUpperCase()||String(r.sistema_clave||'').trim()||(r._sid?'SID:'+r._sid:'EQ:'+code);
    const dup=[brand,skey,code,pn].join('|');if(seen.has(dup)){warnings.push(`Fila ${line}: renglón repetido (${code} · ${pn}); se ignoró.`);return}seen.add(dup);
    const B=brands[brand]=brands[brand]||{name:brand,systems:{},equipment:{},parts:{}};
    const s=B.systems[skey]=B.systems[skey]||{key:skey,model:String(r.modelo_sistema||'').trim().toUpperCase(),desc:String(r.descripcion_sistema||'').trim(),family:String(r.familia||'').trim().toUpperCase()||code.slice(0,4),type:String(r.tipo_equipo||'').trim(),tech:String(r.tecnologia||'').trim(),func:String(r.funcion||'').trim(),refr:String(r.refrigerante||'').trim(),tr:r.capacidad_tr===''||r.capacidad_tr==null?null:Number(r.capacidad_tr)||null,volt:String(r.voltaje||'').trim(),evap:'',cond:''};
    const slot=role==='E'?'evap':'cond';
    if(s[slot]&&s[slot]!==code){warnings.push(`Fila ${line}: el modelo ${s.model||skey} ya tenía la ${ROLE_NAME[role].toLowerCase()} ${s[slot]}; también aparece ${code}. Se conservó la primera.`);return}
    s[slot]=code;
    const E=B.equipment[code]=B.equipment[code]||{code,role,alt:'',desc:String(r.equipo_descripcion||'').trim(),parts:[]};
    if(E.role!==role)warnings.push(`Fila ${line}: ${code} aparece como evaporadora y como condensadora.`);
    if(!E.parts.includes(pn))E.parts.push(pn);
    const v=descVotes[brand+'|'+pn]=descVotes[brand+'|'+pn]||{};v[desc]=(v[desc]||0)+1;
    B.parts[pn]=B.parts[pn]||{pn,desc,cat:''};if(!B.parts[pn].cat&&String(r.categoria||'').trim())B.parts[pn].cat=String(r.categoria).trim();
    ok++});
  Object.entries(descVotes).forEach(([k,v])=>{const [brand,pn]=k.split('|');const ds=Object.entries(v).sort((a,b)=>b[1]-a[1]);const p=brands[brand].parts[pn];p.desc=ds[0][0];if(ds.length>1)warnings.push(`${pn}: tiene ${ds.length} descripciones distintas (${ds.map(d=>d[0]).slice(0,3).join(' / ')}); se usó “${ds[0][0]}”.`);if(!p.cat)p.cat=inferCat(p.desc)});
  return {errors,warnings,rowsOk:ok,brands};
}
async function readFile(file){
  imp.busy=true;imp.fileName=file.name;imp.result=null;paint();
  let result;
  try{
    const ext=file.name.toLowerCase().split('.').pop();
    let sheets;
    if(ext==='csv')sheets={catalogo:parseCSV(await file.text())};
    else if(ext==='xlsx')sheets=await readXlsx(await file.arrayBuffer());
    else throw new Error(ext==='xls'?'El formato .xls antiguo no se puede leer. Abre el archivo en Excel y guárdalo como .xlsx.':'Usa un archivo .xlsx o .csv.');
    const names=Object.keys(sheets),find=n=>names.find(x=>norm(x)===n);
    let rows,format;
    if(find('refacciones')&&find('sistemas')){format='Tablas para Python';const t={};['sistemas','sistema_equipos','refacciones','catalogo_partes'].forEach(n=>{const k=find(n);t[n]=k?toObjects(sheets[k]):null});rows=tidyToFlat(t)}
    else{const k=find('catalogo')||names[0];rows=toObjects(sheets[k]||[]);format=find('catalogo')?'Plantilla Celsius (hoja catalogo)':`Hoja “${k}”`}
    const built=buildFromFlat(rows,imp.brandInput);
    const byBrand={};Object.values(built.brands).forEach(B=>{byBrand[B.name]={name:B.name,version:file.name,source:file.name,origin:'import',importedAt:new Date().toISOString(),systems:Object.values(B.systems).map((s,i)=>({...s,id:i+1})),equipment:B.equipment,parts:B.parts,history:[]}});
    const all=Object.values(byBrand);
    result={format,rowsRead:rows.filter(r=>Object.values(r).some(v=>String(v??'').trim()!=='')).length,rowsOk:built.rowsOk,rowsBad:built.errors.length,errors:built.errors,warnings:built.warnings,brands:Object.keys(byBrand),byBrand,
      nSys:all.reduce((a,b)=>a+b.systems.length,0),nEq:all.reduce((a,b)=>a+Object.keys(b.equipment).length,0),nParts:all.reduce((a,b)=>a+Object.keys(b.parts).length,0)};
    if(!result.rowsRead)result.errors.unshift('La hoja no tiene filas con datos.');
  }catch(e){result={format:'—',rowsRead:0,rowsOk:0,rowsBad:0,errors:['No se pudo leer el archivo: '+e.message],warnings:[],brands:[],byBrand:{},nSys:0,nEq:0,nParts:0}}
  imp.busy=false;imp.result=result;paint();
}
function mergeBrand(old,neu){
  const out={...old,version:neu.version,source:neu.source,importedAt:neu.importedAt,origin:'import',equipment:{...old.equipment},parts:{...old.parts}};delete out._idx;
  const sys={};old.systems.forEach(s=>sys[s.key]=s);neu.systems.forEach(s=>{const o=sys[s.key];sys[s.key]=o?{...o,...Object.fromEntries(Object.entries(s).filter(([,v])=>v!==''&&v!=null))}:s});
  out.systems=Object.values(sys).map((s,i)=>({...s,id:i+1}));
  Object.values(neu.equipment).forEach(e=>{const o=out.equipment[e.code];out.equipment[e.code]=o?{...o,desc:e.desc||o.desc,parts:[...new Set([...o.parts,...e.parts])]}:e});
  Object.values(neu.parts).forEach(p=>out.parts[p.pn]=p);return out}
async function commit(){
  const r=imp.result;if(!r||!r.brands.length||!isManager())return;const done=[];
  for(const b of Object.values(r.byBrand)){const old=S.brands[b.name];const fin=old&&imp.mode==='merge'?mergeBrand(old,b):b;
    fin.history=[...((old&&old.history)||[]),{at:new Date().toISOString(),file:imp.fileName,mode:old?imp.mode:'nuevo',rows:r.rowsOk}].slice(-10);
    S.brands[fin.name]=fin;try{await idbPut(fin)}catch(e){}done.push(fin.name)}
  logEvent('Catálogo cargado',`${done.join(', ')} · ${imp.fileName} · ${r.rowsOk} filas`);
  imp.result=null;imp.fileName='';const inp=document.getElementById('catFile');if(inp)inp.value='';
  toast(`Catálogo cargado: ${done.join(', ')}.`);paint();refreshPickers();
}
async function removeBrand(name){
  if(!isManager())return;
  delete S.brands[name];await idbDel(name).catch(()=>{});
  if(window.CELSIUS_CATALOG_SEED&&name===window.CELSIUS_CATALOG_SEED.brand){S.seedHidden=true;await saveMeta().catch(()=>{})}
  if(view.brand===name)view.brand='';view.sel=null;view.part=null;view.confirmDel='';
  logEvent('Catálogo eliminado',name);toast(`Catálogo de ${name} eliminado.`);paint();refreshPickers();
}
async function restoreSeed(){
  const b=fromSeed(window.CELSIUS_CATALOG_SEED);S.brands[b.name]=b;S.seedHidden=false;await saveMeta().catch(()=>{});
  logEvent('Catálogo restaurado',b.name);toast(`Catálogo base de ${b.name} restaurado.`);paint();refreshPickers()}
function logEvent(action,detail){try{if(typeof trackAudit==='function')trackAudit(action,'—',detail,currentRole()==='master'?'Administrador':'Ana M.')}catch(e){}}

/* ---------- Lector XLSX (sin internet) ---------- */
async function inflateRaw(u8){
  if(typeof DecompressionStream==='undefined')throw new Error('este navegador no puede descomprimir Excel; actualízalo o usa CSV');
  const ds=new DecompressionStream('deflate-raw');const stream=new Blob([u8]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer())}
async function unzip(buf){
  const u8=new Uint8Array(buf),dv=new DataView(buf);let eocd=-1;
  for(let i=u8.length-22;i>=Math.max(0,u8.length-66000);i--)if(dv.getUint32(i,true)===0x06054b50){eocd=i;break}
  if(eocd<0)throw new Error('no es un archivo .xlsx válido');
  const n=dv.getUint16(eocd+10,true);let p=dv.getUint32(eocd+16,true);const files={};const dec=new TextDecoder();
  for(let k=0;k<n;k++){
    if(dv.getUint32(p,true)!==0x02014b50)break;
    const method=dv.getUint16(p+10,true),csize=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),off=dv.getUint32(p+42,true);
    const name=dec.decode(u8.subarray(p+46,p+46+nl));
    files[name]={method,csize,off};p+=46+nl+xl+cl}
  const get=async name=>{const f=files[name];if(!f)return null;const ln=dv.getUint16(f.off+26,true),lx=dv.getUint16(f.off+28,true);const data=u8.subarray(f.off+30+ln+lx,f.off+30+ln+lx+f.csize);
    const raw=f.method===0?data:f.method===8?await inflateRaw(data):null;if(!raw)throw new Error('compresión no soportada');return dec.decode(raw)};
  return {names:Object.keys(files),get}}
const tags=(node,name)=>Array.from(node.getElementsByTagNameNS('*',name));
const textOf=node=>tags(node,'t').map(t=>t.textContent).join('');
const colIdx=ref=>{let n=0;for(const ch of ref.replace(/\d+/g,''))n=n*26+ch.charCodeAt(0)-64;return n-1};
async function readXlsx(buf){
  const z=await unzip(buf);const P=new DOMParser();const parse=t=>P.parseFromString(t,'application/xml');
  const wb=parse(await z.get('xl/workbook.xml')||'');const rels=parse(await z.get('xl/_rels/workbook.xml.rels')||'<x/>');
  const target={};tags(rels,'Relationship').forEach(r=>{let t=r.getAttribute('Target')||'';t=t.startsWith('/')?t.slice(1):'xl/'+t;target[r.getAttribute('Id')]=t});
  const ssXml=await z.get('xl/sharedStrings.xml');const shared=ssXml?tags(parse(ssXml),'si').map(textOf):[];
  const out={};
  for(const sh of tags(wb,'sheet')){
    const rid=sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||sh.getAttribute('r:id');
    const xml=await z.get(target[rid]||'');if(!xml)continue;
    const doc=parse(xml);const aoa=[];
    tags(doc,'row').forEach((row,ri)=>{const r=Number(row.getAttribute('r'))||ri+1;const arr=aoa[r-1]=[];
      tags(row,'c').forEach((c,ci)=>{const ref=c.getAttribute('r');const j=ref?colIdx(ref):ci;const t=c.getAttribute('t');const v=tags(c,'v')[0];let val='';
        if(t==='s')val=v?shared[Number(v.textContent)]??'':'';
        else if(t==='inlineStr')val=textOf(c);
        else if(t==='str'||t==='e')val=v?v.textContent:'';
        else if(t==='b')val=v?v.textContent==='1':'';
        else if(v){const num=Number(v.textContent);val=isFinite(num)?num:v.textContent}
        arr[j]=val})});
    out[sh.getAttribute('name')]=Array.from(aoa,r=>r||[]);
  }
  return out}
function parseCSV(text){
  text=text.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/)[0]||'';const sep=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
  const rows=[];let row=[],cur='',q=false;
  for(let i=0;i<text.length;i++){const ch=text[i];
    if(q){if(ch==='"'){if(text[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}
    else if(ch==='"')q=true;else if(ch===sep){row.push(cur);cur=''}
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cur);rows.push(row);row=[];cur=''}
    else cur+=ch}
  if(cur!==''||row.length){row.push(cur);rows.push(row)}
  return rows}

/* ---------- Exportación (celsius-xlsx.js) ---------- */
function flatRows(b){const rows=[],used=new Set();
  const row=(s,e,rk,pn)=>{const p=b.parts[pn]||{};return {marca:b.name,familia:s?s.family:e.code.slice(0,4),modelo_sistema:s?s.model:'',descripcion_sistema:s?s.desc:'',tipo_equipo:s?s.type:'',tecnologia:s?s.tech:'',funcion:s?s.func:'',refrigerante:s?s.refr:'',capacidad_tr:s&&s.tr!=null?s.tr:'',voltaje:s?s.volt:'',rol:ROLE_NAME[rk].toLowerCase(),equipo_codigo:e.code,equipo_descripcion:e.desc,no_parte:pn,descripcion_parte:p.desc||'',categoria:p.cat||'',sistema_clave:s&&!s.model?s.key:''}};
  b.systems.forEach(s=>[['E',s.evap],['C',s.cond]].forEach(([rk,code])=>{const e=b.equipment[code];if(!e)return;used.add(code);e.parts.forEach(pn=>rows.push(row(s,e,rk,pn)))}));
  Object.values(b.equipment).filter(e=>!used.has(e.code)).forEach(e=>e.parts.forEach(pn=>rows.push(row(null,e,e.role,pn))));
  return rows}
function download(sheets,name){if(!window.CelsiusXLSX)return toast('No se encontró el generador de Excel (assets/vendor/celsius-xlsx.js).');try{CelsiusXLSX.download(sheets,name)}catch(e){console.error(e);toast('No se pudo generar el Excel.')}}
function exportCatalog(only){
  if(!isManager())return;
  const bl=only?[S.brands[only]]:scopeBrands();if(!bl.length)return toast('No hay catálogos para exportar.');
  const flat=bl.flatMap(flatRows);
  const models=bl.flatMap(b=>b.systems.map(s=>({marca:b.name,familia:s.family,modelo_sistema:s.model,descripcion_sistema:s.desc,tipo_equipo:s.type,tecnologia:s.tech,funcion:s.func,refrigerante:s.refr,capacidad_tr:s.tr??'',voltaje:s.volt,evaporadora:s.evap,condensadora:s.cond,refacciones_evaporadora:(b.equipment[s.evap]||{parts:[]}).parts.length,refacciones_condensadora:(b.equipment[s.cond]||{parts:[]}).parts.length})));
  const parts=bl.flatMap(b=>{const ix=idx(b);return Object.values(b.parts).map(p=>{const eqs=ix.partEq[p.pn]||[];return {marca:b.name,no_parte:p.pn,descripcion_parte:p.desc,categoria:p.cat,unidades_compatibles:eqs.length,familias:[...new Set(eqs.flatMap(c=>famOf(b,c)))].sort().join(', ')}})});
  const label=only||view.brand||'todas_las_marcas';
  download({catalogo:flat,modelos:models,refacciones:parts},`Catalogo_${label}_${new Date().toISOString().slice(0,10)}.xlsx`.replace(/[^\w.\-]/g,'_'));
  toast(`Excel generado: ${fmtN(flat.length)} filas en la hoja catalogo (se puede volver a cargar).`)}
function exportTemplate(){
  const doc=[['marca','Sí*','Marca del equipo. *Puede omitirse si se escribe al cargar el archivo.','YORK'],['familia','No','Familia o línea.','YHFE'],['modelo_sistema','Recomendada','Código del equipo completo; agrupa evaporadora y condensadora.','YHFE12ZJMAXAORX'],['descripcion_sistema','No','Descripción comercial.','Minisplit 1 TR On/Off 220 V'],['tipo_equipo','No','Minisplit, Cassette, Fan & Coil, Piso-techo…','Minisplit'],['tecnologia','No','On/Off, Inverter…','On/Off'],['funcion','No','Solo frío o Bomba de calor.','Solo frío (SF)'],['refrigerante','No','R410A, R32…','R410A'],['capacidad_tr','No','Toneladas de refrigeración (número).','1'],['voltaje','No','115V, 220V…','220V'],['rol','Sí','evaporadora o condensadora.','evaporadora'],['equipo_codigo','Sí','Código de la unidad.','YHFE12XJMAXA-RX'],['equipo_descripcion','No','Descripción de la unidad.','Evap. 1 TR 220 V'],['no_parte','Sí','Número de parte (formatear como texto).','113A20003002093'],['descripcion_parte','Sí','Nombre de la refacción.','Panel'],['categoria','No','Si se deja vacía se asigna sola.','Gabinete y plásticos'],['sistema_clave','No','Solo para modelos sin código de sistema; lo llena la exportación.','EQ:YHJE18XTMGMM-RX']].map(([Columna,Obligatoria,Descripcion,Ejemplo])=>({Columna,Obligatoria,Descripcion,Ejemplo}));
  const ex=(rol,code,ed,pn,d,c)=>({marca:'YORK',familia:'YHFE',modelo_sistema:'YHFE12ZJMAXAORX',descripcion_sistema:'Minisplit 1 TR On/Off 220 V',tipo_equipo:'Minisplit',tecnologia:'On/Off',funcion:'Solo frío (SF)',refrigerante:'R410A',capacidad_tr:1,voltaje:'220V',rol,equipo_codigo:code,equipo_descripcion:ed,no_parte:pn,descripcion_parte:d,categoria:c});
  download({LEEME:doc,catalogo:[Object.fromEntries(COLS.map(c=>[c,'']))],ejemplo:[ex('evaporadora','YHFE12XJMAXA-RX','Evap. 1 TR 220 V','113A20003002093','Panel','Gabinete y plásticos'),ex('evaporadora','YHFE12XJMAXA-RX','Evap. 1 TR 220 V','112A22014000608','Display board','Tarjetas electrónicas'),ex('condensadora','YHFE12YJMAXAO-X','Cond. 1 TR 220 V','112A23053000026','Compressor','Compresor')]},'Plantilla_Catalogo_Celsius.xlsx');
  toast('Plantilla descargada. Llena la hoja catalogo: una fila por refacción de cada unidad.')}

/* =====================================================================
   FORMULARIO "NUEVA GARANTÍA": selección guiada + ficha fija
   ===================================================================== */
const FIELDS=['brand','otherBrand','evaporatorModel','condenserModel','part','partNo'];
function pieceOf(i){try{return draft.pieces[i]}catch(e){return null}}
function sel(i){const p=pieceOf(i)||{};return p.catSel=p.catSel||{mode:'search',brand:'',q:'',sys:null,role:'',pq:'',pn:''}}
function clearFields(i,keepBrand){const p=pieceOf(i);if(!p)return;FIELDS.forEach(k=>{if(!(keepBrand&&k==='brand'))p[k]=''})}
function equipmentBlock(x,i=0){return `<div class="catBlock" id="catBlock-${i}">${blockInner(i)}</div>`}
function manualFields(x,i){
  return `<div class="catManualHead"><span class="small muted">Captura manual de los datos del equipo.</span>${S.ready&&brandList().length?`<button type="button" class="link" data-cat="pk-search" data-i="${i}">Buscar en el catálogo</button>`:''}</div>
  <div class="grid">${select('Marca *',`p${i}-brand`,[...new Set(['','YORK','Hitachi','Midea','S&P','Carrier','Trane','Daikin','LG',...brandList().map(b=>b.name),'Otra'])],x.brand)}${fld('Modelo de condensadora (si aplica)',`p${i}-condenserModel`,x.condenserModel||'')}${fld('Modelo de evaporadora (si aplica)',`p${i}-evaporatorModel`,x.evaporatorModel||'')}</div>
  <div class="field" id="other-wrap-${i}" style="margin-top:13px;${x.brand==='Otra'?'':'display:none'}">${fld('Nombre de otra marca *',`p${i}-otherBrand`,x.otherBrand)}</div>
  <h3 class="technicalSubhead">Identificación de la pieza solicitada</h3><div class="grid">${fld('Pieza defectuosa *',`p${i}-part`,x.part,'text','','required')}${fld('Número de parte *',`p${i}-partNo`,x.partNo,'text','','required')}</div>`}
function blockInner(i){
  const x=pieceOf(i)||{};const st=sel(i);
  if(!S.ready)return `<p class="muted small">Cargando catálogo…</p>`;
  const bl=brandList();
  if(!bl.length||st.mode==='manual')return manualFields(x,i);
  if(st.mode==='selected')return selectedCard(i);
  return searchSteps(i);
}
function stepState(i){const st=sel(i);const b=S.brands[st.brand];const si=b?sysIndex(b,st.sys):-1;return {st,b,s:si>=0?b.systems[si]:null}}
function searchSteps(i){
  const {st,b,s}=stepState(i);const bl=brandList();
  if(!b&&bl.length===1){st.brand=bl[0].name}
  const B=S.brands[st.brand];
  const step=!B?1:!s?2:!st.role?3:4;
  const crumb=[['Marca',B?B.name:''],['Modelo',s?(s.model||s.evap||s.cond):''],['Unidad',st.role?ROLE_NAME[st.role]:''],['Refacción','']];
  const back=['pk-to-brand','pk-to-model','pk-to-unit',''];
  const steps=`<ol class="catSteps2" aria-label="Pasos">${crumb.map(([t,v],k)=>{const n=k+1;const done=n<step,cur=n===step;return `<li class="${done?'done':cur?'cur':''}">${done&&back[k]&&!(k===0&&bl.length===1)?`<button type="button" data-cat="${back[k]}" data-i="${i}" title="Cambiar ${t.toLowerCase()}"><span>✓</span><b>${h(t)}</b><small>${h(v)}</small></button>`:`<div><span>${done?'✓':n}</span><b>${h(t)}</b><small>${h(done?v:cur?'Pendiente':'')}</small></div>`}</li>`}).join('')}</ol>`;
  let body='';
  if(step===1){body=`<p class="catAsk">¿De qué marca es el equipo?</p><div class="catBrandPick">${bl.map(x=>`<button type="button" data-cat="pk-brand" data-i="${i}" data-v="${h(x.name)}"><b>${h(x.name)}</b><small>${fmtN(x.systems.length)} modelos</small></button>`).join('')}</div>`}
  else if(step===2){const q=st.q;let res=[];if(words(q).length&&norm(q).replace(/\s/g,'').length>=3)res=B.systems.filter(x=>matches([x.model,x.evap,x.cond,x.desc,(B.equipment[x.evap]||{}).alt].join(' '),q)).slice(0,10);
    body=`<div class="field"><label for="catpk-q-${i}">Escribe el modelo que aparece en la etiqueta del equipo</label><input id="catpk-q-${i}" data-cat-input="pk-q" data-i="${i}" value="${h(q)}" placeholder="Ej. YHFE12, YHFE12XJMAXA o YUJE18" autocomplete="off" inputmode="search"></div>
    <div id="catpk-res-${i}">${modelResults(i,res,q)}</div>`}
  else if(step===3){body=`<p class="catAsk">¿En qué unidad está la pieza dañada?</p><div class="catUnitPick">${['E','C'].map(rk=>{const code=rk==='E'?s.evap:s.cond;const e=B.equipment[code];return `<button type="button" data-cat="pk-role" data-i="${i}" data-v="${rk}" ${e&&e.parts.length?'':'disabled'}><span class="catUnitIcon">${rk==='E'?'Interior':'Exterior'}</span><b>${ROLE_NAME[rk]}</b><code>${h(code||'No indicada')}</code><small>${e&&e.parts.length?fmtN(e.parts.length)+' refacciones':'Sin refacciones en catálogo'}</small></button>`}).join('')}</div>`}
  else{const code=st.role==='E'?s.evap:s.cond;const e=B.equipment[code];const qk=key(st.pq);
    let list=e?e.parts.map(pn=>B.parts[pn]||{pn,desc:'',cat:''}):[];const all=list.length;
    if(st.pq)list=list.filter(p=>(qk&&key(p.pn).includes(qk))||matches(p.desc+' '+p.cat,st.pq));
    body=`<div class="field"><label for="catpk-pq-${i}">Busca la refacción de la ${ROLE_NAME[st.role].toLowerCase()} <code>${h(code)}</code></label><input id="catpk-pq-${i}" data-cat-input="pk-pq" data-i="${i}" value="${h(st.pq)}" placeholder="Nombre de la pieza o número de parte" autocomplete="off" inputmode="search"></div><div id="catpk-parts-${i}">${partResults(i,list,all)}</div>`}
  return `<div class="catPickHead"><div><b>Identifica el equipo y la refacción</b><span class="small muted">Elige en el catálogo y los datos del equipo se llenan solos.</span></div><button type="button" class="link" data-cat="pk-manual" data-i="${i}">Mi equipo no está en el catálogo</button></div>${steps}<div class="catStepBody">${body}</div>`}
function modelResults(i,res,q){
  if(!words(q).length||norm(q).replace(/\s/g,'').length<3)return `<p class="small muted">Escribe al menos 3 caracteres del modelo de la evaporadora, la condensadora o el equipo completo.</p>`;
  if(!res.length)return `<p class="small muted">No hay modelos con “${h(q)}”. Revisa el código o usa <button type="button" class="link" data-cat="pk-manual" data-i="${i}">captura manual</button>.</p>`;
  return `<div class="catPickList" role="listbox">${res.map(x=>`<button type="button" role="option" data-cat="pk-sys" data-i="${i}" data-v="${h(x.key)}"><b>${h(x.model||'Modelo sin código de sistema')}</b><span>${h(x.desc||'')}</span><small><em>Evap.</em> ${h(x.evap||'—')} <em>Cond.</em> ${h(x.cond||'—')}</small></button>`).join('')}</div>`}
function partResults(i,list,all){
  if(!list.length)return `<p class="small muted">${all?'Ninguna refacción coincide.':'Esta unidad no tiene refacciones en el catálogo.'} Si no la encuentras, usa <button type="button" class="link" data-cat="pk-manual" data-i="${i}">captura manual</button>.</p>`;
  return `<div class="catPickParts">${list.slice(0,80).map(p=>`<button type="button" data-cat="pk-part" data-i="${i}" data-v="${h(p.pn)}"><span>${h(p.desc)}</span><code>${h(p.pn)}</code></button>`).join('')}</div>${list.length>80?`<p class="small muted">Mostrando 80 de ${fmtN(list.length)}. Escribe para filtrar.</p>`:`<p class="small muted">${fmtN(list.length)} de ${fmtN(all)} refacciones.</p>`}`}
function selectedCard(i){
  const x=pieceOf(i)||{};const st=sel(i);const {b,s}=stepState(i);
  const unit=st.role==='E'?'Evaporadora':'Condensadora';
  const hidden=FIELDS.map(k=>`<input type="hidden" id="p${i}-${k}" name="p${i}-${k}" value="${h(x[k]||'')}">`).join('');
  const item=(t,v,cls='')=>`<div class="${cls}"><dt>${t}</dt><dd>${h(v||'—')}${cls==='hl'?'<small class="catSelTag">Pieza de esta unidad</small>':''}</dd></div>`;
  return `<div class="catSelected" aria-live="polite">
    <div class="catSelTop"><span class="catSelBadge">Seleccionado del catálogo</span><div class="row"><button type="button" class="btn secondary sm" data-cat="pk-change-part" data-i="${i}">Cambiar refacción</button><button type="button" class="btn secondary sm" data-cat="pk-change" data-i="${i}">Cambiar equipo</button></div></div>
    <div class="catSelPart"><small>Refacción solicitada</small><b>${h(x.part)}</b><code>${h(x.partNo)}</code><span>${h(unit)} ${h(st.role==='E'?x.evaporatorModel:x.condenserModel)}</span></div>
    <dl class="catSelGrid">${item('Marca',x.brand)}${item('Modelo del equipo',s?s.model||'Sin código de sistema':'')}${item('Evaporadora',x.evaporatorModel,st.role==='E'?'hl':'')}${item('Condensadora',x.condenserModel,st.role==='C'?'hl':'')}${s&&s.tr?item('Capacidad',s.tr+' TR'):''}${s&&s.refr?item('Refrigerante',s.refr):''}</dl>
    <p class="hint">Estos datos vienen del catálogo y no se editan aquí. Para corregirlos usa “Cambiar”.</p>${hidden}</div>`}
function paintBlock(i,focusId){const el=document.getElementById('catBlock-'+i);if(!el)return;keepFocus(()=>el.innerHTML=blockInner(i));if(focusId){const f=document.getElementById(focusId);if(f)f.focus()}}
function goStep(i,changes,focusId){Object.assign(sel(i),changes);paintBlock(i,focusId)}
function pickPart(i,pn){
  const st=sel(i);const b=S.brands[st.brand];const s=b.systems[sysIndex(b,st.sys)];const p=b.parts[pn]||{pn,desc:''};const piece=pieceOf(i);
  if(typeof saveDraft==='function')saveDraft();
  Object.assign(piece,{brand:b.name,otherBrand:'',evaporatorModel:s.evap||'',condenserModel:s.cond||'',part:p.desc,partNo:pn});
  Object.assign(st,{mode:'selected',pn});
  paintBlock(i);toast(`Refacción seleccionada: ${p.desc} (${pn}).`);
  document.getElementById('catBlock-'+i)?.scrollIntoView({block:'nearest',behavior:'smooth'});
}

/* ---------- Repintado y eventos ---------- */
function keepFocus(fn){const a=document.activeElement;const id=a&&a.id,pos=a&&a.selectionStart;fn();if(id){const el=document.getElementById(id);if(el&&el!==a){el.focus();try{el.setSelectionRange(pos,pos)}catch(e){}}}}
function paint(){const root=document.getElementById('catalogRoot');if(root)keepFocus(()=>root.innerHTML=catalogInner());document.querySelectorAll('.catTabs button').forEach(b=>{const on=b.dataset.v===view.tab;b.classList.toggle('on',on);b.setAttribute('aria-selected',on);const n=b.querySelector('span');if(n)n.textContent=brandList().length})}
function refreshPickers(){document.querySelectorAll('.catBlock').forEach(el=>{const i=Number(el.id.split('-')[1]);const st=sel(i);if(st.brand&&!S.brands[st.brand]&&st.mode!=='manual'){Object.assign(st,{mode:'search',brand:'',sys:null,role:'',pq:''})}el.innerHTML=blockInner(i)})}
function refresh(){paint();refreshPickers()}
document.addEventListener('click',e=>{const t=e.target.closest('[data-cat]');if(!t||t.disabled)return;const a=t.dataset.cat,v=t.dataset.v,i=Number(t.dataset.i||0);
  if(a.startsWith('pk-')){
    const st=sel(i);
    switch(a){
      case 'pk-brand':goStep(i,{brand:v,q:'',sys:null,role:'',pq:''},`catpk-q-${i}`);break;
      case 'pk-to-brand':goStep(i,{brand:'',q:'',sys:null,role:'',pq:''});break;
      case 'pk-to-model':goStep(i,{sys:null,role:'',pq:''},`catpk-q-${i}`);break;
      case 'pk-to-unit':goStep(i,{role:'',pq:''});break;
      case 'pk-sys':{const b=S.brands[st.brand];const s=b.systems[sysIndex(b,v)];const has=c=>c&&(b.equipment[c]||{parts:[]}).parts.length;
        const only=has(s.evap)&&!has(s.cond)?'E':!has(s.evap)&&has(s.cond)?'C':'';goStep(i,{sys:v,role:only,pq:''},only?`catpk-pq-${i}`:null);break}
      case 'pk-role':goStep(i,{role:v,pq:''},`catpk-pq-${i}`);break;
      case 'pk-part':pickPart(i,v);break;
      case 'pk-change-part':clearFields(i);goStep(i,{mode:'search',pq:'',pn:''},`catpk-pq-${i}`);break;
      case 'pk-change':clearFields(i);goStep(i,{mode:'search',sys:null,role:'',pq:'',pn:''},`catpk-q-${i}`);break;
      case 'pk-manual':if(typeof saveDraft==='function')saveDraft();if(st.mode==='selected'){}else clearFields(i);goStep(i,{mode:'manual'});break;
      case 'pk-search':clearFields(i);goStep(i,{mode:'search',pn:''});break;
    }return}
  switch(a){
    case 'tab':view.tab=v;view.confirmDel='';break;
    case 'brand':view.brand=v;view.family='';view.type='';view.cat='';view.sel=null;view.part=null;view.page=0;break;
    case 'mode':view.mode=v;view.page=0;view.part=null;view.cat='';break;
    case 'pg-prev':view.page=Math.max(0,view.page-1);break;
    case 'pg-next':view.page++;break;
    case 'sel':view.sel={b:t.dataset.b,i:Number(t.dataset.i)};view.part=null;view.cat='';{const s=S.brands[view.sel.b].systems[view.sel.i];view.role=s.evap?'E':'C'};if(innerWidth<980)setTimeout(()=>document.querySelector('.catDetail')?.scrollIntoView({behavior:'smooth'}),30);break;
    case 'role':view.role=v;view.cat='';break;
    case 'pcat':view.cat=v;break;
    case 'part':view.part={b:t.dataset.b,pn:v};if(innerWidth<980)setTimeout(()=>document.querySelector('.catDetail')?.scrollIntoView({behavior:'smooth'}),30);break;
    case 'part-close':view.part=null;break;
    case 'view-brand':view.tab='browse';view.brand=v;view.sel=null;view.part=null;view.page=0;break;
    case 'tpl':exportTemplate();return;
    case 'export':exportCatalog();return;
    case 'export-brand':exportCatalog(v);return;
    case 'commit':commit();return;
    case 'cancel':imp.result=null;imp.fileName='';{const inp=document.getElementById('catFile');if(inp)inp.value=''}break;
    case 'delete':view.confirmDel=v;break;
    case 'delete-no':view.confirmDel='';break;
    case 'delete-yes':removeBrand(v);return;
    case 'restore-seed':restoreSeed();return;
    default:return}
  paint()});
document.addEventListener('input',e=>{const t=e.target;const k=t.dataset&&t.dataset.catInput;if(!k)return;
  if(k==='q'){view.q=t.value;view.page=0;paint()}
  else if(k==='brandIn')imp.brandInput=t.value;
  else if(k==='pk-q'){const i=Number(t.dataset.i),st=sel(i);st.q=t.value;const B=S.brands[st.brand];const q=st.q;const res=words(q).length&&norm(q).replace(/\s/g,'').length>=3?B.systems.filter(x=>matches([x.model,x.evap,x.cond,x.desc,(B.equipment[x.evap]||{}).alt].join(' '),q)).slice(0,10):[];const box=document.getElementById('catpk-res-'+i);if(box)box.innerHTML=modelResults(i,res,q)}
  else if(k==='pk-pq'){const i=Number(t.dataset.i),st=sel(i);st.pq=t.value;const B=S.brands[st.brand];const s=B.systems[sysIndex(B,st.sys)];const e=B.equipment[st.role==='E'?s.evap:s.cond];const qk=key(st.pq);let list=e?e.parts.map(pn=>B.parts[pn]||{pn,desc:'',cat:''}):[];const all=list.length;if(st.pq)list=list.filter(p=>(qk&&key(p.pn).includes(qk))||matches(p.desc+' '+p.cat,st.pq));const box=document.getElementById('catpk-parts-'+i);if(box)box.innerHTML=partResults(i,list,all)}});
document.addEventListener('keydown',e=>{const t=e.target;if(e.key==='Enter'&&t.dataset&&(t.dataset.catInput==='pk-q'||t.dataset.catInput==='pk-pq')){e.preventDefault();const first=document.querySelector(t.dataset.catInput==='pk-q'?`#catpk-res-${t.dataset.i} [data-cat="pk-sys"]`:`#catpk-parts-${t.dataset.i} [data-cat="pk-part"]`);if(first)first.focus()}});
document.addEventListener('change',e=>{const t=e.target;
  if(t.matches&&t.matches('[data-cat-file]')){const f=t.files&&t.files[0];if(f){if(f.size>40*1024*1024)return toast('El archivo supera 40 MB.');readFile(f)}return}
  const k=t.dataset&&t.dataset.catChange;if(!k)return;
  if(k==='family'){view.family=t.value;view.page=0;view.sel=null;paint()}
  else if(k==='type'){view.type=t.value;view.page=0;paint()}
  else if(k==='cat'){view.cat=t.value;view.page=0;paint()}
  else if(k==='impmode'){imp.mode=t.value}});

window.CatalogModule={page:catalogPage,equipmentBlock,manualFields,brandNames:()=>brandList().map(b=>b.name),isManager,_state:S,_readXlsx:readXlsx};
init();
})();
