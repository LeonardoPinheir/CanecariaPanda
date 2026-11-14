// API da loja: um único ponto de entrada (/api/...) usado pela Vercel e pelo
// servidor de desenvolvimento.

import { getStore, StoreError, COLLECTIONS } from './store.js';
import {
  placeOrder, setStatus, setPaid, adjustStock, checkCoupon, publicOrder, publicProduct,
  PUBLIC_SETTINGS, uid, money, uniqueSlug, onlyDigits, deliveryFee,
} from './logic.js';
import {
  hashPassword, checkPassword, makeSessionCookie, clearSessionCookie, readSession,
  tooManyAttempts, registerFailure, clearFailures,
} from './auth.js';

const DEMO_PASSWORD = 'panda1234';
// A senha de demonstração só vale fora de produção e sem GitHub configurado.
const demoAllowed = (store) => store.kind === 'memory' && process.env.VERCEL_ENV !== 'production';

function send(res, status, body, headers = {}) {
  res.statusCode = status;
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  if (Buffer.isBuffer(body)) return res.end(body);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', headers['Cache-Control'] || 'no-store');
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};
    if (Buffer.isBuffer(req.body)) return req.body.length ? JSON.parse(req.body.toString()) : {};
    return req.body || {};
  }
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 6 * 1024 * 1024) throw new StoreError('Envio muito grande.', 413);
    chunks.push(c);
  }
  const text = Buffer.concat(chunks).toString();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new StoreError('Corpo da requisição inválido.');
  }
}

const isSecure = (req) => (req.headers['x-forwarded-proto'] || '').includes('https');
const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const bool = (v) => v === true || v === 'true' || v === 1;
const num = (v) => money(v);
const now = () => new Date().toISOString();

// ------------------------------------------------------------ cadastros
const SANITIZE = {
  categories: (b) => ({ name: str(b.name, 60), order: Math.trunc(Number(b.order) || 0) }),
  products: (b) => ({
    name: str(b.name, 120), categoryId: str(b.categoryId, 60), sku: str(b.sku, 40),
    price: num(b.price), costPrice: num(b.costPrice), description: str(b.description, 3000),
    images: Array.isArray(b.images) ? b.images.map((i) => str(i, 120)).filter(Boolean).slice(0, 8) : [],
    art: b.art && typeof b.art === 'object'
      ? { kind: str(b.art.kind, 20) || 'caneca', color: str(b.art.color, 9) || '#ffffff', accent: str(b.art.accent, 9) }
      : { kind: 'caneca', color: '#ffffff' },
    active: bool(b.active), featured: bool(b.featured), customizable: bool(b.customizable),
    customLabel: str(b.customLabel, 80), trackStock: bool(b.trackStock),
    minStock: Math.max(0, Math.trunc(Number(b.minStock) || 0)),
  }),
  customers: (b) => ({
    name: str(b.name, 120), phone: str(b.phone, 30), email: str(b.email, 120), address: str(b.address, 300),
    city: str(b.city, 80), birthday: str(b.birthday, 10), notes: str(b.notes, 2000), document: str(b.document, 30),
  }),
  coupons: (b) => ({
    code: str(b.code, 30).toUpperCase().replace(/\s+/g, ''), type: b.type === 'fixed' ? 'fixed' : 'percent',
    value: num(b.value), minTotal: num(b.minTotal), active: bool(b.active), expiresAt: str(b.expiresAt, 10),
    maxUses: Math.max(0, Math.trunc(Number(b.maxUses) || 0)),
  }),
  finance: (b) => ({
    type: b.type === 'despesa' ? 'despesa' : 'receita', category: str(b.category, 60),
    description: str(b.description, 200), amount: Math.abs(num(b.amount)), date: str(b.date, 10) || now().slice(0, 10),
    paid: bool(b.paid), method: str(b.method, 40), notes: str(b.notes, 500),
  }),
};

