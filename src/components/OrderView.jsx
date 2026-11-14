import { STATUS, STATUS_FLOW, dateTime, money } from '../lib/format.js';

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.novo;
  return <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${s.tone}`}>{s.label}</span>;
}

export function OrderTimeline({ order }) {
  const cancelled = order.status === 'cancelado';
  const flow = order.delivery === 'entrega' ? STATUS_FLOW : STATUS_FLOW.filter((s) => s !== 'enviado');
  const current = flow.indexOf(order.status);
  const when = (s) => [...(order.history || [])].reverse().find((h) => h.status === s)?.at;
  if (cancelled) {
    return <p className="rounded-2xl bg-red-50 p-4 font-semibold text-danger">{STATUS.cancelado.help}</p>;
  }
  return (
    <ol className="relative space-y-0">
      {flow.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s} className="relative flex gap-4 pb-6 last:pb-0">
            {i < flow.length - 1 ? <span className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-[3px] ${i < current ? 'bg-ink' : 'bg-line'}`} /> : null}
            <span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-[3px] ${done ? 'border-ink bg-ink text-paper' : 'border-line bg-paper'}`}>
              {done ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L19 7" /></svg> : null}
            </span>
            <div className="pt-0.5">
              <p className={`font-semibold ${done ? '' : 'text-muted'}`}>{STATUS[s].label}</p>
              {i === current ? <p className="text-sm text-muted">{STATUS[s].help}</p> : null}
              {done && when(s) ? <p className="text-xs text-muted">{dateTime(when(s))}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderSummary({ order }) {
  return (
    <div>
      <ul className="divide-y divide-line">
        {order.items.map((i, idx) => (
          <li key={idx} className="flex justify-between gap-4 py-3">
            <div>
              <p className="font-semibold">{i.qty}× {i.name}</p>
              {i.custom ? <p className="text-sm text-muted">{i.custom}</p> : null}
            </div>
            <p className="whitespace-nowrap">{money(i.total)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
        {order.discount ? <div className="flex justify-between text-bamboo"><dt>Desconto</dt><dd>−{money(order.discount)}</dd></div> : null}
        {order.shipping ? <div className="flex justify-between"><dt>Entrega</dt><dd>{money(order.shipping)}</dd></div> : null}
        <div className="flex justify-between font-display text-xl font-bold"><dt>Total</dt><dd>{money(order.total)}</dd></div>
        <div className="flex justify-between text-muted"><dt>Pagamento</dt><dd>{order.paid ? 'Pago' : 'Aguardando'}{order.paymentMethod ? `, ${order.paymentMethod}` : ''}</dd></div>
      </dl>
    </div>
  );
}
