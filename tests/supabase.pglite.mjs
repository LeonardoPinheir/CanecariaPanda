import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import assert from 'node:assert/strict';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role;
create schema storage; create table storage.buckets (id text primary key, name text, public boolean);`);
await db.exec(readFileSync(`${ROOT}/supabase/schema.sql`, 'utf8'));
console.log('schema ok');

const files = new Map();
let rpcCalls = 0;
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  const method = opts.method || 'GET';
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  if (u.pathname.startsWith('/rest/v1/rpc/aplicar_alteracoes')) {
    rpcCalls++;
    const b = JSON.parse(opts.body);
    try {
      const r = await db.query('select public.aplicar_alteracoes($1, $2) as v', [b.p_expected, JSON.stringify(b.p_changes)]);
      return json(200, r.rows[0].v);
    } catch (e) {
      return json(400, { message: e.message, code: e.code });
    }
  }
  if (u.pathname.startsWith('/rest/v1/')) {
    const table = u.pathname.split('/').pop();
    let where = '';
    for (const [k, v] of u.searchParams) if (k !== 'select' && v.startsWith('eq.')) where = ` where ${k} = '${v.slice(3)}'`;
    const range = opts.headers?.Range;
    let lim = '';
    if (range) { const [a, b2] = range.split('-').map(Number); lim = ` offset ${a} limit ${b2 - a + 1}`; }
    const r = await db.query(`select to_jsonb(t) as j from public.${table} t${where}${lim}`);
    // numeric -> número, como o PostgREST faz
    return json(200, r.rows.map((x) => JSON.parse(JSON.stringify(x.j), (k, v) => v)));
  }
  if (u.pathname.startsWith('/storage/v1/object/public/')) {
    const f = files.get(u.pathname.split('/').pop());
    return f ? new Response(f, { status: 200 }) : new Response('nf', { status: 404 });
  }
  if (u.pathname.startsWith('/storage/v1/object/')) {
    files.set(u.pathname.split('/').pop(), opts.body);
    return json(200, { Key: 'ok' });
  }
  throw new Error('unexpected ' + url);
};

process.env.SUPABASE_URL = 'https://x.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJtest';
process.env.ADMIN_EMAIL = 'dono@loja.test';
process.env.ADMIN_PASSWORD = 'senha-forte-1';
const { handle } = await import(`${ROOT}/server/handler.js`);

let cookie = '';
async function call(method, path, body) {
  const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
  Object.assign(req, { method, url: path, headers: { cookie, 'x-forwarded-for': '1.1.1.1' } });
  const res = { statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b; } };
  await handle(req, res);
  if (res.headers['set-cookie']) cookie = res.headers['set-cookie'].split(';')[0];
  const isJson = (res.headers['content-type'] || '').includes('json');
  return { status: res.statusCode, data: isJson ? JSON.parse(res.body) : res.body };
}

const cat = await call('GET', '/api/public/catalog');
assert.equal(cat.status, 200, JSON.stringify(cat.data));
assert.equal(cat.data.products.length, 10);
assert.equal(typeof cat.data.products[0].price, 'number');
console.log('seed ok, produtos:', cat.data.products.length);

// pedidos simultâneos
const results = await Promise.all([1, 2, 3, 4].map((i) => call('POST', '/api/public/orders', {
  customer: { name: `Cliente ${i}`, phone: `6399999000${i}` }, items: [{ productId: 'caneca-magica', qty: 1 }], coupon: '', delivery: 'retirada',
})));
results.forEach((r) => assert.equal(r.status, 201, JSON.stringify(r.data)));
const numbers = results.map((r) => r.data.number).sort();
assert.deepEqual(numbers, [1001, 1002, 1003, 1004]);
console.log('pedidos simultâneos ok', numbers, 'rpc calls', rpcCalls);

assert.equal((await call('POST', '/api/auth/login', { email: 'dono@loja.test', password: 'senha-forte-1' })).status, 200);
const prod = await call('POST', '/api/admin/products', { name: 'Caneca Teste', price: 30, costPrice: 10, active: true, trackStock: true, stock: 3, categoryId: 'cat-canecas' });
assert.equal(prod.status, 201, JSON.stringify(prod.data));
const sale = await call('POST', '/api/admin/orders', { origin: 'pdv', items: [{ productId: prod.data.id, qty: 2 }], paid: true, paymentMethod: 'Pix' });
assert.equal(sale.status, 201, JSON.stringify(sale.data));
let d = (await call('GET', '/api/admin/data?c=products,finance,stock,orders,settings,categories')).data;
assert.equal(d.products.find((p) => p.id === prod.data.id).stock, 1);
assert.equal(d.finance.length, 1);
assert.equal(d.finance[0].amount, 60);
assert.equal(d.orders.length, 5);
assert.equal(d.settings.storeName, 'Canecaria Panda');
assert.equal(d.categories.find((c) => c.id === 'cat-canecas').order, 1);
await call('POST', `/api/admin/orders/${sale.data.id}/status`, { status: 'cancelado' });
d = (await call('GET', '/api/admin/data?c=products,finance,stock')).data;
assert.equal(d.products.find((p) => p.id === prod.data.id).stock, 3);
assert.equal(d.finance.length, 0);
assert.equal(d.stock.length, 2);
assert.equal((await call('DELETE', `/api/admin/products/${prod.data.id}`)).status, 200);
const s = await call('PUT', '/api/admin/settings', { whatsapp: '(63) 99999-1234' });
assert.equal(s.data.whatsapp, '(63) 99999-1234');
const up = await call('POST', '/api/admin/upload', { data: 'data:image/png;base64,iVBORw0KGgo=' });
assert.equal(up.status, 201);
const f = await call('GET', `/api/files/${up.data.file}`);
assert.equal(f.status, 200);
const tables = await db.query(`select (select count(*) from pedidos) p, (select count(*) from clientes) c, (select count(*) from administradores) a, (select revisao from versao_dados) r`);
console.log('banco:', tables.rows[0]);
console.log('TUDO OK');
