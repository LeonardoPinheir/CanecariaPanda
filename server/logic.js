// Regras de negócio da loja. Todas as funções trabalham sobre um "rascunho"
// dos dados carregados dentro de uma transação do store.

import crypto from 'node:crypto';
import { StoreError } from './store.js';

export const STATUSES = ['novo', 'confirmado', 'producao', 'pronto', 'enviado', 'entregue', 'cancelado'];

export const uid = (prefix) => `${prefix}-${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
export const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const onlyDigits = (s) => String(s || '').replace(/\D/g, '');

export function slugify(text) {
  return String(text || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'item';
}

export function uniqueSlug(list, base, ownId) {
  let slug = slugify(base);
  let i = 2;
  while (list.some((x) => x.slug === slug && x.id !== ownId)) slug = `${slugify(base)}-${i++}`;
  return slug;
}

function trackingCode(orders) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from(crypto.randomBytes(6), (b) => alphabet[b % alphabet.length]).join('');
  } while (orders.some((o) => o.code === code));
  return code;
}

export function checkCoupon(coupons, code, subtotal) {
  if (!code) return null;
  const c = coupons.find((x) => x.code.toUpperCase() === String(code).trim().toUpperCase());
  if (!c || !c.active) throw new StoreError('Cupom não encontrado ou inativo.');
  if (c.expiresAt && new Date(c.expiresAt + 'T23:59:59') < new Date()) throw new StoreError('Este cupom expirou.');
  if (c.maxUses && c.uses >= c.maxUses) throw new StoreError('Este cupom já atingiu o limite de usos.');
  if (c.minTotal && subtotal < c.minTotal) {
    throw new StoreError(`Este cupom vale para compras a partir de R$ ${c.minTotal.toFixed(2).replace('.', ',')}.`);
  }
  const discount = c.type === 'percent' ? subtotal * (c.value / 100) : c.value;
  return { coupon: c, discount: money(Math.min(discount, subtotal)) };
}

export function deliveryFee(settings, delivery, subtotalAfterDiscount) {
  if (delivery !== 'entrega') return 0;
  if (settings.freeDeliveryFrom && subtotalAfterDiscount >= settings.freeDeliveryFrom) return 0;
  return money(settings.deliveryFee || 0);
}

function upsertCustomer(draft, info) {
  const phone = onlyDigits(info.phone);
  let customer = phone ? draft.customers.find((c) => onlyDigits(c.phone) === phone) : null;
  const t = new Date().toISOString();
  if (!customer && info.customerId) customer = draft.customers.find((c) => c.id === info.customerId);
  if (customer) {
    if (info.name && !customer.name) customer.name = info.name;
    if (info.email && !customer.email) customer.email = info.email;
    if (info.address && !customer.address) customer.address = info.address;
    customer.updatedAt = t;
    return customer;
  }
  if (!info.name) return null;
  customer = {
    id: uid('cli'), name: info.name.trim(), phone: info.phone || '', email: info.email || '',
    address: info.address || '', city: '', birthday: '', notes: '', createdAt: t, updatedAt: t,
  };
  draft.customers.push(customer);
  return customer;
}

function moveStock(draft, product, qty, reason, orderId) {
  if (!product.trackStock) return;
  product.stock = (Number(product.stock) || 0) + qty;
  product.updatedAt = new Date().toISOString();
  draft.stock.push({ id: uid('mov'), productId: product.id, productName: product.name, qty, reason, orderId: orderId || '', at: new Date().toISOString() });
}

function addRevenue(draft, order) {
  if (draft.finance.some((f) => f.orderId === order.id)) return;
  draft.finance.push({
    id: uid('fin'), type: 'receita', category: 'Vendas',
    description: `Pedido #${order.number} — ${order.customer.name || 'Balcão'}`,
    amount: order.total, date: new Date().toISOString().slice(0, 10), paid: true,
    method: order.paymentMethod || '', orderId: order.id, createdAt: new Date().toISOString(),
  });
}

function removeRevenue(draft, order) {
  draft.finance = draft.finance.filter((f) => f.orderId !== order.id);
}

