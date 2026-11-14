import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useShop } from '../../lib/shop.jsx';
import { ProductCard, Spinner, Icon } from '../../components/ui.jsx';
import { normalize } from '../../lib/format.js';

export default function Products() {
  const { slug } = useParams();
  const { catalog, products, categories } = useShop();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('destaque');
  const category = categories.find((c) => c.slug === slug);
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));

  const list = useMemo(() => {
    let l = products;
    if (category) l = l.filter((p) => p.categoryId === category.id);
    if (q.trim()) {
      const n = normalize(q);
      l = l.filter((p) => normalize(`${p.name} ${p.description}`).includes(n));
    }
    const sorted = [...l];
    if (sort === 'menor') sorted.sort((a, b) => a.price - b.price);
    else if (sort === 'maior') sorted.sort((a, b) => b.price - a.price);
    else if (sort === 'nome') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => Number(b.featured) - Number(a.featured));
    return sorted;
  }, [products, category, q, sort]);

  if (!catalog) return <Spinner />;
  const used = categories.filter((c) => products.some((p) => p.categoryId === c.id));

  return (
    <div className="container-site pt-10">
      <h1 className="text-5xl font-extrabold sm:text-6xl">{category ? category.name : 'Todos os produtos'}</h1>
      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex flex-wrap gap-2" aria-label="Categorias">
          <Link to="/produtos" className={`rounded-full px-4 py-2 font-semibold ${!category ? 'bg-ink text-paper' : 'bg-porcelain hover:bg-porcelain-dark'}`}>Todos</Link>
          {used.map((c) => (
            <Link key={c.id} to={`/categorias/${c.slug}`} className={`rounded-full px-4 py-2 font-semibold ${category?.id === c.id ? 'bg-ink text-paper' : 'bg-porcelain hover:bg-porcelain-dark'}`}>{c.name}</Link>
          ))}
        </nav>
        <div className="flex gap-2">
          <label className="relative flex-1 lg:w-64">
            <span className="sr-only">Buscar produto</span>
            <Icon.search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input className="input pl-11" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label>
            <span className="sr-only">Ordenar</span>
            <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="destaque">Destaques primeiro</option>
              <option value="menor">Menor preço</option>
              <option value="maior">Maior preço</option>
              <option value="nome">Nome</option>
            </select>
          </label>
        </div>
      </div>
      {list.length ? (
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => <ProductCard key={p.id} product={p} category={catById[p.categoryId]} />)}
        </div>
      ) : (
        <div className="mt-10 rounded-[var(--radius-blob)] bg-porcelain px-6 py-14 text-center">
          <p className="font-display text-2xl font-bold">Nenhum produto encontrado</p>
          <p className="mt-2 text-muted">Tente outra palavra ou veja todas as categorias.</p>
          {q ? <button type="button" className="btn-primary mt-5" onClick={() => setQ('')}>Limpar busca</button> : null}
        </div>
      )}
    </div>
  );
}
