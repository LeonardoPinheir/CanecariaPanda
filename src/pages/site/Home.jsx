import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShop } from '../../lib/shop.jsx';
import { Mug } from '../../components/Art.jsx';
import { ProductCard, Icon } from '../../components/ui.jsx';
import { money, whatsappLink } from '../../lib/format.js';

const COLORS = [
  ['Branca', '#ffffff'],
  ['Laranja', '#F26B1D'],
  ['Verde bambu', '#2F7D32'],
  ['Preta', '#1d1d1d'],
  ['Rosa', '#F49AC1'],
  ['Azul', '#3B82C4'],
];

function MugStudio() {
  const { products, add } = useShop();
  const [text, setText] = useState('Mãe');
  const [color, setColor] = useState(COLORS[1]);
  const base = useMemo(() => {
    const mugs = products.filter((p) => p.art?.kind === 'caneca' && p.customizable);
    if (color[1] === '#ffffff') return mugs.find((p) => !p.art?.accent && p.art?.color === '#ffffff') || mugs[0];
    return mugs.find((p) => p.art?.accent) || mugs[0];
  }, [products, color]);

  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 rounded-[3rem] bg-porcelain sm:rounded-[4rem]" />
      <div className="px-6 pb-6 pt-4 sm:px-10 sm:pb-9">
        <Mug text={text || ' '} accent={color[1] === '#ffffff' ? '' : color[1]} className="mug-enter mx-auto w-full max-w-[440px]" title={`Prévia da caneca com o texto ${text}`} />
        <div className="mx-auto mt-2 max-w-[440px] space-y-4">
          <label className="block">
            <span className="field-label">Escreva um nome ou frase</span>
            <input className="input text-lg" value={text} maxLength={30} onChange={(e) => setText(e.target.value)} placeholder="Ex.: Melhor pai do mundo" />
          </label>
          <fieldset>
            <legend className="field-label">Cor da alça e de dentro</legend>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c[0]} type="button" onClick={() => setColor(c)} aria-pressed={color[0] === c[0]} title={c[0]}
                  className={`h-10 w-10 rounded-full border-[3px] transition-transform ${color[0] === c[0] ? 'scale-110 border-ink' : 'border-line hover:border-ink'}`}
                  style={{ background: c[1] }}>
                  <span className="sr-only">{c[0]}</span>
                </button>
              ))}
            </div>
          </fieldset>
          {base ? (
            <button type="button" className="btn-orange w-full py-3 text-lg"
              onClick={() => add(base, 1, `Texto: ${text.trim() || 'sem texto'}. Cor da alça e de dentro: ${color[0]}.`)}>
              Adicionar ao carrinho, {money(base.price)}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { settings, products, categories, catalog } = useShop();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const featured = (products.filter((p) => p.featured).length ? products.filter((p) => p.featured) : products).slice(0, 8);
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const wa = whatsappLink(settings.whatsapp, 'Olá! Quero fazer um pedido personalizado.');
  const usedCategories = categories.filter((c) => products.some((p) => p.categoryId === c.id));

  return (
    <>
      <section className="container-site grid items-center gap-10 pb-16 pt-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pt-16">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-bamboo-soft px-4 py-1.5 font-semibold text-bamboo">
            Feito em Araguaína, uma peça por vez
          </p>
          <h1 className="text-[2.9rem] font-extrabold sm:text-6xl lg:text-[4.4rem]">
            {settings.heroTitle || 'Canecas e presentes com o nome de quem você gosta'}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">{settings.heroText}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/produtos" className="btn-primary px-7 py-3.5 text-lg">Ver produtos</Link>
            {wa ? (
              <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost px-6 py-3.5 text-lg">
                <Icon.whatsapp className="h-5 w-5" /> Pedir pelo WhatsApp
              </a>
            ) : null}
          </div>
          {settings.productionDays ? <p className="mt-6 text-sm text-muted">Prazo de produção: {settings.productionDays}.</p> : null}
        </div>
        {catalog ? <MugStudio /> : <div className="aspect-square rounded-[4rem] bg-porcelain" />}
      </section>

      {usedCategories.length ? (
        <section className="container-site" aria-label="Categorias">
          <div className="flex flex-wrap gap-2.5">
            {usedCategories.map((c) => (
              <Link key={c.id} to={`/categorias/${c.slug}`} className="rounded-full border-2 border-ink px-5 py-2 font-semibold hover:bg-ink hover:text-paper">
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="container-site mt-14">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="text-4xl font-extrabold sm:text-5xl">Os mais pedidos</h2>
          <Link to="/produtos" className="link hidden font-semibold sm:inline">Ver todos os produtos</Link>
        </div>
        {catalog && !featured.length ? <p className="text-muted">Os produtos aparecem aqui assim que forem cadastrados no painel.</p> : null}
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => <ProductCard key={p.id} product={p} category={catById[p.categoryId]} />)}
        </div>
        <Link to="/produtos" className="btn-ghost mt-10 w-full sm:hidden">Ver todos os produtos</Link>
      </section>

      <section className="mt-24 bg-ink text-paper">
        <div className="container-site py-16 sm:py-20">
          <h2 className="max-w-2xl text-4xl font-extrabold sm:text-5xl">Do seu pedido até a caneca na mão</h2>
          <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Escolha o produto', 'Caneca, camiseta, kit ou brinde. Coloque no carrinho com o texto que quer estampar.'],
              ['Envie sua ideia', 'Mande foto, logo ou frase pelo WhatsApp. Se não tiver arte, a gente cria.'],
              ['Aprove a arte', 'Antes de imprimir, mandamos a prévia para você conferir cada detalhe.'],
              ['Retire ou receba', 'Acompanhe a produção pelo código do pedido e retire na loja ou receba em casa.'],
            ].map(([t, d], i) => (
              <li key={t}>
                <span className="grid h-14 w-14 place-items-center rounded-full bg-paper font-display text-3xl font-extrabold text-ink">{i + 1}</span>
                <h3 className="mt-5 text-2xl font-bold">{t}</h3>
                <p className="mt-2 text-paper/70">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-site mt-24 grid gap-12 lg:grid-cols-2">
        <div>
          <h2 className="text-4xl font-extrabold sm:text-5xl">Também fazemos para a sua empresa e a sua festa</h2>
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {(settings.services || []).slice(0, 4).map((s) => (
              <li key={s.title} className="py-5">
                <h3 className="text-2xl font-bold">{s.title}</h3>
                <p className="mt-1 text-muted">{s.text}</p>
              </li>
            ))}
          </ul>
          <Link to="/servicos" className="link mt-6 inline-block font-semibold">Conhecer todos os serviços</Link>
        </div>
        <div className="self-start rounded-[var(--radius-blob)] bg-orange p-8 text-paper sm:p-10">
          <h2 className="text-4xl font-extrabold">Já fez seu pedido?</h2>
          <p className="mt-3 text-lg text-paper/90">Digite o código que você recebeu para ver em que etapa ele está.</p>
          <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (code.trim()) navigate(`/rastreio?codigo=${encodeURIComponent(code.trim())}`); }}>
            <label className="sr-only" htmlFor="home-code">Código do pedido</label>
            <input id="home-code" className="input border-paper uppercase tracking-widest text-ink" placeholder="Ex.: K7P2QM" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn bg-ink text-paper hover:bg-paper hover:text-ink">Acompanhar</button>
          </form>
          <p className="mt-5 text-paper/90">Quer ver todos os seus pedidos? <Link to="/area-cliente" className="font-semibold underline underline-offset-4">Abra seus pedidos</Link>.</p>
        </div>
      </section>
    </>
  );
}
