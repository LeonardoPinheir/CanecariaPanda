import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useAdmin, PageHeader, Empty } from './common.jsx';

export default function Categories() {
  const { data, run } = useAdmin();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState({});
  const sorted = [...data.categories].sort((a, b) => (a.order || 0) - (b.order || 0));
  const count = (id) => data.products.filter((p) => p.categoryId === id).length;

  const move = async (i, dir) => {
    const a = sorted[i];
    const b = sorted[i + dir];
    if (!b) return;
    await run(async () => {
      await api(`admin/categories/${a.id}`, { method: 'PUT', body: { order: i + dir } });
      await api(`admin/categories/${b.id}`, { method: 'PUT', body: { order: i } });
    }).catch(() => {});
  };

  return (
    <>
      <PageHeader title="Categorias" description="Organizam o catálogo da loja. A ordem aqui é a ordem no site." />
      <form className="mb-6 flex max-w-xl gap-2" onSubmit={(e) => { e.preventDefault(); run(() => api('admin/categories', { method: 'POST', body: { name, order: sorted.length } }), 'Categoria criada').then(() => setName('')).catch(() => {}); }}>
        <label className="sr-only" htmlFor="nova-cat">Nome da nova categoria</label>
        <input id="nova-cat" className="input" placeholder="Nova categoria" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn-primary" disabled={!name.trim()}>Adicionar</button>
      </form>
      {sorted.length ? (
        <ul className="max-w-2xl divide-y divide-line rounded-2xl border border-line">
          {sorted.map((c, i) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="flex flex-col">
                <button type="button" className="text-muted hover:text-ink disabled:opacity-20" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Subir ${c.name}`}>▲</button>
                <button type="button" className="text-muted hover:text-ink disabled:opacity-20" disabled={i === sorted.length - 1} onClick={() => move(i, 1)} aria-label={`Descer ${c.name}`}>▼</button>
              </div>
              {editing[c.id] != null ? (
                <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); run(() => api(`admin/categories/${c.id}`, { method: 'PUT', body: { name: editing[c.id] } }), 'Categoria renomeada').then(() => setEditing({})).catch(() => {}); }}>
                  <input className="input py-2" value={editing[c.id]} onChange={(e) => setEditing({ [c.id]: e.target.value })} aria-label="Nome da categoria" autoFocus />
                  <button className="btn-primary btn-sm">Salvar</button>
                  <button type="button" className="btn-soft btn-sm" onClick={() => setEditing({})}>Cancelar</button>
                </form>
              ) : (
                <>
                  <div className="flex-1">
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-sm text-muted">{count(c.id)} produto(s), /categorias/{c.slug}</p>
                  </div>
                  <button type="button" className="btn-soft btn-sm" onClick={() => setEditing({ [c.id]: c.name })}>Renomear</button>
                  <button type="button" className="text-sm font-semibold text-muted hover:text-danger"
                    onClick={() => window.confirm(`Apagar a categoria "${c.name}"?`) && run(() => api(`admin/categories/${c.id}`, { method: 'DELETE' }), 'Categoria apagada').catch(() => {})}>Apagar</button>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : <Empty title="Nenhuma categoria" text="Crie categorias para organizar os produtos na loja." />}
    </>
  );
}
