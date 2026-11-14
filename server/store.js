// Armazenamento dos dados da loja.
//
// Produção: arquivos JSON na branch de dados (padrão "dados") do repositório
// GitHub configurado em GITHUB_REPO, gravados com commits atômicos pela API
// Git Data do GitHub. Se dois pedidos gravarem ao mesmo tempo, a gravação
// perdedora é refeita sobre os dados mais novos.
//
// Sem GITHUB_TOKEN (desenvolvimento ou prévia), os dados ficam em memória,
// partindo do catálogo de exemplo — nada é salvo de verdade.

import { seedData } from './seed.js';

export const COLLECTIONS = [
  'settings', 'categories', 'products', 'customers', 'orders',
  'coupons', 'finance', 'stock', 'admins',
];

const ARRAY_DEFAULT = (name) => (name === 'settings' ? {} : []);
const clone = (v) => JSON.parse(JSON.stringify(v));

export class StoreError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// ---------------------------------------------------------------- memória
class MemoryDriver {
  constructor() {
    this.kind = 'memory';
    this.data = clone(seedData());
    this.files = new Map();
  }
  async read(names) {
    const out = {};
    for (const n of names) out[n] = clone(this.data[n] ?? ARRAY_DEFAULT(n));
    return out;
  }
  async transaction(names, fn, message) {
    const draft = await this.read(names);
    const result = await fn(draft);
    for (const n of names) this.data[n] = draft[n];
    return result;
  }
  async putFile(path, buffer, contentType) {
    this.files.set(path, { buffer, contentType });
  }
  async getFile(path) {
    return this.files.get(path) || null;
  }
}

// ---------------------------------------------------------------- GitHub
class GitHubDriver {
  constructor({ token, repo, branch }) {
    this.kind = 'github';
    this.token = token;
    this.repo = repo;
    this.branch = branch;
    this.blobCache = new Map(); // `${commit}:${path}` -> parsed json
    this.headCache = null; // { sha, at }
  }

  async gh(path, { method = 'GET', body, raw = false } = {}) {
    const res = await fetch(`https://api.github.com/repos/${this.repo}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'canecaria-panda',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (raw) return res;
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const err = new StoreError(`GitHub ${res.status}: ${json?.message || text}`, res.status);
      err.github = true;
      throw err;
    }
    return json;
  }

  async head({ fresh = false } = {}) {
    if (!fresh && this.headCache && Date.now() - this.headCache.at < 1500) return this.headCache.sha;
    try {
      const ref = await this.gh(`/git/ref/heads/${encodeURIComponent(this.branch)}`);
      this.headCache = { sha: ref.object.sha, at: Date.now() };
      return ref.object.sha;
    } catch (e) {
      if (e.status === 404 || e.status === 409) {
        await this.bootstrap();
        return this.head({ fresh: true });
      }
      throw e;
    }
  }

  // Cria a branch de dados (sem histórico do código) com os dados iniciais.
  async bootstrap() {
    const seed = seedData();
    const tree = await this.gh('/git/trees', {
      method: 'POST',
      body: {
        tree: [
          ...COLLECTIONS.map((n) => ({
            path: `data/${n}.json`, mode: '100644', type: 'blob',
            content: JSON.stringify(seed[n] ?? ARRAY_DEFAULT(n), null, 2) + '\n',
          })),
          { path: 'README.md', mode: '100644', type: 'blob', content: '# Dados da Canecaria Panda\n\nEsta branch guarda os dados da loja. Edite pelo painel em /admin.\n' },
        ],
      },
    });
    const commit = await this.gh('/git/commits', {
      method: 'POST', body: { message: 'Cria a branch de dados da loja', tree: tree.sha, parents: [] },
    });
    try {
      await this.gh('/git/refs', { method: 'POST', body: { ref: `refs/heads/${this.branch}`, sha: commit.sha } });
    } catch (e) {
      if (e.status !== 422) throw e; // outra instância criou antes
    }
  }

  async readAt(commit, names) {
    const out = {};
    await Promise.all(names.map(async (n) => {
      const key = `${commit}:${n}`;
      if (!this.blobCache.has(key)) {
        const res = await this.gh(`/contents/data/${n}.json?ref=${commit}`, { raw: true });
        let value = ARRAY_DEFAULT(n);
        if (res.ok) value = JSON.parse(await res.text());
        else if (res.status !== 404) throw new StoreError(`GitHub ${res.status} ao ler ${n}`, 502);
        this.blobCache.set(key, value);
        if (this.blobCache.size > 400) this.blobCache.delete(this.blobCache.keys().next().value);
      }
      out[n] = clone(this.blobCache.get(key));
    }));
    return out;
  }

  async read(names) {
    return this.readAt(await this.head(), names);
  }

  async transaction(names, fn, message = 'Atualiza dados') {
    for (let attempt = 0; attempt < 5; attempt++) {
      const parent = await this.head({ fresh: true });
      const draft = await this.readAt(parent, names);
      const before = JSON.stringify(names.map((n) => draft[n]));
      const result = await fn(draft);
      if (JSON.stringify(names.map((n) => draft[n])) === before) return result;
      const parentCommit = await this.gh(`/git/commits/${parent}`);
      const tree = await this.gh('/git/trees', {
        method: 'POST',
        body: {
          base_tree: parentCommit.tree.sha,
          tree: names.map((n) => ({
            path: `data/${n}.json`, mode: '100644', type: 'blob',
            content: JSON.stringify(draft[n], null, 2) + '\n',
          })),
        },
      });
      const commit = await this.gh('/git/commits', {
        method: 'POST', body: { message, tree: tree.sha, parents: [parent] },
      });
      try {
        await this.gh(`/git/refs/heads/${encodeURIComponent(this.branch)}`, {
          method: 'PATCH', body: { sha: commit.sha, force: false },
        });
        this.headCache = { sha: commit.sha, at: Date.now() };
        for (const n of names) this.blobCache.set(`${commit.sha}:${n}`, clone(draft[n]));
        return result;
      } catch (e) {
        if (e.status !== 422 && e.status !== 409) throw e;
        await new Promise((r) => setTimeout(r, 150 + Math.random() * 400));
      }
    }
    throw new StoreError('Muitas gravações ao mesmo tempo. Tente de novo.', 503);
  }

  async putFile(path, buffer) {
    await this.head(); // garante que a branch existe
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        await this.gh(`/contents/${path}`, {
          method: 'PUT',
          body: { message: `Envia imagem ${path}`, content: buffer.toString('base64'), branch: this.branch },
        });
        this.headCache = null;
        return;
      } catch (e) {
        if (e.status !== 409) throw e;
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    throw new StoreError('Não foi possível enviar a imagem. Tente de novo.', 503);
  }

  async getFile(path) {
    const res = await this.gh(`/contents/${path}?ref=${encodeURIComponent(this.branch)}`, { raw: true });
    if (!res.ok) return null;
    return { buffer: Buffer.from(await res.arrayBuffer()) };
  }
}

let driver;
export function getStore() {
  if (!driver) {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    driver = token && repo
      ? new GitHubDriver({ token, repo, branch: process.env.DATA_BRANCH || 'dados' })
      : new MemoryDriver();
  }
  return driver;
}

export function resetStoreForTests() {
  driver = new MemoryDriver();
  return driver;
}
