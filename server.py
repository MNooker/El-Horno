#!/usr/bin/env python3
"""El Horno: servidor local, API y SQLite; solo biblioteca estándar de Python."""
import argparse, copy, hashlib, hmac, json, os, secrets, sqlite3, threading, time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from http.cookies import SimpleCookie
from urllib.parse import urlparse
from decimal import Decimal

os.environ['TZ']='America/Chihuahua'
if hasattr(time,'tzset'):time.tzset()

ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get('HORNO_DATA_DIR',str(ROOT / 'data')))
DATA.mkdir(exist_ok=True)
os.chmod(DATA, 0o700)
DB = DATA / 'elhorno.sqlite3'
KEYS = DATA / 'accesos.json'
if not KEYS.exists():
    KEYS.write_text(json.dumps({r:secrets.token_urlsafe(12) for r in ['admin','caja','repartidor']}, indent=2))
    KEYS.chmod(0o600)
CREDENTIALS = json.loads(KEYS.read_text())
SESSIONS = {}
LOCK = threading.RLock()
ATTEMPTS = {}

class Invalid(Exception): pass

class ClosingConnection(sqlite3.Connection):
    def __exit__(self,*args):
        try:return super().__exit__(*args)
        finally:self.close()

def connect():
    db = sqlite3.connect(DB, timeout=15, factory=ClosingConnection)
    db.execute('PRAGMA foreign_keys=ON')
    return db

def initialize():
    with connect() as db:
        db.execute('PRAGMA journal_mode=WAL')
        db.executescript('CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS meta (id INTEGER PRIMARY KEY CHECK(id=1), seq INTEGER NOT NULL, rev INTEGER NOT NULL);')
        if not db.execute('SELECT 1 FROM meta').fetchone():
            seed=json.loads((ROOT/'seed.json').read_text())
            # Los pedidos de ejemplo se identifican claramente y reservan sus piezas.
            for o in seed['orders']:
                o['demo']=True
                for item in o['items']:
                    next(p for p in seed['products'] if p['id']==item['id'])['s']-=item['q']
            db.execute('INSERT INTO meta VALUES(1,?,0)', (seed['seq'],))
            db.execute('INSERT INTO settings VALUES(1,?)', (json.dumps(seed['site']),))
            db.executemany('INSERT INTO products VALUES(?,?)',[(p['id'],json.dumps(p)) for p in seed['products']])
            db.executemany('INSERT INTO orders VALUES(?,?)',[(o['id'],json.dumps(o)) for o in seed['orders']])
    DB.chmod(0o600)

def read(db):
    seq,rev=db.execute('SELECT seq,rev FROM meta WHERE id=1').fetchone()
    return dict(seq=seq,rev=rev,site=json.loads(db.execute('SELECT payload FROM settings').fetchone()[0]),products=[json.loads(x[0]) for x in db.execute('SELECT payload FROM products')],orders=sorted([json.loads(x[0]) for x in db.execute('SELECT payload FROM orders')],key=lambda o:o['at'],reverse=True))

def write(db,s):
    db.execute('UPDATE meta SET seq=?,rev=rev+1 WHERE id=1',(s['seq'],))
    db.execute('UPDATE settings SET payload=? WHERE id=1',(json.dumps(s['site']),))
    for table in ['products','orders']:
        db.executemany(f'INSERT INTO {table} VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload',[(x['id'],json.dumps(x,ensure_ascii=False)) for x in s[table]])

def require(condition,message):
    if not condition: raise Invalid(message)
def integer(v,lo=0,hi=100000):
    require(isinstance(v,int) and not isinstance(v,bool) and lo<=v<=hi,'Cantidad inválida.')
    return v
def money(v):
    require(isinstance(v,(int,float)) and not isinstance(v,bool),'Importe inválido.')
    amount = Decimal(str(v))
    require(amount.is_finite() and 0 <= amount <= 100000,'Importe inválido.')
    require(amount == amount.quantize(Decimal('0.01')),'Importe inválido.')
    return amount

def json_money(amount: Decimal) -> float:
    """Conservar números JSON heredados; convertir solo al guardar/responder."""
    return float(amount)
