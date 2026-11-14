import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { Field, Notice } from '../../components/ui.jsx';
import { StatusBadge } from '../../components/OrderView.jsx';
import { date, money, phoneMask } from '../../lib/format.js';

export default function CustomerArea() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      setData(await api('public/my-orders', { method: 'POST', body: { phone, code } }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-site max-w-3xl pt-10">
      <h1 className="text-5xl font-extrabold sm:text-6xl">Meus pedidos</h1>
      {!data ? (
        <>
          <p className="mt-3 max-w-xl text-lg text-muted">Para proteger seus dados, informe o WhatsApp usado no pedido e o código de qualquer um dos seus pedidos.</p>
          <form onSubmit={submit} className="mt-8 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="WhatsApp"><input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(phoneMask(e.target.value))} placeholder="(63) 99999-9999" /></Field>
            <Field label="Código de um pedido"><input className="input uppercase tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} placeholder="K7P2QM" /></Field>
            <button className="btn-primary py-3" disabled={loading || !phone || !code}>{loading ? 'Buscando…' : 'Ver pedidos'}</button>
          </form>
          <Notice className="mt-5">{error}</Notice>
        </>
      ) : (
        <>
          <p className="mt-3 text-lg text-muted">Olá, {data.name.split(' ')[0]}! Estes são os seus pedidos.</p>
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {data.orders.map((o) => (
              <li key={o.code}>
                <Link to={`/rastreio?codigo=${o.code}`} className="flex flex-wrap items-center justify-between gap-3 py-5 hover:bg-porcelain sm:px-3">
                  <div>
                    <p className="font-display text-2xl font-bold">Pedido #{o.number}</p>
                    <p className="text-sm text-muted">{date(o.createdAt)}, {o.items.reduce((s, i) => s + i.qty, 0)} item(ns), código {o.code}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={o.status} />
                    <span className="font-display text-xl font-bold">{money(o.total)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-soft mt-6" onClick={() => setData(null)}>Sair</button>
        </>
      )}
    </div>
  );
}
