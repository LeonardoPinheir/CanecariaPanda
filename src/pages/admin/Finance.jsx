import { useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { useAdmin, PageHeader, Table, Empty, Stat, Toggle, MoneyInput } from './common.jsx';
import { Field, Modal, Notice } from '../../components/ui.jsx';
import { date, money, today } from '../../lib/format.js';

const monthLabel = (ym) => new Date(`${ym}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
const shiftMonth = (ym, n) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

function EntryModal({ entry, type, onClose }) {
  const { data, run } = useAdmin();
  const [f, setF] = useState(entry ? { ...entry } : { type, description: '', category: '', amount: '', date: today(), paid: true, method: '', notes: '' });
  const [error, setError] = useState('');
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const cats = data.settings.financeCategories?.[f.type] || [];
  const locked = !!entry?.orderId;
  const save = (e) => {
    e.preventDefault();
    run(() => (entry ? api(`admin/finance/${entry.id}`, { method: 'PUT', body: f }) : api('admin/finance', { method: 'POST', body: f })), 'Lançamento salvo')
      .then(onClose).catch((err) => setError(err.message));
  };
  return (
    <Modal open onClose={onClose} title={entry ? 'Editar lançamento' : f.type === 'receita' ? 'Nova entrada' : 'Nova despesa'}
      footer={<>
        {entry && !locked ? <button type="button" className="btn-danger mr-auto" onClick={() => window.confirm('Apagar este lançamento?') && run(() => api(`admin/finance/${entry.id}`, { method: 'DELETE' }), 'Lançamento apagado').then(onClose).catch(() => {})}>Apagar</button> : null}
        <button type="button" className="btn-soft" onClick={onClose}>Cancelar</button>
        <button form="fin" className="btn-primary">Salvar</button>
      </>}>
      <form id="fin" onSubmit={save} className="space-y-4">
        {locked ? <Notice tone="info">Lançamento criado pelo pagamento de um pedido. Para desfazer, desmarque o pagamento no pedido.</Notice> : null}
        {!entry ? (
          <div className="inline-flex rounded-full bg-porcelain p-1">
            {[['receita', 'Entrada'], ['despesa', 'Despesa']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => set('type', k)} className={`rounded-full px-4 py-1.5 font-semibold ${f.type === k ? 'bg-ink text-paper' : ''}`}>{l}</button>
            ))}
          </div>
        ) : null}
        <Field label="Descrição"><input className="input" value={f.description} onChange={(e) => set('description', e.target.value)} placeholder={f.type === 'despesa' ? 'Ex.: 48 canecas brancas do fornecedor' : 'Ex.: arte criada para cliente'} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor"><MoneyInput value={f.amount} onChange={(v) => set('amount', v)} disabled={locked} /></Field>
          <Field label={f.paid ? 'Data' : 'Vencimento'}><input className="input" type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            <select className="input" value={f.category} onChange={(e) => set('category', e.target.value)}>
              <option value="">Sem categoria</option>
              {cats.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Forma de pagamento">
            <select className="input" value={f.method} onChange={(e) => set('method', e.target.value)}>
              <option value="">—</option>
              {(data.settings.paymentMethods || []).map((m) => <option key={m}>{m}</option>)}
              <option>Boleto</option><option>Transferência</option>
            </select>
          </Field>
        </div>
        <Toggle checked={f.paid} onChange={(v) => set('paid', v)} label={f.type === 'despesa' ? 'Já foi paga' : 'Já foi recebida'} hint="Desmarque para registrar uma conta a pagar ou a receber." />
        <Notice>{error}</Notice>
      </form>
    </Modal>
  );
}

export default function Finance() {
  const { data, run } = useAdmin();
  const [month, setMonth] = useState(today().slice(0, 7));
  const [filter, setFilter] = useState('todos');
  const [open, setOpen] = useState(null);

  const entries = useMemo(() => data.finance.filter((f) => f.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date)), [data.finance, month]);
  const sum = (l) => l.reduce((s, f) => s + f.amount, 0);
  const inPaid = sum(entries.filter((f) => f.type === 'receita' && f.paid));
  const outPaid = sum(entries.filter((f) => f.type === 'despesa' && f.paid));
  const pendingOut = data.finance.filter((f) => f.type === 'despesa' && !f.paid).sort((a, b) => a.date.localeCompare(b.date));
  const pendingIn = sum(data.orders.filter((o) => !o.paid && o.status !== 'cancelado').map((o) => ({ amount: o.total })));
  const shown = entries.filter((f) => filter === 'todos' || (filter === 'pendentes' ? !f.paid : f.type === filter));
  const byCat = Object.entries(entries.filter((f) => f.type === 'despesa').reduce((m, f) => ({ ...m, [f.category || 'Sem categoria']: (m[f.category || 'Sem categoria'] || 0) + f.amount }), {})).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...byCat.map((c) => c[1]));

  return (
    <>
      <PageHeader title="Financeiro" description="Entradas e saídas da loja. Pagamentos de pedidos entram aqui sozinhos.">
        <button type="button" className="btn-soft" onClick={() => setOpen({ type: 'receita' })}>Nova entrada</button>
        <button type="button" className="btn-primary" onClick={() => setOpen({ type: 'despesa' })}>Nova despesa</button>
      </PageHeader>

      <div className="mb-6 flex items-center gap-2">
        <button type="button" className="btn-soft btn-sm" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior">‹</button>
        <p className="min-w-44 text-center font-display text-2xl font-bold capitalize">{monthLabel(month)}</p>
        <button type="button" className="btn-soft btn-sm" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Próximo mês">›</button>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Entrou" value={money(inPaid)} />
        <Stat label="Saiu" value={money(outPaid)} />
        <Stat label="Saldo do mês" value={money(inPaid - outPaid)} tone={inPaid - outPaid < 0 ? 'bg-red-50' : 'bg-bamboo-soft/50'} />
        <Stat label="Pedidos a receber" value={money(pendingIn)} sub="Todos os meses" />
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_320px]">
        <section>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {[['todos', 'Tudo'], ['receita', 'Entradas'], ['despesa', 'Despesas'], ['pendentes', 'Não pagos']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${filter === k ? 'bg-ink text-paper' : 'bg-porcelain hover:bg-porcelain-dark'}`}>{l}</button>
            ))}
          </div>
          {shown.length ? (
            <Table head={['Data', 'Descrição', 'Categoria', 'Situação', { label: 'Valor', right: true }]}>
              {shown.map((f) => (
                <tr key={f.id} className="cursor-pointer hover:bg-porcelain" onClick={() => setOpen(f)}>
                  <td className="px-4 py-3 text-muted">{date(f.date)}</td>
                  <td className="px-4 py-3"><button type="button" className="text-left font-semibold hover:underline" onClick={() => setOpen(f)}>{f.description}</button>{f.method ? <span className="block text-xs text-muted">{f.method}</span> : null}</td>
                  <td className="px-4 py-3">{f.category || '—'}</td>
                  <td className="px-4 py-3">{f.paid ? 'Pago' : <span className="font-semibold text-orange-dark">{f.type === 'despesa' ? 'A pagar' : 'A receber'}</span>}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${f.type === 'despesa' ? 'text-danger' : 'text-bamboo'}`}>{f.type === 'despesa' ? '−' : '+'}{money(f.amount)}</td>
                </tr>
              ))}
            </Table>
          ) : <Empty title="Nada lançado neste mês" text="Registre despesas como matéria-prima e aluguel para ver o lucro real da loja." />}
        </section>
        <aside className="space-y-8">
          <section>
            <h2 className="mb-3 text-2xl font-bold">Contas a pagar</h2>
            {pendingOut.length ? (
              <ul className="space-y-2">
                {pendingOut.slice(0, 8).map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5">
                    <div><p className="font-semibold leading-tight">{f.description}</p><p className={`text-sm ${f.date < today() ? 'font-semibold text-danger' : 'text-muted'}`}>Vence {date(f.date)}, {money(f.amount)}</p></div>
                    <button type="button" className="btn-soft btn-sm" onClick={() => run(() => api(`admin/finance/${f.id}`, { method: 'PUT', body: { paid: true } }), 'Conta marcada como paga').catch(() => {})}>Paguei</button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-muted">Nenhuma conta pendente.</p>}
          </section>
          {byCat.length ? (
            <section>
              <h2 className="mb-3 text-2xl font-bold">Despesas por categoria</h2>
              <ul className="space-y-3">
                {byCat.map(([c, v]) => (
                  <li key={c}>
                    <div className="flex justify-between text-sm"><span>{c}</span><span className="font-semibold">{money(v)}</span></div>
                    <div className="mt-1 h-2 rounded-full bg-porcelain"><div className="h-2 rounded-full bg-ink" style={{ width: `${(v / maxCat) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
      {open ? <EntryModal entry={open.id ? open : null} type={open.type} onClose={() => setOpen(null)} /> : null}
    </>
  );
}
