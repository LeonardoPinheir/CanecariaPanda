import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useAdmin, PageHeader, Table, SearchInput, Empty } from './common.jsx';
import { StatusBadge, OrderSummary } from '../../components/OrderView.jsx';
import { Field, Icon } from '../../components/ui.jsx';
import { STATUS, STATUS_FLOW, dateTime, money, normalize, whatsappLink, date } from '../../lib/format.js';

function statusMessage(o, settings) {
  const first = o.customer.name.split(' ')[0];
  const base = `Olá, ${first}! Aqui é da ${settings.storeName || 'Canecaria Panda'}.`;
  const track = `\nAcompanhe: ${window.location.origin}/rastreio?codigo=${o.code}`;
  const map = {
    novo: `${base} Recebemos o seu pedido #${o.number}.`,
    confirmado: `${base} Seu pedido #${o.number} foi confirmado e a arte está sendo preparada.`,
    producao: `${base} Seu pedido #${o.number} entrou em produção!`,
    pronto: `${base} Seu pedido #${o.number} está pronto${o.delivery === 'entrega' ? ' e logo sai para entrega' : ' para retirada'}.`,
    enviado: `${base} Seu pedido #${o.number} saiu para entrega.`,
    entregue: `${base} Seu pedido #${o.number} foi entregue. Obrigado pela compra!`,
    cancelado: `${base} Seu pedido #${o.number} foi cancelado. Qualquer dúvida, é só chamar.`,
  };
  return map[o.status] + (o.status !== 'cancelado' ? track : '');
}

