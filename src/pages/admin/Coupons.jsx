import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useAdmin, PageHeader, Table, Empty, Toggle, MoneyInput } from './common.jsx';
import { Field, Modal, Notice } from '../../components/ui.jsx';
import { date, money } from '../../lib/format.js';

const blank = { code: '', type: 'percent', value: '', minTotal: '', active: true, expiresAt: '', maxUses: 0 };

function CouponModal({ coupon, onClose }) {
  const { run } = useAdmin();
  const [f, setF] = useState(coupon ? { ...blank, ...coupon } : blank);
  const [error, setError] = useState('');
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const save = (e) => {
    e.preventDefault();
    run(() => (coupon ? api(`admin/coupons/${coupon.id}`, { method: 'PUT', body: f }) : api('admin/coupons', { method: 'POST', body: f })), 'Cupom salvo')
      .then(onClose).catch((err) => setError(err.message));
  };
  return (
    <Modal open onClose={onClose} title={coupon ? `Cupom ${coupon.code}` : 'Novo cupom'}
      footer={<><button type="button" className="btn-soft" onClick={onClose}>Cancelar</button><button form="cup" className="btn-primary">Salvar cupom</button></>}>
      <form id="cup" onSubmit={save} className="space-y-4">
        <Field label="Código" hint="O cliente digita esse código no carrinho."><input className="input uppercase" value={f.code} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s/g, ''))} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <select className="input" value={f.type} onChange={(e) => set('type', e.target.value)}>
              <option value="percent">Porcentagem</option>
              <option value="fixed">Valor fixo</option>
            </select>
          </Field>
          <Field label={f.type === 'percent' ? 'Desconto (%)' : 'Desconto (R$)'}>
            {f.type === 'percent' ? <input className="input" type="number" min="1" max="100" value={f.value} onChange={(e) => set('value', e.target.value)} /> : <MoneyInput value={f.value} onChange={(v) => set('value', v)} />}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Compra mínima"><MoneyInput value={f.minTotal} onChange={(v) => set('minTotal', v)} /></Field>
          <Field label="Limite de usos" hint="0 = sem limite"><input className="input" type="number" min="0" value={f.maxUses} onChange={(e) => set('maxUses', e.target.value)} /></Field>
        </div>
        <Field label="Válido até (opcional)"><input className="input" type="date" value={f.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} /></Field>
        <Toggle checked={f.active} onChange={(v) => set('active', v)} label="Cupom ativo" />
        <Notice>{error}</Notice>
      </form>
    </Modal>
  );
}

export default function Coupons() {
  const { data, run } = useAdmin();
  const [open, setOpen] = useState(null);
  return (
    <>
      <PageHeader title="Cupons" description="Descontos que o cliente usa no carrinho do site.">
        <button type="button" className="btn-primary" onClick={() => setOpen('new')}>Novo cupom</button>
      </PageHeader>
      {data.coupons.length ? (
        <Table head={['Código', 'Desconto', 'Regras', 'Usos', 'Situação', '']}>
          {data.coupons.map((c) => {
            const expired = c.expiresAt && c.expiresAt < new Date().toISOString().slice(0, 10);
            return (
              <tr key={c.id}>
                <td className="px-4 py-3"><button type="button" className="font-mono font-bold hover:underline" onClick={() => setOpen(c)}>{c.code}</button></td>
                <td className="px-4 py-3 font-semibold">{c.type === 'percent' ? `${c.value}%` : money(c.value)}</td>
                <td className="px-4 py-3 text-muted">{[c.minTotal ? `Acima de ${money(c.minTotal)}` : null, c.expiresAt ? `Até ${date(c.expiresAt)}` : null].filter(Boolean).join(', ') || 'Sem regras'}</td>
                <td className="px-4 py-3">{c.uses || 0}{c.maxUses ? ` de ${c.maxUses}` : ''}</td>
                <td className="px-4 py-3">{expired ? <span className="text-muted">Expirado</span> : c.active ? <span className="font-semibold text-bamboo">Ativo</span> : <span className="text-muted">Pausado</span>}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="text-sm font-semibold text-muted hover:text-danger" onClick={() => window.confirm(`Apagar o cupom ${c.code}?`) && run(() => api(`admin/coupons/${c.id}`, { method: 'DELETE' }), 'Cupom apagado').catch(() => {})}>Apagar</button>
                </td>
              </tr>
            );
          })}
        </Table>
      ) : <Empty title="Nenhum cupom" text="Crie cupons para campanhas, datas especiais e clientes fiéis." />}
      {open ? <CouponModal coupon={open === 'new' ? null : open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}
