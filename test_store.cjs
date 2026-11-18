// Contratos del cliente con red simulada; no conecta al servicio activo.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('store.js', 'utf8');
const initial = {rev:1,role:null,orders:[],products:[],site:{}};
const response = (data, status=200) => ({ok:status<400,status,json:async()=>data});
async function client(){
 const classes=new Set(),events=[],timers=new Map(),nodes=new Map();let tick=0;
 const body={classList:{contains:x=>classes.has(x),toggle(x,on){on?classes.add(x):classes.delete(x)},add:x=>classes.add(x),remove:x=>classes.delete(x)},append(el){nodes.set('#'+el.id,el)},dataset:{}};
 const context=vm.createContext({
  fetch:async()=>response(initial),AbortController,Date,console,
  setTimeout(fn){const id=++tick;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)},
  location:{pathname:'/index.html',reload(){}},
  CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},
  window:{addEventListener(){},dispatchEvent(e){events.push(e)}},addEventListener(){},
  document:{body,querySelector:s=>nodes.get(s)||null,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({setAttribute(){}})}
 });
 vm.runInContext(source+'\nglobalThis.api={DB,request,ApiError,cartSubtotal};',context);
 await context.api.DB.ready;
 return {context,...context.api,classes,events,timers,nodes};
}
test('separa red, timeout, sesión, servidor y validación',async()=>{
 const c=await client();
 for(const [status,kind] of [[401,'auth'],[503,'server'],[400,'validation']]){
  c.context.fetch=async()=>response({error:'Dato inválido'},status);
  await assert.rejects(c.request('action',{}),e=>e.kind===kind&&e.status===status);
 }
 c.context.fetch=async()=>{throw new TypeError('fetch failed')};
 await assert.rejects(c.request('state'),e=>e.kind==='network');
 assert(c.classes.has('offline'));
 c.context.fetch=(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('abort'))));
 const pending=c.request('state');[...c.timers.values()].at(-1)();
 await assert.rejects(pending,e=>e.kind==='timeout');
});
test('un timeout durante lectura del cuerpo conserva su clasificación',async()=>{
 const c=await client();
 c.context.fetch=async(_,options)=>({ok:true,status:200,json:()=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('abort'))))});
 const pending=c.request('state');await new Promise(setImmediate);[...c.timers.values()].at(-1)();
 await assert.rejects(pending,e=>e.kind==='timeout');
});
test('respuesta malformada no equivale a éxito',async()=>{
 const c=await client();c.context.fetch=async()=>({ok:true,status:200,json:async()=>{throw new SyntaxError('bad json')}});
 await assert.rejects(c.request('action',{}),e=>e.kind==='response');
});
test('POST confirmado sigue siendo éxito si falla GET posterior, sin repetir POST',async()=>{
 const c=await client();let posts=0;
 c.context.fetch=async(path)=>{if(path==='/api/action'){posts++;return response({id:'EH-9',total:0.3})}throw new TypeError('offline')};
 const result=await c.DB.action('place',{order:{requestId:'test'}});
 assert.equal(result.id,'EH-9');assert.equal(posts,1);assert(c.classes.has('offline'));
 assert.match(c.nodes.get('#toast').textContent,/confirmada/);
});
test('un refresco fallido no oculta el error original de la escritura',async()=>{
 const c=await client();c.context.fetch=async(path)=>{if(path==='/api/action')return response({error:'No hay suficientes piezas'},400);throw new TypeError('offline')};
 await assert.rejects(c.DB.action('place',{}),e=>e.kind==='validation'&&e.message==='No hay suficientes piezas');
});
test('refrescos concurrentes comparten GET y notifican recuperación',async()=>{
 const c=await client();let release,gets=0;c.classes.add('offline');
 c.context.fetch=()=>{gets++;return new Promise(resolve=>{release=resolve})};
 const a=c.DB.refresh(),b=c.DB.refresh();assert.equal(gets,1);
 release(response({...initial,rev:2}));await Promise.all([a,b]);
 assert(!c.classes.has('offline'));assert.equal(c.DB.get().rev,2);
 assert(c.events.some(e=>e.detail.online));
});
test('refresco iniciado antes del POST no sustituye la consulta posterior',async()=>{
 const c=await client();let release,gets=0;
 c.context.fetch=async(path)=>{
  if(path==='/api/action')return response({id:'EH-10'});
  gets++;if(gets===1)return new Promise(resolve=>{release=resolve});
  return response({...initial,rev:3,orders:[{id:'EH-10'}]});
 };
 const before=c.DB.refresh();const action=c.DB.action('place',{});
 await Promise.resolve();release(response({...initial,rev:2}));await Promise.all([before,action]);
 assert.equal(gets,2);assert.equal(c.DB.get().orders[0].id,'EH-10');
});

test('estimación de caja acepta efectivo decimal exacto',async()=>{
 const c=await client();
 assert.equal(c.cartSubtotal({p0:3},[{id:'p0',p:0.1}]),0.3);
 assert.equal(c.cartSubtotal({p0:3,p1:2},[{id:'p0',p:0.29},{id:'p1',p:1.01}]),2.89);
});