function validate(collection, item, draft, id) {
  if (collection === 'categories' && !item.name) throw new StoreError('Dê um nome à categoria.');
  if (collection === 'products') {
    if (!item.name) throw new StoreError('Dê um nome ao produto.');
    if (!(item.price > 0)) throw new StoreError('Informe o preço de venda.');
  }
  if (collection === 'customers' && !item.name) throw new StoreError('Informe o nome do cliente.');
  if (collection === 'coupons') {
    if (!item.code) throw new StoreError('Informe o código do cupom.');
    if (!(item.value > 0)) throw new StoreError('Informe o valor do desconto.');
    if (item.type === 'percent' && item.value > 100) throw new StoreError('O desconto em porcentagem vai até 100%.');
    if (draft.coupons.some((c) => c.code === item.code && c.id !== id)) throw new StoreError('Já existe um cupom com esse código.');
  }
  if (collection === 'finance') {
    if (!item.description) throw new StoreError('Descreva o lançamento.');
    if (!(item.amount > 0)) throw new StoreError('Informe o valor.');
  }
}

const PREFIX = { categories: 'cat', products: 'prod', customers: 'cli', coupons: 'cup', finance: 'fin' };

// ------------------------------------------------------------ rotas
export async function handle(req, res) {
  const url = new URL(req.url, 'http://local');
  const routed = url.searchParams.get('__path');
  const path = routed != null && url.pathname.startsWith('/api/index') ? routed : url.pathname.replace(/^\/api\/?/, '');
  const parts = path.split('/').filter(Boolean);
  const method = req.method;
  const store = getStore();

  try {
    // ---------- arquivos (imagens de produtos)
    if (parts[0] === 'files' && parts[1] && method === 'GET') {
      const name = parts[1];
      if (!/^[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i.test(name)) return send(res, 404, { error: 'Arquivo não encontrado.' });
      const file = await store.getFile(`files/${name}`);
      if (!file) return send(res, 404, { error: 'Arquivo não encontrado.' });
      const ext = name.split('.').pop().toLowerCase();
      const type = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext];
      return send(res, 200, file.buffer, { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable' });
    }

    // ---------- público
    if (parts[0] === 'public') {
      if (parts[1] === 'catalog' && method === 'GET') {
        const d = await store.read(['settings', 'categories', 'products']);
        const settings = Object.fromEntries(PUBLIC_SETTINGS.map((k) => [k, d.settings[k]]));
        return send(res, 200, {
          settings,
          categories: [...d.categories].sort((a, b) => (a.order || 0) - (b.order || 0)),
          products: d.products.filter((p) => p.active).map(publicProduct),
        }, { 'Cache-Control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=60' });
      }
      if (parts[1] === 'coupon' && method === 'POST') {
        const b = await readBody(req);
        const d = await store.read(['coupons', 'settings']);
        const r = checkCoupon(d.coupons, b.code, money(b.subtotal));
        if (!r) throw new StoreError('Informe um cupom.');
        return send(res, 200, { code: r.coupon.code, discount: r.discount, type: r.coupon.type, value: r.coupon.value });
      }
      if (parts[1] === 'orders' && method === 'POST') {
        const b = await readBody(req);
        if (b.website) throw new StoreError('Pedido recusado.'); // armadilha para robôs
        const order = await store.transaction(
          ['settings', 'products', 'customers', 'orders', 'coupons', 'finance', 'stock'],
          (d) => placeOrder(d, {
            customer: { name: str(b.customer?.name, 120), phone: str(b.customer?.phone, 30), email: str(b.customer?.email, 120) },
            items: b.items, coupon: str(b.coupon, 30), delivery: b.delivery, address: str(b.address, 300),
            paymentMethod: str(b.paymentMethod, 40), notes: str(b.notes, 1000),
          }, { origin: 'site' }),
          'Novo pedido pelo site',
        );
        return send(res, 201, publicOrder(order));
      }
      if (parts[1] === 'track' && method === 'GET') {
        const code = str(url.searchParams.get('code'), 20).toUpperCase().replace(/^#/, '');
        const d = await store.read(['orders']);
        const order = d.orders.find((o) => o.code === code);
        if (!order) throw new StoreError('Não encontramos um pedido com esse código. Confira as letras e números.', 404);
        return send(res, 200, publicOrder(order));
      }
      if (parts[1] === 'my-orders' && method === 'POST') {
        const b = await readBody(req);
        const phone = onlyDigits(b.phone);
        const code = str(b.code, 20).toUpperCase();
        const d = await store.read(['orders']);
        const key = d.orders.find((o) => o.code === code && onlyDigits(o.customer?.phone) === phone);
        if (!phone || !key) throw new StoreError('WhatsApp e código não combinam com nenhum pedido.', 404);
        const mine = d.orders.filter((o) => onlyDigits(o.customer?.phone) === phone)
          .sort((a, b2) => b2.createdAt.localeCompare(a.createdAt));
        return send(res, 200, { name: key.customer.name, orders: mine.map(publicOrder) });
      }
      if (parts[1] === 'shipping' && method === 'POST') {
        const b = await readBody(req);
        const d = await store.read(['settings']);
        return send(res, 200, { shipping: deliveryFee(d.settings, b.delivery, money(b.subtotal)) });
      }
    }

    // ---------- login
    if (parts[0] === 'auth') {
      if (parts[1] === 'me' && method === 'GET') {
        const s = readSession(req.headers.cookie);
        const d = await store.read(['admins']);
        const admin = s && d.admins.find((a) => a.email === s.email);
        return send(res, 200, {
          user: admin ? { email: admin.email, name: admin.name } : null,
          mode: store.kind,
          firstAccess: d.admins.length === 0,
          demoHint: demoAllowed(store) ? { email: process.env.ADMIN_EMAIL || 'admin@canecariapanda.com.br', password: DEMO_PASSWORD } : null,
        });
      }
      if (parts[1] === 'login' && method === 'POST') {
        const ip = clientIp(req);
        if (tooManyAttempts(ip)) throw new StoreError('Muitas tentativas. Espere 15 minutos e tente de novo.', 429);
        const b = await readBody(req);
        const email = str(b.email, 120).toLowerCase();
        const password = String(b.password || '');
        const admin = await store.transaction(['admins'], (d) => {
          if (d.admins.length === 0) {
            const firstEmail = (process.env.ADMIN_EMAIL || 'admin@canecariapanda.com.br').toLowerCase();
            const firstPassword = process.env.ADMIN_PASSWORD || (demoAllowed(store) ? DEMO_PASSWORD : '');
            if (!firstPassword) throw new StoreError('Primeiro acesso: cadastre a variável ADMIN_PASSWORD na Vercel e publique de novo.', 503);
            if (email !== firstEmail || password !== firstPassword) return null;
            const a = { email, name: 'Administrador', ...hashPassword(password), createdAt: now() };
            d.admins.push(a);
            return a;
          }
          const a = d.admins.find((x) => x.email === email);
          return a && checkPassword(password, a) ? a : null;
        }, 'Primeiro acesso ao painel');
        if (!admin) {
          registerFailure(ip);
          throw new StoreError('E-mail ou senha incorretos.', 401);
        }
        clearFailures(ip);
        return send(res, 200, { user: { email: admin.email, name: admin.name } }, { 'Set-Cookie': makeSessionCookie(admin.email, isSecure(req)) });
      }
      if (parts[1] === 'logout' && method === 'POST') {
        return send(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie(isSecure(req)) });
      }
    }

    // ---------- painel (exige login)
    if (parts[0] === 'admin') {
      const session = readSession(req.headers.cookie);
      if (!session) throw new StoreError('Entre no painel para continuar.', 401);
      const { admins } = await store.read(['admins']);
      const me = admins.find((a) => a.email === session.email);
      if (!me) throw new StoreError('Entre no painel para continuar.', 401);
      return await adminRoutes(req, res, parts.slice(1), method, url, store, me);
    }

    return send(res, 404, { error: 'Rota não encontrada.' });
  } catch (e) {
    const status = e instanceof StoreError ? (e.github ? 502 : e.status) : 500;
    if (status >= 500) console.error(e);
    const message = e instanceof StoreError && !e.github ? e.message : 'Erro no servidor. Tente de novo em instantes.';
    return send(res, status, { error: message });
  }
}

async function adminRoutes(req, res, parts, method, url, store, me) {
  const [resource, id, action] = parts;

  if (resource === 'data' && method === 'GET') {
    const wanted = (url.searchParams.get('c') || '').split(',').filter((c) => COLLECTIONS.includes(c) && c !== 'admins');
    const d = await store.read(wanted);
    return send(res, 200, d);
  }

  if (resource === 'settings' && method === 'PUT') {
    const b = await readBody(req);
    const settings = await store.transaction(['settings'], (d) => {
      const s = d.settings;
      for (const k of ['storeName', 'tagline', 'heroTitle', 'heroText', 'whatsapp', 'instagram', 'email', 'address', 'hours', 'pixKey', 'pixName', 'productionDays', 'about']) {
        if (k in b) s[k] = str(b[k], k === 'about' || k === 'heroText' ? 1500 : 200);
      }
      for (const k of ['deliveryFee', 'freeDeliveryFrom']) if (k in b) s[k] = money(b[k]);
      for (const k of ['allowPickup', 'allowDelivery']) if (k in b) s[k] = bool(b[k]);
      if (Array.isArray(b.paymentMethods)) s.paymentMethods = b.paymentMethods.map((m) => str(m, 40)).filter(Boolean).slice(0, 12);
      if (Array.isArray(b.services)) s.services = b.services.map((x) => ({ title: str(x.title, 80), text: str(x.text, 400) })).filter((x) => x.title).slice(0, 20);
      if (b.financeCategories) {
        s.financeCategories = {
          receita: (b.financeCategories.receita || []).map((x) => str(x, 60)).filter(Boolean),
          despesa: (b.financeCategories.despesa || []).map((x) => str(x, 60)).filter(Boolean),
        };
      }
      return s;
    }, 'Atualiza configurações da loja');
    return send(res, 200, settings);
  }

  if (resource === 'upload' && method === 'POST') {
    const b = await readBody(req);
    const match = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(b.data || '');
    if (!match) throw new StoreError('Envie uma imagem JPG, PNG ou WebP.');
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 3 * 1024 * 1024) throw new StoreError('A imagem passou de 3 MB.');
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const name = `${uid('img')}.${ext}`;
    await store.putFile(`files/${name}`, buffer, `image/${match[1]}`);
    return send(res, 201, { file: name });
  }

  if (resource === 'stock' && method === 'POST') {
    const b = await readBody(req);
    const product = await store.transaction(['products', 'stock'], (d) => adjustStock(d, str(b.productId, 60), b.qty, str(b.reason, 120)), 'Movimenta estoque');
    return send(res, 200, product);
  }

  if (resource === 'orders') {
    const ALL = ['settings', 'products', 'customers', 'orders', 'coupons', 'finance', 'stock'];
    if (!id && method === 'POST') {
      const b = await readBody(req);
      const order = await store.transaction(ALL, (d) => placeOrder(d, {
        customer: { customerId: str(b.customer?.id, 60), name: str(b.customer?.name, 120), phone: str(b.customer?.phone, 30), email: str(b.customer?.email, 120) },
        items: b.items, coupon: str(b.coupon, 30), delivery: b.delivery, address: str(b.address, 300),
        paymentMethod: str(b.paymentMethod, 40), notes: str(b.notes, 1000), paid: bool(b.paid),
        manualDiscount: money(b.manualDiscount), dueDate: str(b.dueDate, 10),
      }, { origin: b.origin === 'pdv' ? 'pdv' : 'painel', allowInactive: true }), 'Novo pedido pelo painel');
      return send(res, 201, order);
    }
    if (id && action === 'status' && method === 'POST') {
      const b = await readBody(req);
      return send(res, 200, await store.transaction(ALL, (d) => setStatus(d, id, b.status, b.note), 'Atualiza status do pedido'));
    }
    if (id && action === 'paid' && method === 'POST') {
      const b = await readBody(req);
      return send(res, 200, await store.transaction(['orders', 'finance'], (d) => setPaid(d, id, bool(b.paid), str(b.method, 40)), 'Atualiza pagamento do pedido'));
    }
    if (id && !action && method === 'PUT') {
      const b = await readBody(req);
      return send(res, 200, await store.transaction(['orders'], (d) => {
        const o = d.orders.find((x) => x.id === id);
        if (!o) throw new StoreError('Pedido não encontrado.', 404);
        if ('notes' in b) o.notes = str(b.notes, 1000);
        if ('dueDate' in b) o.dueDate = str(b.dueDate, 10);
        if ('address' in b) o.address = str(b.address, 300);
        o.updatedAt = now();
        return o;
      }, 'Edita pedido'));
    }
  }

  if (resource === 'admins') {
    if (method === 'GET') {
      const { admins } = await store.read(['admins']);
      return send(res, 200, admins.map(({ email, name, createdAt }) => ({ email, name, createdAt })));
    }
    if (method === 'POST' && !id) {
      const b = await readBody(req);
      const email = str(b.email, 120).toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new StoreError('Informe um e-mail válido.');
      if (String(b.password || '').length < 8) throw new StoreError('A senha precisa ter pelo menos 8 caracteres.');
      await store.transaction(['admins'], (d) => {
        if (d.admins.some((a) => a.email === email)) throw new StoreError('Esse e-mail já tem acesso.');
        d.admins.push({ email, name: str(b.name, 80) || email, ...hashPassword(String(b.password)), createdAt: now() });
      }, 'Adiciona acesso ao painel');
      return send(res, 201, { ok: true });
    }
    if (method === 'DELETE' && id) {
      const email = decodeURIComponent(id).toLowerCase();
      if (email === me.email) throw new StoreError('Você não pode remover o próprio acesso.');
      await store.transaction(['admins'], (d) => { d.admins = d.admins.filter((a) => a.email !== email); }, 'Remove acesso ao painel');
      return send(res, 200, { ok: true });
    }
  }

  if (resource === 'password' && method === 'POST') {
    const b = await readBody(req);
    if (String(b.newPassword || '').length < 8) throw new StoreError('A nova senha precisa ter pelo menos 8 caracteres.');
    await store.transaction(['admins'], (d) => {
      const a = d.admins.find((x) => x.email === me.email);
      if (!checkPassword(String(b.currentPassword || ''), a)) throw new StoreError('A senha atual está incorreta.');
      Object.assign(a, hashPassword(String(b.newPassword)));
    }, 'Troca senha do painel');
    return send(res, 200, { ok: true });
  }

  // ---------- cadastros genéricos
  if (SANITIZE[resource]) {
    const names = resource === 'products' ? ['products', 'categories'] : resource === 'categories' ? ['categories', 'products'] : [resource];
    if (method === 'POST' && !id) {
      const b = await readBody(req);
      const item = await store.transaction(names, (d) => {
        const data = SANITIZE[resource](b);
        validate(resource, data, d);
        const t = now();
        const created = { id: uid(PREFIX[resource]), ...data, createdAt: t, updatedAt: t };
        if (resource === 'products') {
          created.slug = uniqueSlug(d.products, data.name);
          created.stock = data.trackStock ? Math.max(0, Math.trunc(Number(b.stock) || 0)) : 0;
        }
        if (resource === 'categories') created.slug = uniqueSlug(d.categories, data.name);
        if (resource === 'coupons') created.uses = 0;
        d[resource].push(created);
        return created;
      }, `Cria ${resource}`);
      return send(res, 201, item);
    }
    if (method === 'PUT' && id) {
      const b = await readBody(req);
      const item = await store.transaction(names, (d) => {
        const existing = d[resource].find((x) => x.id === id);
        if (!existing) throw new StoreError('Registro não encontrado.', 404);
        const data = SANITIZE[resource]({ ...existing, ...b });
        validate(resource, data, d, id);
        Object.assign(existing, data, { updatedAt: now() });
        if (resource === 'products' && b.name) existing.slug = uniqueSlug(d.products, data.name, id);
        if (resource === 'categories' && b.name) existing.slug = uniqueSlug(d.categories, data.name, id);
        return existing;
      }, `Atualiza ${resource}`);
      return send(res, 200, item);
    }
    if (method === 'DELETE' && id) {
      await store.transaction(names, (d) => {
        if (resource === 'categories' && d.products.some((p) => p.categoryId === id)) {
          throw new StoreError('Mova os produtos desta categoria antes de apagá-la.');
        }
        if (resource === 'finance') {
          const f = d.finance.find((x) => x.id === id);
          if (f?.orderId) throw new StoreError('Este lançamento vem de um pedido pago. Desmarque o pagamento no pedido.');
        }
        d[resource] = d[resource].filter((x) => x.id !== id);
      }, `Apaga ${resource}`);
      return send(res, 200, { ok: true });
    }
  }

  return send(res, 404, { error: 'Rota não encontrada.' });
}

