import { useMemo, useState } from 'react';
import { useAdmin, PageHeader, Stat, Empty, inRange } from './common.jsx';
import { localDay, money, today } from '../../lib/format.js';

const addDays = (iso, n) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

function presetRange(p) {
  const t = today();
  if (p === '7') return [addDays(t, -6), t];
  if (p === '30') return [addDays(t, -29), t];
  if (p === 'mes') return [t.slice(0, 8) + '01', t];
  if (p === 'ano') return [t.slice(0, 5) + '01-01', t];
  return null;
}

// Barras verticais de uma série só, com dica ao passar o mouse.
function BarChart({ points, format = money, label }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...points.map((p) => p.value));
  const W = 720;
  const H = 220;
  const pad = { l: 8, r: 8, t: 12, b: 26 };
  const bw = (W - pad.l - pad.r) / points.length;
  const every = Math.ceil(points.length / 10);
  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={pad.l} x2={W - pad.r} y1={pad.t + (H - pad.t - pad.b) * (1 - g)} y2={pad.t + (H - pad.t - pad.b) * (1 - g)} stroke="#d6dad0" strokeDasharray="2 4" />
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="#5b6157" />
        {points.map((p, i) => {
          const h = ((H - pad.t - pad.b) * p.value) / max;
          const x = pad.l + i * bw;
          return (
            <g key={p.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
              {p.value > 0 ? (
                <path d={`M${x + 1} ${H - pad.b} V${H - pad.b - h + 4} q0 -4 4 -4 H${x + bw - 5} q4 0 4 4 V${H - pad.b} Z`}
                  fill={hover === i ? '#c9520e' : '#f26b1d'} />
              ) : null}
              {i % every === 0 ? <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#5b6157">{p.short}</text> : null}
            </g>
          );
        })}
      </svg>
      {hover != null ? (
        <figcaption className="pointer-events-none absolute top-0 rounded-xl bg-ink px-3 py-2 text-sm text-paper"
          style={{ left: `clamp(0px, calc(${((hover + 0.5) / points.length) * 100}% - 70px), calc(100% - 150px))` }}>
          <span className="block text-paper/70">{points[hover].label}</span>
          <strong>{format(points[hover].value)}</strong>{points[hover].sub ? <span className="block text-paper/70">{points[hover].sub}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

function Ranking({ rows, format = money }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.name} title={`${r.name}: ${format(r.value)}`}>
          <div className="flex justify-between gap-3 text-sm"><span className="truncate">{r.name}</span><span className="whitespace-nowrap font-semibold">{format(r.value)}{r.sub ? <span className="font-normal text-muted"> ({r.sub})</span> : null}</span></div>
          <div className="mt-1 h-2 rounded-full bg-porcelain"><div className="h-2 rounded-full bg-ink" style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export default function Reports() {
  const { data } = useAdmin();
  const [preset, setPreset] = useState('30');
  const [custom, setCustom] = useState([addDays(today(), -29), today()]);
  const [from, to] = presetRange(preset) || custom;

  const r = useMemo(() => {
    const orders = data.orders.filter((o) => o.status !== 'cancelado' && inRange(localDay(o.createdAt), from, to));
    const revenue = orders.reduce((s, o) => s + o.total, 0);
    const cost = orders.reduce((s, o) => s + o.items.reduce((c, i) => c + (i.cost || 0) * i.qty, 0), 0);
    const goods = orders.reduce((s, o) => s + o.subtotal - o.discount, 0);
    const expenses = data.finance.filter((f) => f.type === 'despesa' && inRange(f.date, from, to)).reduce((s, f) => s + f.amount, 0);
    const cancelled = data.orders.filter((o) => o.status === 'cancelado' && inRange(localDay(o.createdAt), from, to)).length;

    // Série diária (ou mensal, se o período for longo).
    const days = Math.round((new Date(to) - new Date(from)) / 864e5) + 1;
    const monthly = days > 62;
    const buckets = new Map();
    if (monthly) {
      for (let d = from.slice(0, 7); d <= to.slice(0, 7);) {
        buckets.set(d, 0);
        const [y, m] = d.split('-').map(Number);
        d = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
      }
    } else {
      for (let d = from; d <= to; d = addDays(d, 1)) buckets.set(d, 0);
    }
    const counts = new Map();
    for (const o of orders) {
      const k = monthly ? localDay(o.createdAt).slice(0, 7) : localDay(o.createdAt);
      if (buckets.has(k)) { buckets.set(k, buckets.get(k) + o.total); counts.set(k, (counts.get(k) || 0) + 1); }
    }
    const series = [...buckets].map(([k, v]) => ({
      key: k, value: v, sub: `${counts.get(k) || 0} pedido(s)`,
      label: monthly ? new Date(k + '-15T12:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : new Date(k + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      short: monthly ? new Date(k + '-15T12:00').toLocaleDateString('pt-BR', { month: 'short' }) : k.slice(8) + '/' + k.slice(5, 7),
    }));

    const group = (keyFn, valFn = (o) => o.total) => {
      const m = {};
      for (const o of orders) for (const [k, v, n] of keyFn(o, valFn)) { m[k] ||= { value: 0, n: 0 }; m[k].value += v; m[k].n += n; }
      return Object.entries(m).map(([name, x]) => ({ name, value: x.value, n: x.n })).sort((a, b) => b.value - a.value);
    };
    const catName = Object.fromEntries(data.categories.map((c) => [c.id, c.name]));
    const prodCat = Object.fromEntries(data.products.map((p) => [p.id, p.categoryId]));
    const products = group((o) => o.items.map((i) => [i.name, i.total, i.qty])).slice(0, 8).map((x) => ({ ...x, sub: `${x.n} un.` }));
    const categories = group((o) => o.items.map((i) => [catName[prodCat[i.productId]] || 'Sem categoria', i.total, i.qty]));
    const payments = group((o) => [[o.paymentMethod || 'Não informado', o.total, 1]]).map((x) => ({ ...x, sub: `${x.n} pedido(s)` }));
    const origins = group((o) => [[{ site: 'Site', pdv: 'Balcão', painel: 'Encomenda no painel' }[o.origin] || o.origin, o.total, 1]]).map((x) => ({ ...x, sub: `${x.n} pedido(s)` }));
    const customers = group((o) => [[o.customer.name, o.total, 1]]).filter((c) => c.name !== 'Cliente de balcão').slice(0, 8).map((x) => ({ ...x, sub: `${x.n} pedido(s)` }));
    return { orders, revenue, cost, goods, expenses, cancelled, series, products, categories, payments, origins, customers, monthly };
  }, [data, from, to]);

  const gross = r.goods - r.cost;
  return (
    <>
      <PageHeader title="Relatórios" description="Vendas, lucro e o que mais sai, no período escolhido. Pedidos cancelados ficam de fora." />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {[['7', '7 dias'], ['30', '30 dias'], ['mes', 'Este mês'], ['ano', 'Este ano'], ['custom', 'Escolher datas']].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setPreset(k)} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${preset === k ? 'bg-ink text-paper' : 'bg-porcelain hover:bg-porcelain-dark'}`}>{l}</button>
        ))}
        {preset === 'custom' ? (
          <span className="flex items-center gap-2">
            <input type="date" className="input w-auto py-1.5" value={custom[0]} onChange={(e) => setCustom([e.target.value, custom[1]])} aria-label="De" />
            até
            <input type="date" className="input w-auto py-1.5" value={custom[1]} onChange={(e) => setCustom([custom[0], e.target.value])} aria-label="Até" />
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Faturamento" value={money(r.revenue)} sub={`${r.orders.length} pedido(s), ${r.cancelled} cancelado(s)`} />
        <Stat label="Ticket médio" value={money(r.orders.length ? r.revenue / r.orders.length : 0)} />
        <Stat label="Lucro bruto" value={money(gross)} sub={`Vendas menos o custo dos produtos${r.goods ? `, margem de ${((gross / r.goods) * 100).toFixed(0)}%` : ''}`} />
        <Stat label="Lucro após despesas" value={money(gross - r.expenses)} sub={`${money(r.expenses)} em despesas lançadas`} />
      </div>

      {r.orders.length ? (
        <>
          <section className="mt-8 rounded-2xl border border-line p-5">
            <h2 className="text-2xl font-bold">Faturamento por {r.monthly ? 'mês' : 'dia'}</h2>
            <div className="mt-4"><BarChart points={r.series} label={`Faturamento por ${r.monthly ? 'mês' : 'dia'}`} /></div>
          </section>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-line p-5"><h2 className="mb-4 text-2xl font-bold">Produtos mais vendidos</h2><Ranking rows={r.products} /></section>
            <section className="rounded-2xl border border-line p-5"><h2 className="mb-4 text-2xl font-bold">Por categoria</h2><Ranking rows={r.categories} /></section>
            <section className="rounded-2xl border border-line p-5"><h2 className="mb-4 text-2xl font-bold">Formas de pagamento</h2><Ranking rows={r.payments} /></section>
            <section className="rounded-2xl border border-line p-5"><h2 className="mb-4 text-2xl font-bold">Onde vendeu</h2><Ranking rows={r.origins} /></section>
            {r.customers.length ? <section className="rounded-2xl border border-line p-5 lg:col-span-2"><h2 className="mb-4 text-2xl font-bold">Clientes que mais compraram</h2><Ranking rows={r.customers} /></section> : null}
          </div>
        </>
      ) : <div className="mt-8"><Empty title="Sem vendas no período" text="Escolha outro período ou registre vendas no balcão." /></div>}
    </>
  );
}
