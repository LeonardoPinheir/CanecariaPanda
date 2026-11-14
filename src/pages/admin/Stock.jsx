import { useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { useAdmin, PageHeader, Table, Empty, SearchInput } from './common.jsx';
import { Field, Modal } from '../../components/ui.jsx';
import { dateTime, money, normalize } from '../../lib/format.js';

function AdjustModal({ product, onClose }) {
  const { run } = useAdmin();
  const [type, setType] = useState('entrada');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const n = Math.abs(parseInt(qty, 10) || 0);
  const save = (e) => {
    e.preventDefault();
    run(() => api('admin/stock', { method: 'POST', body: { productId: product.id, qty: type === 'entrada' ? n : -n, reason: reason || (type === 'entrada' ? 'Compra / produção' : 'Perda ou uso interno') } }), 'Estoque atualizado').then(onClose).catch(() => {});
  };
  return (
    <Modal open onClose={onClose} title={`Estoque de ${product.name}`}
      footer={<><button type="button" className="btn-soft" onClick={onClose}>Cancelar</button><button form="adj" className="btn-primary" disabled={!n}>Salvar</button></>}>
      <form id="adj" onSubmit={save} className="space-y-4">
        <p>Estoque atual: <strong>{product.stock || 0} un.</strong></p>
        <div className="inline-flex rounded-full bg-porcelain p-1">
          {[['entrada', 'Entrada'], ['saida', 'Saída']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setType(k)} className={`rounded-full px-4 py-1.5 font-semibold ${type === k ? 'bg-ink text-paper' : ''}`}>{l}</button>
          ))}
        </div>
        <Field label="Quantidade"><input className="input" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} required /></Field>
        <Field label="Motivo"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={type === 'entrada' ? 'Ex.: compra de 24 canecas brancas' : 'Ex.: caneca quebrou na prensa'} /></Field>
        {n ? <p className="text-muted">Novo estoque: <strong className="text-ink">{(product.stock || 0) + (type === 'entrada' ? n : -n)} un.</strong></p> : null}
      </form>
    </Modal>
  );
}

export default function Stock() {
  const { data } = useAdmin();
  const [q, setQ] = useState('');
  const [adjust, setAdjust] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const tracked = useMemo(() => {
    let l = data.products.filter((p) => showAll || p.trackStock);
    if (q.trim()) l = l.filter((p) => normalize(p.name).includes(normalize(q)));
    return l.sort((a, b) => (a.stock || 0) - (b.stock || 0));
  }, [data.products, q, showAll]);
  const moves = [...data.stock].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
  const value = data.products.filter((p) => p.trackStock).reduce((s, p) => s + (p.stock || 0) * (p.costPrice || 0), 0);

  return (
    <>
      <PageHeader title="Estoque" description={`Valor em estoque, pelo custo: ${money(value)}.`} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar produto" />
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />Mostrar também os produtos sob encomenda</label>
      </div>
      {tracked.length ? (
        <Table head={['Produto', 'Estoque', 'Mínimo', { label: 'Valor (custo)', right: true }, '']}>
          {tracked.map((p) => {
            const low = p.trackStock && p.stock <= (p.minStock || 0);
            return (
              <tr key={p.id}>
                <td className="px-4 py-3 font-semibold">{p.name}</td>
                <td className="px-4 py-3">{p.trackStock ? <span className={`rounded-full px-2.5 py-1 font-semibold ${low ? 'bg-red-100 text-danger' : 'bg-bamboo-soft text-bamboo'}`}>{p.stock} un.</span> : <span className="text-muted">Sem controle</span>}</td>
                <td className="px-4 py-3">{p.trackStock ? p.minStock || 0 : '—'}</td>
                <td className="px-4 py-3 text-right">{p.trackStock ? money((p.stock || 0) * (p.costPrice || 0)) : '—'}</td>
                <td className="px-4 py-3 text-right"><button type="button" className="btn-soft btn-sm" onClick={() => setAdjust(p)}>{p.trackStock ? 'Ajustar' : 'Começar a controlar'}</button></td>
              </tr>
            );
          })}
        </Table>
      ) : <Empty title="Nenhum produto com estoque controlado" text="Ative “Controlar estoque” no cadastro de produtos prontos, ou mostre os produtos sob encomenda acima." />}

      <h2 className="mb-3 mt-10 text-2xl font-bold">Últimas movimentações</h2>
      {moves.length ? (
        <Table head={['Quando', 'Produto', { label: 'Quantidade', right: true }, 'Motivo']}>
          {moves.map((m) => (
            <tr key={m.id}>
              <td className="px-4 py-2.5 text-muted">{dateTime(m.at)}</td>
              <td className="px-4 py-2.5">{data.products.find((p) => p.id === m.productId)?.name || m.productName}</td>
              <td className={`px-4 py-2.5 text-right font-semibold ${m.qty > 0 ? 'text-bamboo' : 'text-danger'}`}>{m.qty > 0 ? `+${m.qty}` : m.qty}</td>
              <td className="px-4 py-2.5">{m.reason}</td>
            </tr>
          ))}
        </Table>
      ) : <p className="text-muted">As entradas, saídas e vendas aparecem aqui.</p>}
      {adjust ? <AdjustModal product={adjust} onClose={() => setAdjust(null)} /> : null}
    </>
  );
}
