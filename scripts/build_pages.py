"""Construye demo pública sin datos locales, sesiones ni API privada."""
from pathlib import Path
import json, shutil
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs'
OUT.mkdir(exist_ok=True)
for name in ['index.html','pos.html','admin.html','repartidor.html','app.css','premium.css','motion.js']:
 shutil.copy2(ROOT/name,OUT/name)
shutil.copytree(ROOT/'assets',OUT/'assets',dirs_exist_ok=True)
seed=json.loads((ROOT/'seed.json').read_text())
for order in seed['orders']:order['demo']=True
seed['rev']=0
source=(ROOT/'store.js').read_text()
a=source.index('async function request(');b=source.index('\nconst DB=',a)
source=source[:a]+'''const demoState=DEMO_SEED;
async function request(path,body){
 if(path==='state'){const page=location.pathname.split('/').pop();return structuredClone({...demoState,role:page==='repartidor.html'?'repartidor':page==='pos.html'?'caja':'admin'})}
 if(path==='logout'){return {ok:true}}
 throw new ApiError('demo','Vista de demostración: no se guardan pedidos, cambios ni cobros.');
}
'''.replace('DEMO_SEED',json.dumps(seed,ensure_ascii=False))+source[b:]
source=source.replace("const changed=document.body.classList.contains('offline')===online;","const changed=document.body.classList.contains('offline')===online;")
source += '''\ndocument.body.insertAdjacentHTML('afterbegin','<aside role="note" style="padding:12px 18px;background:#fff0d9;color:#503018;text-align:center;font:14px/1.5 sans-serif">DEMO PÚBLICA · Datos de ejemplo. No registra pedidos ni cobros reales. <a href="index.html">Tienda</a> · <a href="pos.html">Caja</a> · <a href="admin.html">Administración</a> · <a href="repartidor.html">Reparto</a></aside>');\n'''
(OUT/'store.js').write_text(source)
(OUT/'.nojekyll').touch()
print(OUT)
