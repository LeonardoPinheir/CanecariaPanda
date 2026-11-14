// Armazenamento no Supabase (Postgres). Cada coleção da loja é uma tabela;
// as gravações passam pela função aplicar_alteracoes, que grava tudo numa
// transação só e recusa a gravação se outra chegou antes (aí refazemos).
// Tabelas e função: supabase/schema.sql.

const MAP = {
  settings: { table: 'configuracoes', key: 'id' },
  categories: { table: 'categorias', key: 'id', rename: { order: 'ordem' } },
  products: { table: 'produtos', key: 'id' },
  customers: { table: 'clientes', key: 'id' },
  orders: { table: 'pedidos', key: 'id' },
  coupons: { table: 'cupons', key: 'id' },
  finance: { table: 'financeiro', key: 'id' },
  stock: { table: 'movimentos_estoque', key: 'id' },
  admins: { table: 'administradores', key: 'email' },
};

const BUCKET = 'produtos';
const snake = (k) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const camel = (k) => k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const clone = (v) => JSON.parse(JSON.stringify(v));

function toRow(name, obj) {
  const rename = MAP[name].rename || {};
  const row = {};
  for (const [k, v] of Object.entries(obj)) row[rename[k] || snake(k)] = v;
  return row;
}

function fromRow(name, row) {
  const back = Object.fromEntries(Object.entries(MAP[name].rename || {}).map(([a, b]) => [b, a]));
  const obj = {};
  for (const [k, v] of Object.entries(row)) if (v !== null) obj[back[k] || camel(k)] = v;
  return obj;
}

export class SupabaseDriver {
  constructor({ url, key, seed, StoreError }) {
    this.kind = 'supabase';
    this.url = url.replace(/\/$/, '');
    this.key = key;
    this.seed = seed;
    this.StoreError = StoreError;
    this.seeded = null;
  }

  headers(extra = {}) {
    const h = { apikey: this.key, ...extra };
    if (!this.key.startsWith('sb_')) h.Authorization = `Bearer ${this.key}`;
    return h;
  }

  async request(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
    const res = await fetch(`${this.url}${path}`, {
      method,
      headers: this.headers({ ...(body !== undefined && !Buffer.isBuffer(body) ? { 'Content-Type': 'application/json' } : {}), ...headers }),
      body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body),
    });
    if (raw) return res;
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = text; }
    if (!res.ok) {
      const err = new this.StoreError(`Supabase ${res.status}: ${json?.message || text}`, res.status >= 500 ? 502 : res.status);
      err.github = true; // erro de infraestrutura: mostra mensagem genérica ao usuário
      err.supabaseMessage = json?.message || text;
      throw err;
    }
    return json;
  }

  async revision() {
    const rows = await this.request('/rest/v1/versao_dados?select=revisao&id=eq.1');
    if (!rows?.length) {
      throw new this.StoreError('Banco do Supabase sem a tabela de versão. Rode o arquivo supabase/schema.sql no SQL Editor.', 503);
    }
    return Number(rows[0].revisao);
  }

  async readTable(name) {
    const { table } = MAP[name];
    const out = [];
    for (let from = 0; ; from += 1000) {
      const rows = await this.request(`/rest/v1/${table}?select=*`, { headers: { Range: `${from}-${from + 999}`, 'Range-Unit': 'items' } });
      out.push(...rows);
      if (rows.length < 1000) break;
    }
    if (name === 'settings') return out[0]?.dados || {};
    return out.map((r) => fromRow(name, r));
  }

  async ensureSeed() {
    this.seeded ||= (async () => {
      const rev = await this.revision();
      if (rev > 0) return;
      const existing = await this.request('/rest/v1/configuracoes?select=id');
      if (existing.length) return;
      const seed = this.seed();
      const changes = {};
      for (const name of Object.keys(MAP)) {
        const value = seed[name];
        if (name === 'settings') changes.configuracoes = { upsert: [{ id: 1, dados: value }] };
        else if (value?.length) changes[MAP[name].table] = { upsert: value.map((x) => toRow(name, x)) };
      }
      try {
        await this.request('/rest/v1/rpc/aplicar_alteracoes', { method: 'POST', body: { p_expected: 0, p_changes: changes } });
      } catch (e) {
        if (!String(e.supabaseMessage).includes('conflito_de_versao')) throw e;
      }
    })().catch((e) => { this.seeded = null; throw e; });
    return this.seeded;
  }

  async read(names) {
    await this.ensureSeed();
    const out = {};
    await Promise.all(names.map(async (n) => { out[n] = await this.readTable(n); }));
    return out;
  }

  diff(name, before, after) {
    if (name === 'settings') {
      return JSON.stringify(before) === JSON.stringify(after) ? null : { upsert: [{ id: 1, dados: after }] };
    }
    const key = name === 'admins' ? 'email' : 'id';
    const old = new Map(before.map((x) => [x[key], JSON.stringify(x)]));
    const upsert = after.filter((x) => old.get(x[key]) !== JSON.stringify(x)).map((x) => toRow(name, x));
    const keep = new Set(after.map((x) => x[key]));
    const del = before.filter((x) => !keep.has(x[key])).map((x) => String(x[key]));
    return upsert.length || del.length ? { upsert, delete: del } : null;
  }

  async transaction(names, fn) {
    await this.ensureSeed();
    for (let attempt = 0; attempt < 6; attempt++) {
      const rev = await this.revision();
      const before = {};
      await Promise.all(names.map(async (n) => { before[n] = await this.readTable(n); }));
      const draft = clone(before);
      const result = await fn(draft);
      const changes = {};
      for (const n of names) {
        const d = this.diff(n, before[n], draft[n]);
        if (d) changes[MAP[n].table] = d;
      }
      if (!Object.keys(changes).length) return result;
      try {
        await this.request('/rest/v1/rpc/aplicar_alteracoes', { method: 'POST', body: { p_expected: rev, p_changes: changes } });
        return result;
      } catch (e) {
        if (!String(e.supabaseMessage).includes('conflito_de_versao')) throw e;
        await new Promise((r) => setTimeout(r, 100 + Math.random() * 300));
      }
    }
    throw new this.StoreError('Muitas gravações ao mesmo tempo. Tente de novo.', 503);
  }

  async putFile(path, buffer, contentType) {
    const name = path.replace(/^files\//, '');
    await this.request(`/storage/v1/object/${BUCKET}/${name}`, {
      method: 'POST', body: buffer, headers: { 'Content-Type': contentType || 'application/octet-stream', 'x-upsert': 'true' },
    });
  }

  async getFile(path) {
    const name = path.replace(/^files\//, '');
    const res = await this.request(`/storage/v1/object/public/${BUCKET}/${name}`, { raw: true });
    if (!res.ok) return null;
    return { buffer: Buffer.from(await res.arrayBuffer()) };
  }
}
