import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, fileUrl, resizeImage } from '../../lib/api.js';
import { useAdmin, PageHeader, Table, SearchInput, Empty, Toggle, MoneyInput } from './common.jsx';
import { Field, Modal, Notice, ProductImage } from '../../components/ui.jsx';
import { ProductArt, ART_KINDS } from '../../components/Art.jsx';
import { money, normalize } from '../../lib/format.js';

const blank = {
  name: '', categoryId: '', sku: '', price: '', costPrice: '', description: '', images: [],
  art: { kind: 'caneca', color: '#ffffff', accent: '' }, active: true, featured: false,
  customizable: true, customLabel: '', trackStock: false, stock: 0, minStock: 0,
};

function ProductForm({ product, onClose }) {
  const { data, run } = useAdmin();
  const [f, setF] = useState(() => (product ? { ...blank, ...product, art: { ...blank.art, ...product.art } } : { ...blank, categoryId: data.categories[0]?.id || '' }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const margin = f.price && f.costPrice ? ((f.price - f.costPrice) / f.price) * 100 : null;

  async function upload(files) {
    setUploading(true);
    setError('');
    try {
      for (const file of files) {
        const dataUrl = await resizeImage(file);
        const r = await api('admin/upload', { method: 'POST', body: { data: dataUrl } });
        setF((x) => ({ ...x, images: [...x.images, r.file] }));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await run(() => (product ? api(`admin/products/${product.id}`, { method: 'PUT', body: f }) : api('admin/products', { method: 'POST', body: f })), product ? 'Produto salvo' : 'Produto criado');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={product ? 'Editar produto' : 'Novo produto'} wide
      footer={<><button type="button" className="btn-soft" onClick={onClose}>Cancelar</button><button form="product-form" className="btn-primary" disabled={busy || uploading}>{busy ? 'Salvando…' : 'Salvar produto'}</button></>}>
      <form id="product-form" onSubmit={save} className="grid gap-6 md:grid-cols-[1fr_220px]">
        <div className="space-y-4">
          <Field label="Nome"><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} required /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoria">
              <select className="input" value={f.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                <option value="">Sem categoria</option>
                {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Código interno (opcional)"><input className="input" value={f.sku} onChange={(e) => set('sku', e.target.value)} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Preço de venda"><MoneyInput value={f.price} onChange={(v) => set('price', v)} /></Field>
            <Field label="Custo" hint={margin != null ? `Margem de ${margin.toFixed(0)}%` : 'Usado no cálculo de lucro'}><MoneyInput value={f.costPrice} onChange={(v) => set('costPrice', v)} /></Field>
          </div>
          <Field label="Descrição"><textarea className="input min-h-28" value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
          <div className="space-y-3 rounded-2xl bg-porcelain p-4">
            <Toggle checked={f.active} onChange={(v) => set('active', v)} label="Mostrar na loja" />
            <Toggle checked={f.featured} onChange={(v) => set('featured', v)} label="Destaque na página inicial" />
            <Toggle checked={f.customizable} onChange={(v) => set('customizable', v)} label="Cliente escreve a personalização" />
            {f.customizable ? <Field label="Pergunta para o cliente"><input className="input" value={f.customLabel} placeholder="Nome ou frase para personalizar" onChange={(e) => set('customLabel', e.target.value)} /></Field> : null}
            <Toggle checked={f.trackStock} onChange={(v) => set('trackStock', v)} label="Controlar estoque" hint="Para produtos prontos. Peças feitas sob encomenda podem ficar sem controle." />
            {f.trackStock ? (
              <div className="grid grid-cols-2 gap-3">
                {!product ? <Field label="Estoque inicial"><input className="input" type="number" min="0" value={f.stock} onChange={(e) => set('stock', e.target.value)} /></Field>
                  : <Field label="Estoque atual" hint="Ajuste na tela Estoque"><input className="input" disabled value={product.stock} /></Field>}
                <Field label="Avisar abaixo de"><input className="input" type="number" min="0" value={f.minStock} onChange={(e) => set('minStock', e.target.value)} /></Field>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="field-label">Fotos</p>
            <div className="grid grid-cols-2 gap-2">
              {f.images.map((img, i) => (
                <div key={img} className="group relative aspect-square overflow-hidden rounded-xl bg-porcelain">
                  <img src={fileUrl(img)} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => set('images', f.images.filter((x) => x !== img))} className="absolute right-1 top-1 rounded-full bg-ink px-2 text-sm text-paper" aria-label={`Remover foto ${i + 1}`}>×</button>
                  {i === 0 ? <span className="absolute bottom-1 left-1 rounded-full bg-paper px-2 text-xs font-semibold">Capa</span> : null}
                </div>
              ))}
              <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-center text-sm font-semibold text-muted hover:border-ink hover:text-ink">
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { upload([...e.target.files]); e.target.value = ''; }} />
                {uploading ? 'Enviando…' : 'Adicionar foto'}
              </label>
            </div>
          </div>
          {!f.images.length ? (
            <div>
              <p className="field-label">Ilustração enquanto não há foto</p>
              <div className="aspect-[10/9] rounded-2xl bg-porcelain"><ProductArt art={f.art} className="h-full w-full p-4" /></div>
              <select className="input mt-2" value={f.art.kind} onChange={(e) => set('art', { ...f.art, kind: e.target.value })} aria-label="Tipo de ilustração">
                {ART_KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <div className="mt-2 flex items-center gap-3 text-sm">
                <label className="flex items-center gap-2">Cor <input type="color" value={f.art.color} onChange={(e) => set('art', { ...f.art, color: e.target.value })} /></label>
                {f.art.kind === 'caneca' ? <label className="flex items-center gap-2">Alça <input type="color" value={f.art.accent || f.art.color} onChange={(e) => set('art', { ...f.art, accent: e.target.value })} /></label> : null}
              </div>
            </div>
          ) : null}
        </div>
        <Notice className="md:col-span-2">{error}</Notice>
      </form>
    </Modal>
  );
}

export default function Products() {
  const { data, run } = useAdmin();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [editing, setEditing] = useState(null);
  useEffect(() => {
    if (params.get('novo')) { setEditing('new'); setParams({}, { replace: true }); }
  }, [params, setParams]);
  const catName = Object.fromEntries(data.categories.map((c) => [c.id, c.name]));
  const list = useMemo(() => {
    let l = [...data.products].sort((a, b) => a.name.localeCompare(b.name));
    if (cat) l = l.filter((p) => p.categoryId === cat);
    if (q.trim()) l = l.filter((p) => normalize(`${p.name} ${p.sku}`).includes(normalize(q)));
    return l;
  }, [data.products, q, cat]);

  return (
    <>
      <PageHeader title="Produtos" description={`${data.products.length} produto(s), ${data.products.filter((p) => p.active).length} na loja.`}>
        <button type="button" className="btn-primary" onClick={() => setEditing('new')}>Novo produto</button>
      </PageHeader>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar produto" />
        <select className="input sm:w-56" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {list.length ? (
        <Table head={['Produto', 'Categoria', { label: 'Preço', right: true }, { label: 'Custo', right: true }, 'Estoque', 'Loja', '']}>
          {list.map((p) => (
            <tr key={p.id} className="hover:bg-porcelain">
              <td className="px-4 py-2.5">
                <button type="button" onClick={() => setEditing(p)} className="flex items-center gap-3 text-left">
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-porcelain"><ProductImage product={p} /></span>
                  <span className="font-semibold hover:underline">{p.name}{p.featured ? <span className="ml-2 rounded-full bg-orange-soft px-2 py-0.5 text-xs text-orange-dark">Destaque</span> : null}</span>
                </button>
              </td>
              <td className="px-4 py-2.5">{catName[p.categoryId] || '—'}</td>
              <td className="px-4 py-2.5 text-right font-semibold">{money(p.price)}</td>
              <td className="px-4 py-2.5 text-right text-muted">{p.costPrice ? money(p.costPrice) : '—'}</td>
              <td className="px-4 py-2.5">{p.trackStock ? <span className={p.stock <= (p.minStock || 0) ? 'font-semibold text-danger' : ''}>{p.stock} un.</span> : <span className="text-muted">Sob encomenda</span>}</td>
              <td className="px-4 py-2.5">
                <button type="button" onClick={() => run(() => api(`admin/products/${p.id}`, { method: 'PUT', body: { active: !p.active } }), p.active ? 'Produto escondido da loja' : 'Produto visível na loja').catch(() => {})}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${p.active ? 'bg-bamboo-soft text-bamboo' : 'bg-porcelain-dark text-muted'}`}>{p.active ? 'Visível' : 'Escondido'}</button>
              </td>
              <td className="px-4 py-2.5 text-right">
                <button type="button" className="text-sm font-semibold text-muted hover:text-danger"
                  onClick={() => window.confirm(`Apagar "${p.name}"? Pedidos antigos continuam com o nome do produto.`) && run(() => api(`admin/products/${p.id}`, { method: 'DELETE' }), 'Produto apagado').catch(() => {})}>Apagar</button>
              </td>
            </tr>
          ))}
        </Table>
      ) : <Empty title="Nenhum produto" text="Cadastre o primeiro produto da loja."><button type="button" className="btn-primary" onClick={() => setEditing('new')}>Novo produto</button></Empty>}
      {editing ? <ProductForm product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}
