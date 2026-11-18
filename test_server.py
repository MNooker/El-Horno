"""Pruebas aisladas de negocio, concurrencia, persistencia y acceso HTTP."""
import concurrent.futures, copy, http.cookiejar, json, tempfile, threading, time, unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, build_opener, HTTPCookieProcessor
import server
from decimal import Decimal

class HornoTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();server.DB=Path(self.tmp.name)/'test.sqlite3';server.initialize()
    def tearDown(self):self.tmp.cleanup()
    def state(self):
        with server.connect() as db:return server.read(db)
    def transact(self,action,role='admin'):
        with server.LOCK,server.connect() as db:
            db.execute('BEGIN IMMEDIATE');s=server.read(db);result=server.action(s,action,role);server.write(db,s);return result
    def order(self,typ='delivery',qty=1):
        tomorrow=time.localtime(time.time()+86400);at=int(time.mktime((tomorrow.tm_year,tomorrow.tm_mon,tomorrow.tm_mday,12,0,0,0,0,-1))*1000)
        return {'action':'place','order':dict(type=typ,cart={'p0':qty},name='Prueba aislada',phone='5551234567',addr='Calle de pruebas 123',pay='cash',received=100,slot='Mañana 12:00',scheduledAt=at)}
    def test_server_computes_total_and_stock(self):
        before=self.state();a=self.order();a['order']['total']=1;result=self.transact(a,None);after=self.state();self.assertEqual(result['total'],63);self.assertEqual(after['products'][0]['s'],before['products'][0]['s']-1)
    def test_retry_does_not_duplicate_order(self):
        a=self.order();a['order']['requestId']='isolated-retry-key';before=self.state();first=self.transact(a,None);second=self.transact(a,None);after=self.state();self.assertEqual(first,second);self.assertEqual(len(after['orders']),len(before['orders'])+1);self.assertEqual(after['products'][0]['s'],before['products'][0]['s']-1)
    def test_stale_status_does_not_advance_twice(self):
        oid=self.transact(self.order(),None)['id'];a=dict(action='progress',id=oid,expectedStatus='new');self.transact(a)
        with self.assertRaises(server.Invalid):self.transact(a)
    def test_changed_price_is_rejected(self):
        a=self.order();a['order']['expectedPrices']={'p0':1}
        with self.assertRaises(server.Invalid):self.transact(a,None)
    def test_delivery_end_to_end(self):
        oid=self.transact(self.order(),None)['id']
        for op in ['progress','progress','accept','pickup']:
            self.transact(dict(action=op,id=oid),'repartidor' if op in ['accept','pickup'] else 'admin')
        with self.assertRaises(server.Invalid):self.transact(dict(action='deliver',id=oid),'repartidor')
        self.transact(dict(action='deliver',id=oid,confirmPayment=True),'repartidor');o=next(o for o in self.state()['orders'] if o['id']==oid);self.assertEqual(o['status'],'done');self.assertTrue(o['paid']);self.assertIn('completedAt',o)
    def test_rollback_on_short_stock(self):
        before=self.state()
        with self.assertRaises(server.Invalid):self.transact(self.order(qty=1000),None)
        self.assertEqual(self.state(),before)
    def test_cancel_returns_stock_once(self):
        before=self.state()['products'][0]['s'];oid=self.transact(self.order(),None)['id'];self.transact(dict(action='cancel',id=oid));self.assertEqual(self.state()['products'][0]['s'],before)
        with self.assertRaises(server.Invalid):self.transact(dict(action='cancel',id=oid))
        self.assertEqual(self.state()['products'][0]['s'],before)
    def test_role_enforcement(self):
        for role in [None,'caja','repartidor']:
            with self.assertRaises(server.Invalid):self.transact(dict(action='price',id='p0',value=1),role)
        with self.assertRaises(server.Invalid):self.transact(self.order('pos'),None)
    def test_cash_shortage(self):
        a=self.order('pos');a['order']['received']=1
        with self.assertRaises(server.Invalid):self.transact(a,'caja')
    def test_empty_cart_and_fractional_stock(self):
        a=self.order();a['order']['cart']={}
        with self.assertRaises(server.Invalid):self.transact(a,None)
        a=self.order(qty=1.5)
        with self.assertRaises(server.Invalid):self.transact(a,None)
    def test_competing_sales_last_piece(self):
        self.transact(dict(action='stock',id='p0',delta=1-self.state()['products'][0]['s']))
        def sale(_):
            try:return self.transact(self.order('pos'),'caja')
            except server.Invalid:return None
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:results=list(ex.map(sale,range(2)))
        self.assertEqual(sum(x is not None for x in results),1);self.assertEqual(self.state()['products'][0]['s'],0)
    def test_pickup_confirmation_and_persistence(self):
        oid=self.transact(self.order('pickup'),None)['id']
        for _ in range(2):self.transact(dict(action='progress',id=oid))
        with self.assertRaises(server.Invalid):self.transact(dict(action='progress',id=oid))
        self.transact(dict(action='progress',id=oid,confirmPayment=True));server.initialize();self.assertEqual(next(o for o in self.state()['orders'] if o['id']==oid)['status'],'done')
    def test_schedule_and_settings(self):
        a=self.order();a['order']['scheduledAt']=0
        with self.assertRaises(server.Invalid):self.transact(a,None)
        with self.assertRaises(server.Invalid):self.transact(dict(action='site',key='open',value=23))
    def test_money_uses_decimal_and_rejects_invalid_values(self):
        self.assertEqual(server.money(0.29)*3, Decimal('0.87'))
        for value in [True, '1.00', -1, 0.001, float('nan'), float('inf'), 100000.01]:
            with self.subTest(value=value), self.assertRaises(server.Invalid):
                server.money(value)

    def test_fractional_prices_fee_and_exact_cash(self):
        self.transact(dict(action='price',id='p0',value=0.1))
        self.transact(dict(action='site',key='fee',value=0.2))
        a=self.order('pos',qty=3);a['order']['received']=0.3
        result=self.transact(a,'caja')
        self.assertEqual(result['total'],0.3)
        self.assertEqual(self.transact(self.order(),None)['total'],0.3)
        self.assertEqual(self.state()['products'][0]['p'],0.1)

    def test_free_delivery_threshold_is_decimal(self):
        self.transact(dict(action='price',id='p0',value=0.1))
        self.transact(dict(action='site',key='freeFrom',value=0.3))
        self.assertEqual(self.transact(self.order(qty=3),None)['total'],0.3)

    def test_cashier_cannot_cancel_or_restore_inventory(self):
        oid=self.transact(self.order(),None)['id'];before=self.state()
        with self.assertRaises(server.Invalid):
            self.transact(dict(action='cancel',id=oid),'caja')
        self.assertEqual(self.state(),before)
        self.transact(dict(action='cancel',id=oid),'admin')
        self.assertEqual(self.state()['products'][0]['s'],before['products'][0]['s']+1)

    def test_nested_invalid_payloads_do_not_mutate_state(self):
        before=self.state()
        for payload in [dict(action='place',order=[]),dict(action='product',product=None)]:
            with self.assertRaises(server.Invalid):self.transact(payload)
        self.assertEqual(self.state(),before)
    def test_http_privacy_login_and_tracking(self):
        http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler);thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start();base='http://127.0.0.1:'+str(http.server_port)
        client=build_opener(HTTPCookieProcessor())
        def get(path):
            try:
                with client.open(base+path) as response:return json.load(response)
            except HTTPError as e:e.close();raise
        def post(path,a):
            try:
                with client.open(Request(base+path,data=json.dumps(a).encode(),headers={'Content-Type':'application/json'})) as response:return json.load(response)
            except HTTPError as e:e.close();raise
        try:
            self.assertEqual(get('/api/state')['orders'],[])
            for path in ['/data/accesos.json','/data/elhorno.sqlite3','/server.py','/seed.json','/../server.py']:
                with self.assertRaises(HTTPError) as ctx:get(path)
                self.assertEqual(ctx.exception.code,404)
            with self.assertRaises(HTTPError):post('/api/action',dict(action='stock',id='p0',delta=1))
            post('/api/login',dict(role='admin',password=server.CREDENTIALS['admin']));self.assertEqual(get('/api/state')['role'],'admin')
            oid=post('/api/action',self.order())['id'];post('/api/logout',{})
            with self.assertRaises(HTTPError):post('/api/track',dict(id=oid,phone='0000000000'))
            self.assertEqual(post('/api/track',dict(id=oid,phone='5551234567'))['status'],'new')
            with self.assertRaises(HTTPError) as ctx:client.open(Request(base+'/api/login',data=b'{}',headers={'Content-Type':'application/json','Origin':'http://evil.test'}))
            self.assertEqual(ctx.exception.code,403);ctx.exception.close()
        finally:http.shutdown();http.server_close()

if __name__=='__main__':unittest.main(verbosity=2)
