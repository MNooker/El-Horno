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
const demoState={"seq": 1003, "site": {"hero": "La vida sabe mejor con pan.", "sub": "Hecho cada mañana. Recoge en tienda o pide a domicilio.", "promo": "Envío gratis en pedidos mayores a $250", "addr": "Av. Ejemplo 123, Col. Centro (dato de prueba)", "phone": "555 000 0000", "wa": "5550000000", "ig": "@elhorno.demo", "open": 7, "close": 20, "fee": 25, "freeFrom": 250, "driverPay": 30}, "products": [{"id": "p0", "n": "Croissant de mantequilla", "c": "Bollería", "p": 38, "s": 48, "e": "🥐", "d": "Capas doradas y centro suave.", "i": "Harina, mantequilla, leche, huevo, sal", "a": "Gluten, lácteos, huevo", "w": "90 g", "l": 0}, {"id": "p1", "n": "Chocolatín", "c": "Bollería", "p": 42, "s": 28, "e": "🍫", "d": "Masa laminada con chocolate.", "i": "Harina, mantequilla, chocolate, azúcar", "a": "Gluten, lácteos, soya", "w": "100 g", "l": 0}, {"id": "p2", "n": "Rol de canela", "c": "Bollería", "p": 45, "s": 32, "e": "🌀", "d": "Espiral suave con canela y glaseado.", "i": "Harina, canela, azúcar, mantequilla", "a": "Gluten, lácteos, huevo", "w": "120 g", "l": 0}, {"id": "p3", "n": "Empanada de manzana", "c": "Bollería", "p": 36, "s": 20, "e": "🥧", "d": "Relleno casero de manzana.", "i": "Harina, manzana, azúcar, mantequilla", "a": "Gluten, lácteos", "w": "110 g", "l": 0}, {"id": "p4", "n": "Concha de vainilla", "c": "Pan dulce", "p": 18, "s": 80, "e": "🍪", "d": "Pan suave con cubierta de vainilla.", "i": "Harina, azúcar, manteca, huevo", "a": "Gluten, huevo, lácteos", "w": "85 g", "l": 0}, {"id": "p5", "n": "Concha de chocolate", "c": "Pan dulce", "p": 18, "s": 60, "e": "🍪", "d": "Cubierta de chocolate que se rompe al morder.", "i": "Harina, azúcar, cacao, huevo", "a": "Gluten, huevo", "w": "85 g", "l": 0}, {"id": "p6", "n": "Baguette rústica", "c": "Pan de mesa", "p": 35, "s": 20, "e": "🥖", "d": "Corteza crujiente, miga ligera.", "i": "Harina, agua, sal, levadura", "a": "Gluten", "w": "250 g", "l": 0}, {"id": "p7", "n": "Pan de masa madre", "c": "Pan de mesa", "p": 85, "s": 16, "e": "🍞", "d": "Fermentación lenta de 24 h.", "i": "Harina, agua, sal, masa madre", "a": "Gluten", "w": "600 g", "l": 0}, {"id": "p8", "n": "Pastel tres leches (12 porc.)", "c": "Pasteles", "p": 420, "s": 6, "e": "🎂", "d": "Esponjoso, para fiestas y reuniones.", "i": "Harina, leche, crema, huevo, azúcar", "a": "Gluten, lácteos, huevo", "w": "1.2 kg", "l": 24}, {"id": "p9", "n": "Pastel de chocolate (12 porc.)", "c": "Pasteles", "p": 480, "s": 4, "e": "🍰", "d": "Capas de chocolate con betún.", "i": "Harina, cacao, huevo, mantequilla", "a": "Gluten, lácteos, huevo, soya", "w": "1.3 kg", "l": 48}, {"id": "p10", "n": "Rebanada de cheesecake", "c": "Pasteles", "p": 52, "s": 12, "e": "🍰", "d": "Base de galleta y crema suave.", "i": "Queso crema, galleta, huevo, azúcar", "a": "Gluten, lácteos, huevo", "w": "130 g", "l": 0}, {"id": "p11", "n": "Café americano", "c": "Bebidas", "p": 35, "s": 99, "e": "☕", "d": "Grano de tueste medio.", "i": "Café, agua", "a": "Ninguno", "w": "12 oz", "l": 0}, {"id": "p12", "n": "Chocolate caliente", "c": "Bebidas", "p": 45, "s": 99, "e": "🍵", "d": "Con leche y cacao.", "i": "Leche, cacao, azúcar", "a": "Lácteos", "w": "12 oz", "l": 0}, {"id": "p13", "n": "Capuchino", "c": "Bebidas", "p": 48, "s": 99, "e": "☕", "d": "Espresso con espuma de leche.", "i": "Café, leche", "a": "Lácteos", "w": "12 oz", "l": 0}, {"id": "p14", "n": "Desayuno para 2", "c": "Paquetes", "p": 160, "s": 15, "e": "🧺", "d": "2 croissants + 2 cafés + 2 conchas.", "i": "Ver productos incluidos", "a": "Gluten, lácteos, huevo", "w": "—", "l": 0}, {"id": "p15", "n": "Combo mesa", "c": "Paquetes", "p": 120, "s": 15, "e": "🧺", "d": "Baguette + 4 conchas + mantequilla.", "i": "Ver productos incluidos", "a": "Gluten, lácteos, huevo", "w": "—", "l": 0}], "orders": [{"id": "EH-1001", "type": "delivery", "status": "ready", "name": "Ana (ejemplo)", "phone": "555 010 0000", "addr": "Calle Ejemplo 45, Col. Centro (prueba)", "slot": "Hoy 17:00", "pay": "cash", "note": "", "items": [{"id": "p0", "n": "Croissant de mantequilla", "p": 38, "q": 2}, {"id": "p4", "n": "Concha de vainilla", "p": 18, "q": 1}], "sub": 94, "fee": 25, "total": 119, "at": 1794576452355, "demo": true}, {"id": "EH-1002", "type": "pickup", "status": "new", "name": "Diego (ejemplo)", "phone": "555 010 0000", "addr": "", "slot": "Hoy 17:00", "pay": "cash", "note": "", "items": [{"id": "p4", "n": "Concha de vainilla", "p": 18, "q": 6}], "sub": 108, "fee": 0, "total": 108, "at": 1794576452355, "demo": true}, {"id": "EH-1003", "type": "delivery", "status": "prep", "name": "Lucía (ejemplo)", "phone": "555 010 0000", "addr": "Calle Ejemplo 45, Col. Centro (prueba)", "slot": "Hoy 17:00", "pay": "cash", "note": "", "items": [{"id": "p13", "n": "Capuchino", "p": 48, "q": 1}, {"id": "p1", "n": "Chocolatín", "p": 42, "q": 2}], "sub": 132, "fee": 25, "total": 157, "at": 1794576452355, "demo": true}], "rev": 0};
async function request(path,body){
 if(path==='state'){const page=location.pathname.split('/').pop();return structuredClone({...demoState,role:page==='repartidor.html'?'repartidor':page==='pos.html'?'caja':'admin'})}
 if(path==='logout'){return {ok:true}}
 throw new ApiError('demo','Vista de demostración: no se guardan pedidos, cambios ni cobros.');
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

document.body.insertAdjacentHTML('afterbegin','<aside role="note" style="padding:12px 18px;background:#fff0d9;color:#503018;text-align:center;font:14px/1.5 sans-serif">DEMO PÚBLICA · Datos de ejemplo. No registra pedidos ni cobros reales. <a href="index.html">Tienda</a> · <a href="pos.html">Caja</a> · <a href="admin.html">Administración</a> · <a href="repartidor.html">Reparto</a></aside>');
