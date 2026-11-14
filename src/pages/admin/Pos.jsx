import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useAdmin, PageHeader, SearchInput, MoneyInput, Toggle } from './common.jsx';
import { Field, ProductImage, QtyInput } from '../../components/ui.jsx';
import { money, normalize, phoneMask, onlyDigits } from '../../lib/format.js';

export default function Pos() {
  const { data, run } = useAdmin();
  const [params, setParams] = useSearchParams();
  const mode = params.get('modo') === 'encomenda' ? 'encomenda' : 'balcao';
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [lines, setLines] = useState([]);
  const [customer, setCustomer] = useState({ id: '', name: '', phone: '' });
  const [discount, setDiscount] = useState('');
  const [method, setMethod] = useState(data.settings.paymentMethods?.[0] || '');
  const [paid, setPaid] = useState(mode === 'balcao');
  const [delivery, setDelivery] = useState('retirada');
  const [address, setAddress] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);

  const products = useMemo(() => {
    let l = data.products.filter((p) => p.active);
    if (cat) l = l.filter((p) => p.categoryId === cat);
    if (q.trim()) l = l.filter((p) => normalize(`${p.name} ${p.sku}`).includes(normalize(q)));
    return l;
  }, [data.products, q, cat]);

  const matches = useMemo(() => {
    const n = normalize(customer.name);
    const d = onlyDigits(customer.phone);
    if (customer.id || (n.length < 2 && d.length < 4)) return [];
    return data.customers.filter((c) => (n.length >= 2 && normalize(c.name).includes(n)) || (d.length >= 4 && onlyDigits(c.phone).includes(d))).slice(0, 5);
  }, [customer, data.customers]);

  const addLine = (p) => setLines((ls) => {
    const i = ls.findIndex((l) => l.productId === p.id && !l.custom);
    if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l));
    return [...ls, { key: Math.random().toString(36).slice(2), productId: p.id, name: p.name, price: p.price, qty: 1, custom: '' }];
  });
  const upd = (key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const subtotal = lines.reduce((s, l) => s + (Number(l.price) || 0) * l.qty, 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));
  const switchMode = (m) => { setParams(m === 'encomenda' ? { modo: 'encomenda' } : {}, { replace: true }); setPaid(m === 'balcao'); };

  async function finish() {
    setBusy(true);
    try {
      const order = await run(() => api('admin/orders', {
        method: 'POST',
        body: {
          origin: mode === 'balcao' ? 'pdv' : 'painel',
          customer: { id: customer.id, name: customer.name.trim(), phone: customer.phone },
          items: lines.map((l) => ({ productId: l.productId, qty: l.qty, price: l.price, custom: l.custom })),
          manualDiscount: Number(discount) || 0, paymentMethod: method, paid,
          delivery: mode === 'encomenda' ? delivery : 'retirada', address, dueDate, notes,
        },
      }), mode === 'balcao' ? 'Venda registrada' : 'Encomenda lançada');
      setLast(order);
      setLines([]); setCustomer({ id: '', name: '', phone: '' }); setDiscount(''); setNotes(''); setAddress(''); setDueDate('');
    } catch { /* aviso já exibido */ } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title={mode === 'balcao' ? 'Vender no balcão' : 'Lançar encomenda'}
        description={mode === 'balcao' ? 'Venda paga e entregue na hora. Entra no financeiro e baixa o estoque.' : 'Pedido feito por WhatsApp, telefone ou na loja para produzir depois.'}>
        <div className="inline-flex rounded-full bg-porcelain p-1">
          {[['balcao', 'Balcão'], ['encomenda', 'Encomenda']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => switchMode(k)} className={`rounded-full px-4 py-1.5 font-semibold ${mode === k ? 'bg-ink text-paper' : ''}`}>{l}</button>
          ))}
        </div>
      </PageHeader>
      {last ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-bamboo-soft px-5 py-3 text-bamboo">
          <p className="font-semibold">Pedido #{last.number} registrado, {money(last.total)}.</p>
          <Link to={`/admin/pedidos?status=todos&id=${last.id}`} className="font-semibold underline underline-offset-4">Abrir pedido</Link>
        </div>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[1fr_420px]">
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput value={q} onChange={setQ} placeholder="Buscar produto ou código" />
            <select className="input sm:w-56" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria">
              <option value="">Todas as categorias</option>
              {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
            {products.map((p) => {
              const out = p.trackStock && p.stock <= 0;
              return (
                <button key={p.id} type="button" onClick={() => addLine(p)} disabled={out}
                  className="group rounded-2xl border border-line p-2 text-left hover:border-ink disabled:opacity-40">
                  <div className="aspect-square overflow-hidden rounded-xl bg-porcelain"><ProductImage product={p} /></div>
                  <p className="mt-2 px-1 text-sm font-semibold leading-tight">{p.name}</p>
                  <p className="px-1 text-sm">{money(p.price)}{p.trackStock ? <span className="text-muted">, {p.stock} un.</span> : null}</p>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-5 rounded-3xl bg-porcelain p-5 xl:sticky xl:top-6 xl:self-start">
          <div>
            <h2 className="text-2xl font-bold">Itens</h2>
            {lines.length ? (
              <ul className="mt-3 space-y-3">
                {lines.map((l) => (
                  <li key={l.key} className="rounded-2xl bg-paper p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold leading-tight">{l.name}</p>
                      <button type="button" className="text-sm text-muted hover:text-danger" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>Remover</button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <QtyInput value={l.qty} onChange={(v) => upd(l.key, { qty: v })} />
                      <div className="w-32"><MoneyInput value={l.price} onChange={(v) => upd(l.key, { price: v })} aria-label="Preço unitário" /></div>
                    </div>
                    <input className="input mt-2 py-2 text-sm" placeholder="Personalização (opcional)" value={l.custom} onChange={(e) => upd(l.key, { custom: e.target.value })} />
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-muted">Toque nos produtos para adicionar.</p>}
          </div>

          <div className="relative space-y-3">
            <h2 className="text-2xl font-bold">Cliente {mode === 'balcao' ? <span className="text-base font-normal text-muted">(opcional)</span> : null}</h2>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Nome" value={customer.name} onChange={(e) => setCustomer({ id: '', name: e.target.value, phone: customer.phone })} aria-label="Nome do cliente" />
              <input className="input" placeholder="WhatsApp" inputMode="tel" value={customer.phone} onChange={(e) => setCustomer({ id: '', name: customer.name, phone: phoneMask(e.target.value) })} aria-label="WhatsApp do cliente" />
            </div>
            {matches.length ? (
              <ul className="rounded-xl border border-line bg-paper">
                {matches.map((c) => (
                  <li key={c.id}><button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-porcelain" onClick={() => { setCustomer({ id: c.id, name: c.name, phone: c.phone }); if (c.address) setAddress(c.address); }}>
                    <strong>{c.name}</strong> {c.phone}
                  </button></li>
                ))}
              </ul>
            ) : null}
            {customer.id ? <p className="text-sm text-bamboo">Cliente cadastrado selecionado.</p> : null}
          </div>

          {mode === 'encomenda' ? (
            <div className="space-y-3">
              <div className="inline-flex rounded-full bg-paper p-1">
                {[['retirada', 'Retirada'], ['entrega', 'Entrega']].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setDelivery(k)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${delivery === k ? 'bg-ink text-paper' : ''}`}>{l}</button>
                ))}
              </div>
              {delivery === 'entrega' ? <textarea className="input min-h-16" placeholder="Endereço de entrega" value={address} onChange={(e) => setAddress(e.target.value)} /> : null}
              <Field label="Prazo combinado"><input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
              <textarea className="input min-h-16" placeholder="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Observações" />
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Desconto"><MoneyInput value={discount} onChange={setDiscount} /></Field>
              <Field label="Pagamento">
                <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="">A combinar</option>
                  {(data.settings.paymentMethods || []).map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>
            </div>
            <Toggle checked={paid} onChange={setPaid} label="Já foi pago" hint="Registra a entrada no financeiro." />
          </div>

          <div className="border-t border-porcelain-dark pt-4">
            <div className="flex items-baseline justify-between"><span className="text-muted">Total</span><span className="font-display text-4xl font-bold">{money(total)}</span></div>
            <button type="button" className="btn-orange mt-4 w-full py-3.5 text-lg" disabled={!lines.length || busy || (mode === 'encomenda' && !customer.name.trim())} onClick={finish}>
              {busy ? 'Registrando…' : mode === 'balcao' ? 'Finalizar venda' : 'Lançar encomenda'}
            </button>
            {mode === 'encomenda' && !customer.name.trim() && lines.length ? <p className="mt-2 text-center text-sm text-muted">Informe o nome do cliente para lançar a encomenda.</p> : null}
          </div>
        </aside>
      </div>
    </>
  );
}
