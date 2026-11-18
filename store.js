// Cliente compartido de la API. El servidor conserva pedidos e inventario en SQLite.
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $m=n=>'$'+Number(n).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
// Estimación visual en centavos enteros; el servidor sigue siendo la autoridad.
function cartSubtotal(cart,products){return Object.entries(cart).reduce((cents,[id,qty])=>cents+Math.round(products.find(p=>p.id===id).p*100)*qty,0)/100}
const ST={new:'Recibido',prep:'En preparación',ready:'Listo',route:'En camino',done:'Entregado',cancel:'Cancelado'};
const CATS=['Bollería','Pan dulce','Pan de mesa','Pasteles','Bebidas','Paquetes'];
let state=null, listeners=[], refreshPending=null, lastSync=null;
class ApiError extends Error{
 constructor(kind,message,status=0){super(message);this.name='ApiError';this.kind=kind;this.status=status}
}
function connection(online){
 const changed=document.body.classList.contains('offline')===online;
 document.body.classList.toggle('offline',!online);
 const c=$('#connection');if(c)c.textContent=online?'Servidor conectado':'Sin conexión · Reintentando';
 if(changed)window.dispatchEvent(new CustomEvent('horno:connection',{detail:{online,lastSync}}));
}
async function request(path,body){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:controller.signal});
  if(response.status===401)throw new ApiError('auth','Tu sesión venció. Inicia sesión de nuevo.',401);
  if(response.status>=500)throw new ApiError('server','El servidor no pudo completar la operación. Revisa el estado antes de reintentar.',response.status);
  let data;try{data=await response.json()}catch(e){if(controller.signal.aborted)throw e;throw new ApiError('response','La respuesta del servidor no es válida. Revisa el estado antes de reintentar.',response.status)}
  if(!response.ok)throw new ApiError('validation',data.error||'No se pudo completar la operación.',response.status);
  return data;
 }catch(e){
  if(e instanceof ApiError)throw e;
  connection(false);
  if(controller.signal.aborted)throw new ApiError('timeout','El servidor tardó demasiado. Revisa el estado antes de reintentar.');
  throw new ApiError('network','No hay conexión con el servidor. Conserva esta pantalla y espera a reconectar.');
 }finally{clearTimeout(timer)}
}
const DB={
 get(){return state},
 lastSync(){return lastSync},
 async refresh(notify=false){
  if(!refreshPending)refreshPending=(async()=>{
   const next=await request('state');
   if(state?.role&&!next.role&&location.pathname!=='/index.html'&&location.pathname!=='/')location.reload();
   const changed=!state||next.rev!==state.rev||next.role!==state.role;state=next;lastSync=Date.now();connection(true);return changed;
  })().finally(()=>{refreshPending=null});
  try{const changed=await refreshPending;if(notify&&changed)listeners.forEach(cb=>cb());return state}
  catch(e){connection(false);throw e}
 },
 on(cb){listeners.push(cb)},
 async action(action,values={}){
  values={...values};if(values.id){const o=state.orders.find(o=>o.id===values.id);if(o)values.expectedStatus=o.status}
  let result;try{result=await request('action',{action,...values})}catch(e){try{await DB.refresh(true)}catch{}throw e}
  // Un GET que falla no puede convertir un POST confirmado en una venta fallida.
  // Esperar un refresco previo y pedir uno nuevo evita leer datos anteriores al POST.
  if(refreshPending)try{await refreshPending}catch{}
  try{await DB.refresh()}catch{toast('Operación confirmada. Los datos se actualizarán al recuperar la conexión.')}
  listeners.forEach(cb=>cb());return result;
 }
};
async function place(order){order.expectedPrices=Object.fromEntries(Object.keys(order.cart).map(id=>[id,state.products.find(p=>p.id===id).p]));return (await DB.action('place',{order})).id}
const brand=()=>`<a class="brand" href="index.html" aria-label="El Horno, inicio"><span class="brand-mark"><img src="assets/logo.jpeg" alt=""></span><span>EL HORNO<small>PANADERÍA ARTESANAL</small></span></a>`;
const photo=p=>{const id=Number(p.id.slice(1)),ix={0:0,1:2,2:4,4:1,5:1,6:3,7:5}[id];return ix!==undefined?`<span class="photo i${ix}" role="img" aria-label="Imagen ilustrativa de ${esc(p.n)}"></span>`:`<span class="product-fallback" aria-hidden="true"><small>EL HORNO / ${esc(p.c)}</small><span>${esc(p.n)}</span></span>`};
function hub(active){
 document.body.dataset.page=active;
 const nav=[['index','Tienda','↗'],['pos','Caja','▦'],['admin','Administración','▤'],['repartidor','Repartidor','↗']];
 document.body.insertAdjacentHTML('afterbegin',`<nav class="hub" aria-label="Interfaces"><span class="suite-title">EL HORNO <span>/</span> SUITE</span><div>${nav.map(([h,t])=>`<a href="${h}.html" ${h===active?'class="on" aria-current="page"':''}>${t}</a>`).join('')}</div><span class="connection" id="connection"><i></i>Servidor local</span></nav>`);
 if(active!=='index'){
  document.body.insertAdjacentHTML('beforeend',`<aside class="sidebar">${brand()}<p class="side-label">ESPACIO DE TRABAJO</p><nav aria-label="Módulos">${nav.slice(1).map(([h,t,i])=>`<a href="${h}.html" class="side-link ${active===h?'on':''}"><span><img src="assets/icons/${h==='pos'?'cash':h==='admin'?'admin':'route'}.svg" alt=""></span>${t}</a>`).join('')}<button class="side-exit" aria-label="Cerrar sesión">Salir ↪</button></nav><div class="side-note"><span class="side-label">SUCURSAL</span><b>El Horno · Principal</b><small>Pedidos, caja y entregas<br>en un mismo lugar.</small></div><div class="staff"><span class="account-indicator" aria-hidden="true"></span><div><b>${{admin:'Administración',pos:'Caja',repartidor:'Repartidor 1'}[active]}</b><small>Sesión de personal</small></div><button class="logout" title="Cerrar sesión" aria-label="Cerrar sesión">↪</button></div></aside>`);
  for(const b of $$('.logout,.side-exit'))b.onclick=async()=>{await request('logout',{});location.reload()};
 }
}
function toast(m){let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','status');document.body.append(t)}t.textContent=m;t.className='show';clearTimeout(t._t);t._t=setTimeout(()=>t.className='',4200)}
async function login(required){
 const d=document.createElement('dialog');d.className='login';d.innerHTML=`${brand()}<p class="kick">ACCESO DEL PERSONAL</p><h2>Bienvenido de nuevo.</h2><p class="muted">Ingresa la clave de tu perfil para abrir este espacio.</p><form><label>Perfil<select name="role"><option value="admin">Administración</option><option value="caja">Caja</option><option value="repartidor">Repartidor</option></select></label><label>Clave de acceso<input name="password" type="password" required autocomplete="current-password"></label><p class="login-error" role="alert"></p><button class="btn big">Entrar al sistema →</button></form><a class="back-link" href="index.html">Volver a la tienda</a>`;document.body.append(d);d.querySelector('select').value=required;d.addEventListener('cancel',e=>e.preventDefault());d.showModal();
 return new Promise(resolve=>{d.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('button');b.disabled=true;try{const result=await request('login',{role:f.role.value,password:f.password.value});if(result.role!=='admin'&&result.role!==required){await request('logout',{});throw Error('Este perfil no tiene acceso a esta pantalla.')}await DB.refresh();d.close();d.remove();resolve()}catch(x){d.querySelector('.login-error').textContent=x.message}finally{b.disabled=false}}});
}
DB.ready=(async()=>{
 try{await DB.refresh();const page=location.pathname.split('/').pop(),required={ 'admin.html':'admin','pos.html':'caja','repartidor.html':'repartidor'}[page];if(required&&state.role!=='admin'&&state.role!==required)await login(required);
 const poll=async()=>{try{await DB.refresh(true)}catch{}finally{setTimeout(poll,2000)}};setTimeout(poll,2000);
 window.addEventListener('online',()=>{DB.refresh(true).catch(()=>{})});
 window.addEventListener('offline',()=>connection(false));
 }catch(e){document.body.innerHTML='<main class="wrap"><h1>El servidor no está disponible.</h1><p>Abre esta página desde el servidor de El Horno e intenta de nuevo.</p><button class="btn" onclick="location.reload()">Reintentar</button></main>';throw e}
})();
window.addEventListener('unhandledrejection',e=>{toast(e.reason?.message||'No se pudo completar la operación.');e.preventDefault()});
document.addEventListener('click',e=>{if(e.target.tagName==='DIALOG'&&!e.target.classList.contains('login')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
// Keyboard focus is immediate; occasional pointer-opened dialogs may ease in.
addEventListener('keydown',()=>document.documentElement.classList.add('keyboard-use'),{capture:true});
addEventListener('pointerdown',()=>document.documentElement.classList.remove('keyboard-use'),{capture:true});
