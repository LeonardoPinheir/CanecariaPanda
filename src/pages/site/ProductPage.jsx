import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useShop } from '../../lib/shop.jsx';
import { ProductImage, ProductCard, QtyInput, Spinner, Icon } from '../../components/ui.jsx';
import { ProductArt } from '../../components/Art.jsx';
import { fileUrl } from '../../lib/api.js';
import { money, whatsappLink } from '../../lib/format.js';

export default function ProductPage() {
  const { slug } = useParams();
  const { catalog, products, categories, add, settings } = useShop();
  const product = products.find((p) => p.slug === slug);
  const [qty, setQty] = useState(1);
  const [custom, setCustom] = useState('');
  const [img, setImg] = useState(0);
  useEffect(() => { setQty(1); setCustom(''); setImg(0); }, [slug]);
  useEffect(() => { if (product) document.title = `${product.name} | Canecaria Panda`; return () => { document.title = 'Canecaria Panda | Personalizados com amor'; }; }, [product]);

  if (!catalog) return <Spinner />;
  if (!product) {
    return (
      <div className="container-site py-20">
        <h1 className="text-4xl font-extrabold">Produto não encontrado</h1>
        <p className="mt-3 text-muted">Ele pode ter saído do catálogo.</p>
        <Link to="/produtos" className="btn-primary mt-6">Ver todos os produtos</Link>
      </div>
    );
  }
  const category = categories.find((c) => c.id === product.categoryId);
  const soldOut = product.trackStock && product.stock <= 0;
  const maxQty = product.trackStock ? product.stock : 999;
  const related = products.filter((p) => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 4);
  const wa = whatsappLink(settings.whatsapp, `Olá! Tenho uma dúvida sobre o produto "${product.name}".`);
  const images = product.images || [];

  return (
    <div className="container-site pt-8">
      <nav className="text-sm text-muted" aria-label="Você está em">
        <Link to="/produtos" className="hover:text-ink">Produtos</Link>
        {category ? <> / <Link to={`/categorias/${category.slug}`} className="hover:text-ink">{category.name}</Link></> : null}
      </nav>
      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className="aspect-square overflow-hidden rounded-[3rem] bg-porcelain">
            {images.length ? <img src={fileUrl(images[img])} alt={product.name} className="h-full w-full object-cover" />
              : product.art?.kind === 'caneca' && custom.trim()
                ? <ProductArt art={product.art} label={custom.slice(0, 30)} className="h-full w-full p-[8%]" />
                : <ProductImage product={product} />}
          </div>
          {images.length > 1 ? (
            <div className="mt-3 flex gap-3">
              {images.map((f, i) => (
                <button key={f} type="button" onClick={() => setImg(i)} aria-label={`Foto ${i + 1}`}
                  className={`h-20 w-20 overflow-hidden rounded-2xl border-[3px] ${i === img ? 'border-ink' : 'border-transparent'}`}>
                  <img src={fileUrl(f)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="lg:pt-6">
          <h1 className="text-5xl font-extrabold">{product.name}</h1>
          <p className="mt-4 font-display text-4xl font-bold">{money(product.price)}</p>
          {product.description ? <p className="mt-6 max-w-prose whitespace-pre-line text-lg text-muted">{product.description}</p> : null}

          <form className="mt-8 space-y-5" onSubmit={(e) => { e.preventDefault(); add(product, Math.min(qty, maxQty), custom); }}>
            {product.customizable ? (
              <label className="block">
                <span className="field-label">{product.customLabel || 'Como quer personalizar?'}</span>
                <textarea className="input min-h-24" value={custom} maxLength={500} onChange={(e) => setCustom(e.target.value)}
                  placeholder="Ex.: Nome Joana, letra cursiva. Fotos e logos você envia pelo WhatsApp depois do pedido." />
                {product.art?.kind === 'caneca' && !images.length ? <span className="mt-1 block text-sm text-muted">A prévia ao lado é ilustrativa. Você aprova a arte final antes da impressão.</span> : null}
              </label>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <QtyInput value={qty} onChange={(v) => setQty(Math.min(Math.max(1, v), Math.max(1, maxQty)))} />
              <button className="btn-orange flex-1 py-3 text-lg sm:flex-none sm:px-10" disabled={soldOut}>
                {soldOut ? 'Esgotado' : 'Adicionar ao carrinho'}
              </button>
            </div>
            {product.trackStock && !soldOut && product.stock <= 5 ? <p className="text-sm font-semibold text-orange-dark">Restam {product.stock} unidade(s).</p> : null}
          </form>

          <dl className="mt-10 divide-y divide-line border-y border-line">
            {settings.productionDays ? <div className="flex justify-between gap-4 py-3.5"><dt className="text-muted">Produção</dt><dd className="font-semibold">{settings.productionDays}</dd></div> : null}
            <div className="flex justify-between gap-4 py-3.5"><dt className="text-muted">Entrega</dt><dd className="text-right font-semibold">
              {(() => { const t = [settings.allowPickup && 'retirada na loja', settings.allowDelivery && `entrega local ${settings.deliveryFee ? money(settings.deliveryFee) : 'grátis'}`].filter(Boolean).join(' ou '); return t.charAt(0).toUpperCase() + t.slice(1); })()}
            </dd></div>
            {settings.allowDelivery && settings.freeDeliveryFrom ? <div className="flex justify-between gap-4 py-3.5"><dt className="text-muted">Frete grátis</dt><dd className="font-semibold">acima de {money(settings.freeDeliveryFrom)}</dd></div> : null}
          </dl>
          {wa ? <a href={wa} target="_blank" rel="noreferrer" className="link mt-6 inline-flex items-center gap-2 font-semibold"><Icon.whatsapp className="h-5 w-5 text-bamboo" />Tirar dúvidas pelo WhatsApp</a> : null}
        </div>
      </div>
      {related.length ? (
        <section className="mt-24">
          <h2 className="mb-8 text-4xl font-extrabold">Você também pode gostar</h2>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