function OrderDrawer({ order, onClose }) {
  const { run, data } = useAdmin();
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState(order.notes || '');
  const [method, setMethod] = useState(order.paymentMethod || '');
  const [busy, setBusy] = useState(false);
  const methods = data.settings.paymentMethods || [];
  const flow = order.delivery === 'entrega' ? STATUS_FLOW : STATUS_FLOW.filter((s) => s !== 'enviado');
  const next = flow[flow.indexOf(order.status) + 1];
  const wa = whatsappLink(order.customer.phone, statusMessage(order, data.settings));
  const profit = order.items.reduce((s, i) => s + (i.price - (i.cost || 0)) * i.qty, 0) - order.discount;

  const act = async (fn, ok) => { setBusy(true); try { await run(fn, ok); } catch { /* aviso já exibido */ } finally { setBusy(false); } };
  const setStatus = (status) => act(() => api(`admin/orders/${order.id}/status`, { method: 'POST', body: { status, note } }).then(() => setNote('')), `Pedido #${order.number}: ${STATUS[status].label}`);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer-enter flex h-full w-full max-w-xl flex-col bg-paper" role="dialog" aria-modal="true" aria-label={`Pedido ${order.number}`}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <div className="flex items-center gap-3"><h2 className="text-3xl font-extrabold">Pedido #{order.number}</h2><StatusBadge status={order.status} /></div>
            <p className="text-sm text-muted">{dateTime(order.createdAt)}, código {order.code}, {order.origin === 'site' ? 'feito pelo site' : order.origin === 'pdv' ? 'venda no balcão' : 'lançado no painel'}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-porcelain" aria-label="Fechar"><Icon.close className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
          <section>
            <h3 className="mb-2 text-xl font-bold">Cliente</h3>
            <p className="font-semibold">{order.customer.name}</p>
            {order.customer.phone ? <p className="text-muted">{order.customer.phone}</p> : null}
            {order.customer.email ? <p className="text-muted">{order.customer.email}</p> : null}
            <p className="mt-2">{order.delivery === 'entrega' ? <>Entrega em: <strong>{order.address}</strong></> : 'Retirada na loja'}</p>
            {order.dueDate ? <p className="mt-1">Prazo combinado: <strong>{date(order.dueDate)}</strong></p> : null}
            {wa ? <a href={wa} target="_blank" rel="noreferrer" className="btn mt-3 bg-bamboo text-paper hover:bg-ink btn-sm"><Icon.whatsapp className="h-4 w-4" />Avisar cliente sobre o status</a> : null}
          </section>

          <section>
            <h3 className="mb-2 text-xl font-bold">Itens</h3>
            <OrderSummary order={order} />
            <p className="mt-2 text-sm text-muted">Lucro estimado: {money(profit)}{order.coupon ? `. Cupom ${order.coupon}` : ''}</p>
          </section>

          {order.status !== 'cancelado' ? (
            <section>
              <h3 className="mb-3 text-xl font-bold">Andamento</h3>
              <Field label="Observação para o histórico (opcional)"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: arte aprovada pelo cliente" /></Field>
              <div className="mt-3 flex flex-wrap gap-2">
                {next ? <button type="button" className="btn-primary" disabled={busy} onClick={() => setStatus(next)}>Marcar como {STATUS[next].label.toLowerCase()}</button> : null}
                <select className="input w-auto py-2" value="" onChange={(e) => e.target.value && setStatus(e.target.value)} aria-label="Mudar para outro status" disabled={busy}>
                  <option value="">Outro status…</option>
                  {flow.filter((s) => s !== order.status).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
                </select>
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="mb-3 text-xl font-bold">Pagamento</h3>
            {order.paid ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-bamboo-soft px-3 py-1 font-semibold text-bamboo">Pago{order.paymentMethod ? ` com ${order.paymentMethod}` : ''}</span>
                <button type="button" className="btn-soft btn-sm" disabled={busy} onClick={() => act(() => api(`admin/orders/${order.id}/paid`, { method: 'POST', body: { paid: false } }), 'Pagamento desmarcado')}>Desfazer pagamento</button>
              </div>
            ) : order.status !== 'cancelado' ? (
              <div className="flex flex-wrap gap-2">
                <select className="input w-auto py-2" value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Forma de pagamento">
                  <option value="">Forma de pagamento</option>
                  {methods.map((m) => <option key={m}>{m}</option>)}
                </select>
                <button type="button" className="btn-orange" disabled={busy} onClick={() => act(() => api(`admin/orders/${order.id}/paid`, { method: 'POST', body: { paid: true, method } }), 'Pagamento registrado no financeiro')}>Registrar pagamento de {money(order.total)}</button>
              </div>
            ) : <p className="text-muted">Pedido cancelado.</p>}
          </section>

          <section>
            <h3 className="mb-2 text-xl font-bold">Anotações internas</h3>
            <textarea className="input min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} />
            {notes !== (order.notes || '') ? <button type="button" className="btn-primary btn-sm mt-2" disabled={busy} onClick={() => act(() => api(`admin/orders/${order.id}`, { method: 'PUT', body: { notes } }), 'Anotações salvas')}>Salvar anotações</button> : null}
          </section>

          <section>
            <h3 className="mb-3 text-xl font-bold">Histórico</h3>
            <ol className="space-y-2 text-sm">
              {[...order.history].reverse().map((h, i) => (
                <li key={i} className="flex gap-3"><span className="w-36 shrink-0 text-muted">{dateTime(h.at)}</span><span><strong>{STATUS[h.status]?.label}</strong>{h.note ? `: ${h.note}` : ''}</span></li>
              ))}
            </ol>
          </section>
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-t border-line px-6 py-4">
          <button type="button" className="btn-soft" onClick={() => window.print()}>Imprimir</button>
          {order.status !== 'cancelado' ? (
            <button type="button" className="btn-danger" disabled={busy} onClick={() => window.confirm(`Cancelar o pedido #${order.number}? O estoque volta e o pagamento sai do financeiro.`) && setStatus('cancelado')}>Cancelar pedido</button>
          ) : (
            <button type="button" className="btn-soft" disabled={busy} onClick={() => setStatus('novo')}>Reabrir pedido</button>
          )}
        </div>
      </aside>
      <PrintSheet order={order} settings={data.settings} />
    </div>
  );
}

function PrintSheet({ order, settings }) {
  return createPortal(
    <div className="print-sheet hidden p-8 text-black print:block">
      <h1 className="text-3xl font-bold">{settings.storeName}: pedido #{order.number}</h1>
      <p>{dateTime(order.createdAt)}. Código {order.code}</p>
      <p className="mt-3"><strong>{order.customer.name}</strong> {order.customer.phone}</p>
      <p>{order.delivery === 'entrega' ? `Entrega: ${order.address}` : 'Retirada na loja'}</p>
      <div className="mt-4"><OrderSummary order={order} /></div>
      {order.notes ? <p className="mt-4">Obs.: {order.notes}</p> : null}
    </div>,
    document.body,
  );
}

export default function Orders() {
  const { data } = useAdmin();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const status = params.get('status') || 'abertos';
  const openId = params.get('id');
  const setParam = (k, v) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };

  const list = useMemo(() => {
    let l = [...data.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (status === 'abertos') l = l.filter((o) => !['entregue', 'cancelado'].includes(o.status));
    else if (status === 'apagar') l = l.filter((o) => !o.paid && o.status !== 'cancelado');
    else if (status !== 'todos') l = l.filter((o) => o.status === status);
    if (q.trim()) {
      const n = normalize(q.replace('#', ''));
      l = l.filter((o) => normalize(`${o.number} ${o.code} ${o.customer.name} ${o.customer.phone}`).includes(n));
    }
    return l;
  }, [data.orders, status, q]);
  const order = data.orders.find((o) => o.id === openId);
  const tabs = [['abertos', 'Em aberto'], ['apagar', 'A receber'], ...STATUS_FLOW.map((s) => [s, STATUS[s].label]), ['cancelado', 'Cancelados'], ['todos', 'Todos']];

  return (
    <>
      <PageHeader title="Pedidos" description="Pedidos do site, encomendas e vendas do balcão.">
        <Link to="/admin/pdv?modo=encomenda" className="btn-primary">Lançar encomenda</Link>
      </PageHeader>
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setParam('status', k === 'abertos' ? '' : k)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${status === k ? 'bg-ink text-paper' : 'bg-porcelain hover:bg-porcelain-dark'}`}>{label}</button>
          ))}
        </div>
        <SearchInput value={q} onChange={setQ} placeholder="Número, código, nome ou telefone" />
      </div>
      {list.length ? (
        <Table head={['Pedido', 'Cliente', 'Data', 'Status', 'Pagamento', { label: 'Total', right: true }]}>
          {list.map((o) => (
            <tr key={o.id} className="cursor-pointer hover:bg-porcelain" onClick={() => setParam('id', o.id)}>
              <td className="px-4 py-3"><button type="button" className="font-semibold hover:underline" onClick={() => setParam('id', o.id)}>#{o.number}</button><span className="block text-xs text-muted">{o.origin === 'site' ? 'Site' : o.origin === 'pdv' ? 'Balcão' : 'Painel'}</span></td>
              <td className="px-4 py-3">{o.customer.name}<span className="block text-xs text-muted">{o.customer.phone}</span></td>
              <td className="px-4 py-3">{dateTime(o.createdAt)}{o.dueDate ? <span className="block text-xs text-muted">Prazo {date(o.dueDate)}</span> : null}</td>
              <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
              <td className="px-4 py-3">{o.paid ? <span className="font-semibold text-bamboo">Pago</span> : o.status === 'cancelado' ? '—' : <span className="font-semibold text-orange-dark">A receber</span>}</td>
              <td className="px-4 py-3 text-right font-semibold">{money(o.total)}</td>
            </tr>
          ))}
        </Table>
      ) : <Empty title="Nenhum pedido aqui" text="Mude o filtro ou a busca para ver outros pedidos." />}
      {order ? <OrderDrawer key={order.id + order.updatedAt} order={order} onClose={() => setParam('id', '')} /> : null}
    </>
  );
}
