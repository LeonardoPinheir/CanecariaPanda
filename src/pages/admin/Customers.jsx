import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useAdmin, PageHeader, Table, SearchInput, Empty } from './common.jsx';
import { Field, Modal, Notice, Icon } from '../../components/ui.jsx';
import { StatusBadge } from '../../components/OrderView.jsx';
import { date, money, normalize, onlyDigits, phoneMask, whatsappLink } from '../../lib/format.js';

const blank = { name: '', phone: '', email: '', document: '', address: '', city: '', birthday: '', notes: '' };

function CustomerModal({ customer, onClose }) {
  const { data, run } = useAdmin();
  const [f, setF] = useState(customer ? { ...blank, ...customer } : blank);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: k === 'phone' ? phoneMask(e.target.value) : e.target.value }));
  const orders = customer ? data.orders.filter((o) => o.customerId === customer.id || (onlyDigits(o.customer.phone) && onlyDigits(o.customer.phone) === onlyDigits(customer.phone))).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  const spent = orders.filter((o) => o.status !== 'cancelado').reduce((s, o) => s + o.total, 0);

  const save = (e) => {
    e.preventDefault();
    setError('');
    run(() => (customer ? api(`admin/customers/${customer.id}`, { method: 'PUT', body: f }) : api('admin/customers', { method: 'POST', body: f })), 'Cliente salvo')
      .then(onClose).catch((err) => setError(err.message));
  };
  const wa = whatsappLink(f.phone);

  return (
    <Modal open onClose={onClose} title={customer ? customer.name : 'Novo cliente'} wide
      footer={<>
        {customer ? <button type="button" className="btn-danger mr-auto" onClick={() => window.confirm(`Apagar ${customer.name}? Os pedidos continuam no histórico.`) && run(() => api(`admin/customers/${customer.id}`, { method: 'DELETE' }), 'Cliente apagado').then(onClose).catch(() => {})}>Apagar</button> : null}
        <button type="button" className="btn-soft" onClick={onClose}>Cancelar</button>
        <button form="cli" className="btn-primary">Salvar</button>
      </>}>
      <form id="cli" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" className="sm:col-span-2"><input className="input" value={f.name} onChange={set('name')} required /></Field>
        <Field label="WhatsApp"><div className="flex gap-2"><input className="input" inputMode="tel" value={f.phone} onChange={set('phone')} />{wa ? <a href={wa} target="_blank" rel="noreferrer" className="grid w-12 shrink-0 place-items-center rounded-xl bg-bamboo text-paper" aria-label="Abrir WhatsApp"><Icon.whatsapp className="h-5 w-5" /></a> : null}</div></Field>
        <Field label="E-mail"><input className="input" type="email" value={f.email} onChange={set('email')} /></Field>
        <Field label="CPF ou CNPJ"><input className="input" value={f.document} onChange={set('document')} /></Field>
        <Field label="Aniversário"><input className="input" type="date" value={f.birthday} onChange={set('birthday')} /></Field>
        <Field label="Endereço" className="sm:col-span-2"><input className="input" value={f.address} onChange={set('address')} /></Field>
        <Field label="Anotações" className="sm:col-span-2"><textarea className="input min-h-20" value={f.notes} onChange={set('notes')} placeholder="Preferências, empresa, datas importantes…" /></Field>
        <Notice className="sm:col-span-2">{error}</Notice>
      </form>
      {customer ? (
        <section className="mt-8">
          <h3 className="text-xl font-bold">Pedidos ({orders.length}), {money(spent)} no total</h3>
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
            {orders.map((o) => (
              <li key={o.id}><Link to={`/admin/pedidos?status=todos&id=${o.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-porcelain">
                <span>#{o.number}, {date(o.createdAt)}</span>
                <span className="flex items-center gap-3"><StatusBadge status={o.status} />{money(o.total)}</span>
              </Link></li>
            ))}
            {!orders.length ? <li className="px-4 py-3 text-muted">Nenhum pedido ainda.</li> : null}
          </ul>
        </section>
      ) : null}
    </Modal>
  );
}

export default function Customers() {
  const { data } = useAdmin();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const stats = useMemo(() => {
    const m = {};
    for (const o of data.orders) {
      if (o.status === 'cancelado' || !o.customerId) continue;
      m[o.customerId] ||= { n: 0, total: 0, last: '' };
      m[o.customerId].n++;
      m[o.customerId].total += o.total;
      if (o.createdAt > m[o.customerId].last) m[o.customerId].last = o.createdAt;
    }
    return m;
  }, [data.orders]);
  const list = useMemo(() => {
    let l = [...data.customers].sort((a, b) => a.name.localeCompare(b.name));
    if (q.trim()) l = l.filter((c) => normalize(`${c.name} ${c.phone} ${c.email}`).includes(normalize(q)) || (onlyDigits(q) && onlyDigits(c.phone).includes(onlyDigits(q))));
    return l;
  }, [data.customers, q]);
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const birthdays = data.customers.filter((c) => c.birthday?.slice(5, 7) === month);

  return (
    <>
      <PageHeader title="Clientes" description={`${data.customers.length} cliente(s). Clientes do site são cadastrados sozinhos no primeiro pedido.`}>
        <button type="button" className="btn-primary" onClick={() => setOpen('new')}>Novo cliente</button>
      </PageHeader>
      {birthdays.length ? <p className="mb-5 rounded-2xl bg-orange-soft px-4 py-3"><strong>Aniversariantes do mês:</strong> {birthdays.map((c) => `${c.name} (${c.birthday.slice(8)}/${month})`).join(', ')}</p> : null}
      <div className="mb-4"><SearchInput value={q} onChange={setQ} placeholder="Nome, telefone ou e-mail" /></div>
      {list.length ? (
        <Table head={['Cliente', 'Contato', 'Pedidos', { label: 'Total comprado', right: true }, 'Última compra']}>
          {list.map((c) => (
            <tr key={c.id} className="cursor-pointer hover:bg-porcelain" onClick={() => setOpen(c)}>
              <td className="px-4 py-3 font-semibold"><button type="button" className="hover:underline" onClick={() => setOpen(c)}>{c.name}</button></td>
              <td className="px-4 py-3">{c.phone}<span className="block text-xs text-muted">{c.email}</span></td>
              <td className="px-4 py-3">{stats[c.id]?.n || 0}</td>
              <td className="px-4 py-3 text-right font-semibold">{money(stats[c.id]?.total || 0)}</td>
              <td className="px-4 py-3">{stats[c.id]?.last ? date(stats[c.id].last) : '—'}</td>
            </tr>
          ))}
        </Table>
      ) : <Empty title="Nenhum cliente encontrado" text="Cadastre clientes ou espere o primeiro pedido do site." />}
      {open ? <CustomerModal customer={open === 'new' ? null : open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}