def text(v,n=250): return str(v or '').strip()[:n]
def find(xs,id):
    x=next((x for x in xs if x['id']==id),None)
    require(x is not None,'Registro no encontrado.')
    return x

def action(s,a,role):
    op=a.get('action')
    require(op=='place' or role in ['admin','caja','repartidor'],'Inicia sesión para continuar.')
    if op=='place':
        o=a.get('order',{});require(isinstance(o,dict),'Pedido inválido.')
        typ=o.get('type');require(typ in ['pos','pickup','delivery'],'Tipo de pedido inválido.')
        require(typ!='pos' or role in ['admin','caja'],'Acceso de caja requerido.')
        token=text(o.get('requestId'),80)
        if token:
            previous=next((x for x in s['orders'] if x.get('requestId')==token),None)
            if previous:return {'id':previous['id'],'total':previous['total']}
        cart=o.get('cart');require(isinstance(cart,dict) and 0<len(cart)<=100,'Agrega productos a tu pedido.')
        items=[]
        for pid,qty in cart.items():
            p=find(s['products'],pid)
            if isinstance(o.get('expectedPrices'),dict):require(o['expectedPrices'].get(pid)==p['p'],'Cambió el precio de '+p['n']+'. Revisa tu pedido.')
            integer(qty,1,10000);require(p['s']>=qty,'No hay suficientes piezas de '+p['n'])
            require(typ!='pos' or not p['l'],'Este producto requiere un pedido anticipado desde la web.')
            items.append(dict(id=pid,n=p['n'],p=p['p'],q=qty))
        sub=sum((money(x['p'])*x['q'] for x in items),Decimal('0.00'))
        fee=money(s['site']['fee']) if typ=='delivery' and sub<money(s['site']['freeFrom']) else Decimal('0.00')
        total=sub+fee;pay=o.get('pay');require(pay in ['cash','card','online'],'Medio de pago inválido.')
        require(typ=='pos' or pay in ['cash','online'],'Medio de pago inválido.')
        name=text(o.get('name'),60);phone=''.join(x for x in str(o.get('phone','')) if x.isdigit());addr=text(o.get('addr'),150)
        if typ!='pos':
            require(len(name)>=2,'Escribe el nombre del cliente.');require(len(phone)==10,'Escribe un teléfono de 10 dígitos.')
            require(typ!='delivery' or len(addr)>=8,'Escribe una dirección completa.')
            delivery_at=o.get('scheduledAt');require(isinstance(delivery_at,(int,float)) and delivery_at==delivery_at,'Selecciona un horario válido.')
            lead=max(find(s['products'],x['id'])['l'] for x in items)
            require(delivery_at>=time.time()*1000+max(lead*3600000,40*60000),'El horario no cumple la anticipación del pedido.')
            require(delivery_at<time.time()*1000+5*86400000,'Elige un horario de los próximos cuatro días.')
            tm=time.localtime(delivery_at/1000)
            require(s['site']['open']<=tm.tm_hour<s['site']['close'] and tm.tm_min in [0,30],'El horario está fuera de atención.')
        else:
            if pay=='cash':require(money(o.get('received',0))>=total,'El efectivo no cubre el total.')
        s['seq']+=1;oid='EH-'+str(s['seq']);now=int(time.time()*1000)
        order=dict(requestId=token,id=oid,type=typ,status='done' if typ=='pos' else 'new',name=name or 'Mostrador',phone=phone,addr=addr,slot=text(o.get('slot'),100),scheduledAt=o.get('scheduledAt'),pay=pay,note=text(o.get('note'),200),items=items,sub=json_money(sub),fee=json_money(fee),total=json_money(total),at=now,paid=typ=='pos',paymentStatus='simulado' if pay=='online' else 'pagado' if typ=='pos' else 'pendiente')
        if typ=='pos':order['completedAt']=now
        for x in items:find(s['products'],x['id'])['s']-=x['q']
        s['orders'].insert(0,order)
        return {'id':oid,'total':order['total']}
    if op in ['progress','cancel','assign','accept','pickup','deliver']:
        o=find(s['orders'],a.get('id'))
        if 'expectedStatus' in a:require(a['expectedStatus']==o['status'],'El pedido ya cambió de estado. Actualiza la pantalla.')
        if op in ['progress','cancel','assign']:require(role in ['admin','caja'],'Acceso de caja requerido.')
        else:require(role in ['admin','repartidor'],'Acceso de repartidor requerido.')
        if op=='progress':
            nxt={'new':'prep','prep':'ready'}
            if o['status']=='ready' and o['type']=='pickup':
                require(a.get('confirmPayment') is True,'Confirma el cobro antes de entregar.')
                o['status']='done';o['paid']=True;o['completedAt']=int(time.time()*1000)
            else:require(o['status'] in nxt,'El pedido ya cambió de estado.');o['status']=nxt[o['status']]
        elif op=='cancel':
            require(role=='admin','Acceso de administrador requerido para anular.')
            require(o['status'] in ['new','prep','ready'],'Este pedido ya no se puede cancelar.')
            for x in o['items']:find(s['products'],x['id'])['s']+=x['q']
            o['status']='cancel'
        elif op in ['assign','accept']:
            require(o['type']=='delivery' and o['status']=='ready' and not o.get('driver'),'Este pedido ya fue asignado.')
            require(not any(x.get('driver')=='Repartidor 1' and x['status']=='route' for x in s['orders']),'El repartidor ya tiene una entrega en curso.')
            o['driver']='Repartidor 1';o['status']='route';o['driverPay']=s['site']['driverPay']
        elif op=='pickup':
            require(o['status']=='route' and not o.get('picked'),'El pedido ya cambió de estado.');o['picked']=True
        elif op=='deliver':
            require(o['status']=='route' and o.get('picked'),'Recoge primero el pedido en tienda.')
            require(a.get('confirmPayment') is True,'Confirma el cobro antes de entregar.')
            o['status']='done';o['paid']=True;o['completedAt']=int(time.time()*1000)
        return {'id':o['id']}
    require(role=='admin','Acceso de administrador requerido.')
    if op=='stock':
        p=find(s['products'],a.get('id'));integer(a.get('delta'),-10000,10000);require(p['s']+a['delta']>=0,'La existencia no puede ser negativa.');p['s']+=a['delta']
    elif op=='price':
        p=find(s['products'],a.get('id'));v=money(a.get('value'));require(v>0,'El precio debe ser mayor a cero.');p['p']=json_money(v)
    elif op=='product':
        p=a.get('product',{});require(isinstance(p,dict),'Producto inválido.');require(len(text(p.get('n'),100))>=2,'Escribe el nombre del producto.');money(p.get('p'));require(p['p']>0,'El precio debe ser mayor a cero.');integer(p.get('s'));integer(p.get('l',0),0,72)
        require(p.get('c') in ['Bollería','Pan dulce','Pan de mesa','Pasteles','Bebidas','Paquetes'],'Categoría inválida.')
        p={k:text(p.get(k),250) for k in ['n','c','e','d','i','a','w']}|{k:a['product'].get(k,0) for k in ['p','s','l']}|{'id':'p'+secrets.token_hex(6)};s['products'].append(p)
    elif op=='site':
        k=a.get('key');v=a.get('value');require(k in s['site'],'Campo inválido.')
        if k in ['fee','freeFrom','driverPay']:money(v)
        elif k in ['open','close']:
            integer(v,0,23);new=s['site']|{k:v};require(new['open']<new['close'],'La apertura debe ser anterior al cierre.')
        else:v=text(v,250);require(bool(v),'El campo no puede estar vacío.')
        s['site'][k]=v
    else:raise Invalid('Acción desconocida.')
    return {'ok':True}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def end_headers(self):
        self.send_header('X-Content-Type-Options','nosniff');self.send_header('X-Frame-Options','DENY');self.send_header('Referrer-Policy','same-origin');self.send_header('Cache-Control','no-store');super().end_headers()
    def response(self,data,status=200,cookie=None):
        payload=json.dumps(data,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(payload)))
        if cookie:self.send_header('Set-Cookie',cookie)
        self.end_headers();self.wfile.write(payload)
    def role(self):
        try:token=SimpleCookie(self.headers.get('Cookie',''))['horno_session'].value
        except (KeyError,TypeError):return None
        session=SESSIONS.get(token)
        return session['role'] if session and session['expires']>time.time() else None
    def do_GET(self):
        path=urlparse(self.path).path
        if path=='/api/state':
            with LOCK,connect() as db:s=read(db)
            role=self.role();s['role']=role
            if not role:s['orders']=[]
            elif role=='repartidor':s['orders']=[o for o in s['orders'] if o['type']=='delivery' and (o['status'] in ['ready','new','prep'] or o.get('driver')=='Repartidor 1')]
            return self.response(s)
        if path.startswith('/api/'):return self.response({'error':'No encontrado.'},404)
        # Lista explícita: nunca servir BD, claves ni código del servidor.
        if path not in ['/','/index.html','/pos.html','/admin.html','/repartidor.html','/app.css','/premium.css','/motion.js','/store.js'] and not (path.startswith('/assets/') and (ROOT/path.lstrip('/')).resolve().is_relative_to((ROOT/'assets').resolve()) and (ROOT/path.lstrip('/')).is_file()):
            return self.response({'error':'No encontrado.'},404)
        super().do_GET()
    def do_POST(self):
        # Bloquear peticiones originadas en otro sitio, también en la red local.
        origin=self.headers.get('Origin')
        if origin and urlparse(origin).netloc!=self.headers.get('Host'):return self.response({'error':'Origen no permitido.'},403)
        if self.headers.get_content_type()!='application/json':return self.response({'error':'Se requiere JSON.'},415)
        try:
            size=int(self.headers.get('Content-Length','0'));require(0<size<100000,'Petición inválida.')
            a=json.loads(self.rfile.read(size));require(isinstance(a,dict),'Petición inválida.')
            path=urlparse(self.path).path
            if path=='/api/login':
                ip=self.client_address[0];attempt=ATTEMPTS.get(ip,[]);attempt=[t for t in attempt if t>time.time()-300];require(len(attempt)<12,'Demasiados intentos. Espera cinco minutos.')
                role=a.get('role');require(role in CREDENTIALS,'Selecciona un perfil válido.')
                if not hmac.compare_digest(str(a.get('password','')),CREDENTIALS[role]):ATTEMPTS[ip]=attempt+[time.time()];raise Invalid('Clave incorrecta.')
                token=secrets.token_urlsafe(32);SESSIONS[token]={'role':role,'expires':time.time()+43200};ATTEMPTS.pop(ip,None)
                return self.response({'role':role},cookie=f'horno_session={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200')
            if path=='/api/logout':
                try:SESSIONS.pop(SimpleCookie(self.headers.get('Cookie',''))['horno_session'].value,None)
                except KeyError:pass
                return self.response({'ok':True},cookie='horno_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0')
            if path=='/api/track':
                with LOCK,connect() as db:s=read(db)
                o=next((o for o in s['orders'] if o['id']==text(a.get('id')).upper() and o['phone']==''.join(c for c in str(a.get('phone','')) if c.isdigit())),None)
                require(o is not None,'No encontramos un pedido con ese folio y teléfono.')
                return self.response({k:o.get(k) for k in ['id','status','slot','total','type','picked']})
            require(path=='/api/action','Ruta no encontrada.')
            with LOCK,connect() as db:
                db.execute('BEGIN IMMEDIATE');s=read(db);result=action(s,a,self.role());write(db,s)
            return self.response(result)
        except (Invalid,ValueError,TypeError,KeyError) as e:return self.response({'error':str(e) if isinstance(e,Invalid) else 'Datos inválidos.'},400)
        except Exception:
            import traceback;traceback.print_exc();return self.response({'error':'No se pudo guardar la operación.'},500)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8000);parser.add_argument('--host',default='0.0.0.0');args=parser.parse_args()
    initialize()
    print(f'El Horno: http://localhost:{args.port} · SQLite: {DB}',flush=True)
    print(f'Claves del personal: {KEYS} (no se sirven por HTTP)',flush=True)
    ThreadingHTTPServer((args.host,args.port),Handler).serve_forever()
