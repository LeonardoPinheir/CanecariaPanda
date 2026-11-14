import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useShop } from '../../lib/shop.jsx';
import { Notice, Icon } from '../../components/ui.jsx';
import { OrderTimeline, OrderSummary, StatusBadge } from '../../components/OrderView.jsx';
import { date, whatsappLink } from '../../lib/format.js';

export default function Track() {
  const [params, setParams] = useSearchParams();
  const { settings } = useShop();
  const [code, setCode] = useState(params.get('codigo') || '');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function lookup(c) {
    if (!c.trim()) return;
    setLoading(true);
    setError('');
    try {
      setOrder(await api(`public/track?code=${encodeURIComponent(c.trim())}`));
    } catch (e) {
      setOrder(null);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (params.get('codigo')) lookup(params.get('codigo')); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const wa = order && whatsappLink(settings.whatsapp, `Olá! Quero saber do meu pedido #${order.number} (código ${order.code}).`);

  return (
    <div className="container-site max-w-3xl pt-10">
      <h1 className="text-5xl font-extrabold sm:text-6xl">Acompanhar pedido</h1>
      <p className="mt-3 text-lg text-muted">Digite o código de 6 letras e números que aparece no fim do pedido.</p>
      <form className="mt-8 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); setParams({ codigo: code.trim() }); lookup(code); }}>
        <label className="sr-only" htmlFor="codigo">Código do pedido</label>
        <input id="codigo" className="input text-lg uppercase tracking-widest" placeholder="Ex.: K7P2QM" value={code} onChange={(e) => setCode(e.target.value)} />
        <button className="btn-primary px-8 py-3" disabled={loading}>{loading ? 'Buscando…' : 'Acompanhar'}</button>
      </form>
      <Notice className="mt-5">{error}</Notice>
      {order ? (
        <section className="mt-10 grid gap-8 md:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-bold">Pedido #{order.number}</h2>
              <StatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-muted">Feito em {date(order.createdAt)}, {order.delivery === 'entrega' ? 'para entrega' : 'para retirada'}.</p>
            <div className="mt-6"><OrderTimeline order={order} /></div>
          </div>
          <div className="rounded-[2rem] bg-porcelain p-6">
            <OrderSummary order={order} />
            {wa ? <a href={wa} target="_blank" rel="noreferrer" className="btn-primary mt-6 w-full"><Icon.whatsapp className="h-5 w-5" />Falar sobre este pedido</a> : null}
          </div>
        </section>
      ) : null}
      <p className="mt-12 text-muted">Quer ver todos os seus pedidos de uma vez? Abra <Link to="/area-cliente" className="link font-semibold text-ink">Meus pedidos</Link>. Perdeu o código? Chame a gente no WhatsApp.</p>
    </div>
  );
}
