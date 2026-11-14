import { Link } from 'react-router-dom';
import { useAdmin, PageHeader, Stat, Empty } from './common.jsx';
import { StatusBadge } from '../../components/OrderView.jsx';
import { money, localDay, today, dateTime, STATUS } from '../../lib/format.js';

export default function Dashboard() {
  const { data, user } = useAdmin();
  const t = today();
  const month = t.slice(0, 7);
  const valid = data.orders.filter((o) => o.status !== 'cancelado');
  const todays = valid.filter((o) => localDay(o.createdAt) === t);
  const monthOrders = valid.filter((o) => localDay(o.createdAt).startsWith(month));
  const monthRevenue = monthOrders.reduce((s, o) => s + o.total, 0);
  const received = data.finance.filter((f) => f.date.startsWith(month) && f.type === 'receita' && f.paid).reduce((s, f) => s + f.amount, 0);
  const spent = data.finance.filter((f) => f.date.startsWith(month) && f.type === 'despesa' && f.paid).reduce((s, f) => s + f.amount, 0);
  const open = data.orders.filter((o) => !['entregue', 'cancelado'].includes(o.status));
  const unpaid = valid.filter((o) => !o.paid);
  const low = data.products.filter((p) => p.trackStock && p.stock <= (p.minStock || 0));
  const recent = [...data.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const due = open.filter((o) => o.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <>
      <PageHeader title={`${greet}, ${(user.name || '').split(' ')[0] || 'equipe'}`} description="O que está acontecendo na loja hoje.">
        <Link to="/admin/pdv" className="btn-orange">Vender no balcão</Link>
        <Link to="/admin/produtos?novo=1" className="btn-ghost">Novo produto</Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Vendido hoje" value={money(todays.reduce((s, o) => s + o.total, 0))} sub={`${todays.length} pedido(s)`} />
        <Stat label="Vendido no mês" value={money(monthRevenue)} sub={`${monthOrders.length} pedido(s)`} />
        <Stat label="Saldo do mês" value={money(received - spent)} sub={`${money(received)} entrou, ${money(spent)} saiu`} />
        <Stat label="A receber" value={money(unpaid.reduce((s, o) => s + o.total, 0))} sub={`${unpaid.length} pedido(s) sem pagamento`} />
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1.5fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Últimos pedidos</h2>
            <Link to="/admin/pedidos" className="link text-sm font-semibold">Ver todos</Link>
          </div>
          {recent.length ? (
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link to={`/admin/pedidos?id=${o.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-porcelain">
                    <div>
                      <p className="font-semibold">#{o.number} {o.customer.name}</p>
                      <p className="text-sm text-muted">{dateTime(o.createdAt)}, {o.origin === 'site' ? 'pelo site' : o.origin === 'pdv' ? 'no balcão' : 'pelo painel'}</p>
                    </div>
                    <div className="flex items-center gap-3"><StatusBadge status={o.status} /><span className="font-semibold">{money(o.total)}</span></div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty title="Nenhum pedido ainda" text="Os pedidos do site e as vendas do balcão aparecem aqui." />}
        </section>

        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-2xl font-bold">Pedidos em andamento</h2>
            <div className="grid grid-cols-2 gap-2">
              {['novo', 'confirmado', 'producao', 'pronto', 'enviado'].map((s) => (
                <Link key={s} to={`/admin/pedidos?status=${s}`} className="flex items-center justify-between rounded-xl border border-line px-4 py-3 hover:border-ink">
                  <span className="text-sm font-semibold">{STATUS[s].label}</span>
                  <span className="font-display text-2xl font-bold">{open.filter((o) => o.status === s).length}</span>
                </Link>
              ))}
            </div>
          </section>
          {due.length ? (
            <section>
              <h2 className="mb-3 text-2xl font-bold">Próximas entregas</h2>
              <ul className="space-y-2">
                {due.map((o) => (
                  <li key={o.id}><Link to={`/admin/pedidos?id=${o.id}`} className="flex justify-between rounded-xl bg-porcelain px-4 py-3 hover:bg-porcelain-dark">
                    <span className="font-semibold">#{o.number} {o.customer.name}</span>
                    <span className={o.dueDate < t ? 'font-semibold text-danger' : ''}>{o.dueDate.split('-').reverse().join('/')}</span>
                  </Link></li>
                ))}
              </ul>
            </section>
          ) : null}
          <section>
            <h2 className="mb-3 text-2xl font-bold">Estoque baixo</h2>
            {low.length ? (
              <ul className="space-y-2">
                {low.map((p) => (
                  <li key={p.id} className="flex justify-between rounded-xl bg-orange-soft px-4 py-3">
                    <span className="font-semibold">{p.name}</span><span>{p.stock} un.</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-muted">Nenhum produto abaixo do mínimo.</p>}
          </section>
        </div>
      </div>
    </>
  );
}
