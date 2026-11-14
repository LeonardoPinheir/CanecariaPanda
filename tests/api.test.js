import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { handle } from '../server/handler.js';
import { resetStoreForTests } from '../server/store.js';

let cookie = '';

async function call(method, path, body) {
  const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
  Object.assign(req, { method, url: path, headers: { cookie, 'x-forwarded-for': '1.1.1.1' } });
  const res = {
    statusCode: 200, headers: {}, body: '',
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(b) { this.body = b; },
  };
  await handle(req, res);
  const setCookie = res.headers['set-cookie'];
  if (setCookie) cookie = setCookie.split(';')[0];
  const isJson = (res.headers['content-type'] || '').includes('json');
  return { status: res.statusCode, data: isJson ? JSON.parse(res.body) : res.body };
}

beforeEach(() => { resetStoreForTests(); cookie = ''; delete process.env.ADMIN_PASSWORD; process.env.ADMIN_EMAIL = 'dono@loja.test'; });

const login = () => call('POST', '/api/auth/login', { email: 'dono@loja.test', password: 'panda1234' });

test('catálogo público não expõe custo', async () => {
  const r = await call('GET', '/api/public/catalog');
  assert.equal(r.status, 200);
  assert.ok(r.data.products.length > 0);
  assert.equal(r.data.products[0].costPrice, undefined);
});

test('pedido pelo site usa preço do cadastro, aplica cupom e frete', async () => {
  const cat = (await call('GET', '/api/public/catalog')).data;
  const p = cat.products.find((x) => x.id === 'caneca-magica');
  const r = await call('POST', '/api/public/orders', {
    customer: { name: 'Ana Souza', phone: '(63) 99999-0000' },
    items: [{ productId: p.id, qty: 2, price: 0.01, custom: 'Ana' }],
    coupon: 'bemvindo10', delivery: 'entrega', address: 'Rua A, 10',
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(r.data.subtotal, 119.8);
  assert.equal(r.data.discount, 11.98);
  assert.equal(r.data.shipping, 10);
  assert.equal(r.data.total, 117.82);
  assert.equal(r.data.number, 1001);
  const t = await call('GET', `/api/public/track?code=${r.data.code}`);
  assert.equal(t.data.status, 'novo');
  const mine = await call('POST', '/api/public/my-orders', { phone: '63999990000', code: r.data.code });
  assert.equal(mine.data.orders.length, 1);
  const wrong = await call('POST', '/api/public/my-orders', { phone: '63111110000', code: r.data.code });
  assert.equal(wrong.status, 404);
});

test('painel exige login e primeiro acesso cria administrador', async () => {
  assert.equal((await call('GET', '/api/admin/data?c=orders')).status, 401);
  assert.equal((await call('POST', '/api/auth/login', { email: 'dono@loja.test', password: 'errada' })).status, 401);
  assert.equal((await login()).status, 200);
  const me = await call('GET', '/api/auth/me');
  assert.equal(me.data.user.email, 'dono@loja.test');
  const d = await call('GET', '/api/admin/data?c=orders,admins');
  assert.equal(d.data.admins, undefined);
});

test('estoque, cancelamento e financeiro andam juntos', async () => {
  await login();
  const prod = await call('POST', '/api/admin/products', { name: 'Caneca Teste', price: 30, costPrice: 10, active: true, trackStock: true, stock: 3, categoryId: 'cat-canecas' });
  assert.equal(prod.status, 201);
  assert.equal(prod.data.slug, 'caneca-teste');
  const over = await call('POST', '/api/public/orders', { customer: { name: 'Bia', phone: '63988887777' }, items: [{ productId: prod.data.id, qty: 4 }] });
  assert.equal(over.status, 400);
  const pdv = await call('POST', '/api/admin/orders', { origin: 'pdv', items: [{ productId: prod.data.id, qty: 2 }], paid: true, paymentMethod: 'Pix' });
  assert.equal(pdv.status, 201);
  assert.equal(pdv.data.status, 'entregue');
  let d = (await call('GET', '/api/admin/data?c=products,finance,stock')).data;
  assert.equal(d.products.find((p) => p.id === prod.data.id).stock, 1);
  assert.equal(d.finance.length, 1);
  assert.equal(d.finance[0].amount, 60);
  await call('POST', `/api/admin/orders/${pdv.data.id}/status`, { status: 'cancelado' });
  d = (await call('GET', '/api/admin/data?c=products,finance,stock')).data;
  assert.equal(d.products.find((p) => p.id === prod.data.id).stock, 3);
  assert.equal(d.finance.length, 0);
  assert.equal(d.stock.length, 2);
});

test('não apaga categoria com produtos', async () => {
  await login();
  const r = await call('DELETE', '/api/admin/categories/cat-canecas');
  assert.equal(r.status, 400);
});

test('rota reescrita pela Vercel', async () => {
  const r = await call('GET', '/api/index?__path=public/catalog');
  assert.equal(r.status, 200);
});