// Monta e grava um pedido. Os preços vêm sempre do cadastro, nunca do navegador.
export function placeOrder(draft, input, { origin = 'site', allowInactive = false } = {}) {
  const items = Array.isArray(input.items) ? input.items : [];
  if (!items.length) throw new StoreError('O carrinho está vazio.');
  const customerInfo = input.customer || {};
  if (origin === 'site') {
    if (!customerInfo.name?.trim()) throw new StoreError('Informe seu nome.');
    if (onlyDigits(customerInfo.phone).length < 10) throw new StoreError('Informe um WhatsApp com DDD.');
  }

  const lines = items.map((it) => {
    const product = draft.products.find((p) => p.id === it.productId);
    if (!product || (!product.active && !allowInactive)) throw new StoreError('Um dos produtos não está mais disponível. Atualize o carrinho.');
    const qty = Math.max(1, Math.min(999, Math.floor(Number(it.qty) || 1)));
    if (product.trackStock && (Number(product.stock) || 0) < qty) {
      throw new StoreError(`Só temos ${product.stock || 0} unidade(s) de "${product.name}" no estoque.`);
    }
    const price = origin !== 'site' && it.price != null ? money(it.price) : money(product.price);
    return {
      productId: product.id, name: product.name, price, qty,
      cost: money(product.costPrice || 0),
      custom: String(it.custom || '').slice(0, 500),
      total: money(price * qty),
    };
  });

  const subtotal = money(lines.reduce((s, l) => s + l.total, 0));
  const couponResult = checkCoupon(draft.coupons, input.coupon, subtotal);
  let discount = couponResult?.discount || 0;
  if (origin !== 'site' && input.manualDiscount) discount = money(Math.min(subtotal, discount + Number(input.manualDiscount)));
  const delivery = input.delivery === 'entrega' ? 'entrega' : 'retirada';
  if (origin === 'site' && delivery === 'entrega' && !String(input.address || '').trim()) {
    throw new StoreError('Informe o endereço de entrega.');
  }
  const shipping = origin === 'pdv' ? 0 : deliveryFee(draft.settings, delivery, subtotal - discount);
  const total = money(subtotal - discount + shipping);

  const customer = upsertCustomer(draft, { ...customerInfo, address: input.address });
  const number = draft.orders.reduce((m, o) => Math.max(m, o.number || 0), 1000) + 1;
  const t = new Date().toISOString();
  const status = origin === 'pdv' ? 'entregue' : 'novo';
  const order = {
    id: uid('ped'), number, code: trackingCode(draft.orders), origin,
    customerId: customer?.id || '',
    customer: {
      name: customer?.name || customerInfo.name || 'Cliente de balcão',
      phone: customer?.phone || customerInfo.phone || '',
      email: customer?.email || customerInfo.email || '',
    },
    items: lines, subtotal, discount, coupon: couponResult?.coupon.code || '', shipping, total,
    delivery, address: delivery === 'entrega' ? String(input.address || '').slice(0, 300) : '',
    paymentMethod: String(input.paymentMethod || '').slice(0, 40),
    paid: false, paidAt: '',
    notes: String(input.notes || '').slice(0, 1000),
    dueDate: input.dueDate || '',
    status, history: [{ status, at: t, note: origin === 'pdv' ? 'Venda no balcão' : 'Pedido recebido' }],
    createdAt: t, updatedAt: t,
  };

  for (const line of lines) {
    const product = draft.products.find((p) => p.id === line.productId);
    moveStock(draft, product, -line.qty, `Pedido #${number}`, order.id);
  }
  if (couponResult) couponResult.coupon.uses = (couponResult.coupon.uses || 0) + 1;
  draft.orders.push(order);
  if (input.paid) setPaid(draft, order.id, true, order.paymentMethod);
  return order;
}

export function setStatus(draft, orderId, status, note = '') {
  if (!STATUSES.includes(status)) throw new StoreError('Status inválido.');
  const order = draft.orders.find((o) => o.id === orderId);
  if (!order) throw new StoreError('Pedido não encontrado.', 404);
  if (order.status === status) return order;
  const wasCancelled = order.status === 'cancelado';
  if (status === 'cancelado') {
    for (const l of order.items) {
      const p = draft.products.find((x) => x.id === l.productId);
      if (p) moveStock(draft, p, l.qty, `Cancelamento do pedido #${order.number}`, order.id);
    }
    if (order.paid) { order.paid = false; order.paidAt = ''; removeRevenue(draft, order); }
  } else if (wasCancelled) {
    for (const l of order.items) {
      const p = draft.products.find((x) => x.id === l.productId);
      if (p) moveStock(draft, p, -l.qty, `Pedido #${order.number} reaberto`, order.id);
    }
  }
  order.status = status;
  order.updatedAt = new Date().toISOString();
  order.history.push({ status, at: order.updatedAt, note: String(note || '').slice(0, 300) });
  return order;
}

export function setPaid(draft, orderId, paid, method) {
  const order = draft.orders.find((o) => o.id === orderId);
  if (!order) throw new StoreError('Pedido não encontrado.', 404);
  if (paid && order.status === 'cancelado') throw new StoreError('Pedido cancelado não pode ser marcado como pago.');
  if (method) order.paymentMethod = String(method).slice(0, 40);
  order.paid = !!paid;
  order.paidAt = paid ? new Date().toISOString() : '';
  order.updatedAt = new Date().toISOString();
  if (paid) addRevenue(draft, order);
  else removeRevenue(draft, order);
  return order;
}

export function adjustStock(draft, productId, qty, reason) {
  const product = draft.products.find((p) => p.id === productId);
  if (!product) throw new StoreError('Produto não encontrado.', 404);
  const n = Math.trunc(Number(qty));
  if (!n) throw new StoreError('Informe uma quantidade diferente de zero.');
  if (!product.trackStock) product.trackStock = true;
  moveStock(draft, product, n, reason || (n > 0 ? 'Entrada manual' : 'Saída manual'));
  return product;
}

export function publicOrder(o) {
  return {
    number: o.number, code: o.code, status: o.status, createdAt: o.createdAt,
    history: o.history, delivery: o.delivery, paid: o.paid, paymentMethod: o.paymentMethod,
    items: o.items.map(({ name, qty, price, total, custom }) => ({ name, qty, price, total, custom })),
    subtotal: o.subtotal, discount: o.discount, shipping: o.shipping, total: o.total,
    customerName: (o.customer?.name || '').split(' ')[0],
  };
}

export const PUBLIC_SETTINGS = [
  'storeName', 'tagline', 'heroTitle', 'heroText', 'whatsapp', 'instagram', 'email', 'address', 'hours',
  'pixKey', 'pixName', 'deliveryFee', 'freeDeliveryFrom', 'allowPickup', 'allowDelivery', 'productionDays',
  'paymentMethods', 'about', 'services',
];

export function publicProduct(p) {
  const { costPrice, createdAt, updatedAt, minStock, ...rest } = p;
  return { ...rest, stock: p.trackStock ? p.stock : null };
}
