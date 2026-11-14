import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useAdmin, PageHeader, Toggle, MoneyInput } from './common.jsx';
import { Field, Notice } from '../../components/ui.jsx';
import { phoneMask, date } from '../../lib/format.js';

function Section({ title, description, children }) {
  return (
    <section className="grid gap-6 border-t border-line py-8 lg:grid-cols-[260px_1fr]">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      <div className="max-w-2xl space-y-4">{children}</div>
    </section>
  );
}

const lines = (arr) => (arr || []).join('\n');
const fromLines = (t) => t.split('\n').map((s) => s.trim()).filter(Boolean);

function Admins() {
  const { user, setToast } = useAdmin();
  const [list, setList] = useState([]);
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [error, setError] = useState('');
  const [pwError, setPwError] = useState('');
  const load = () => api('admin/admins').then(setList).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('admin/admins', { method: 'POST', body: f });
      setF({ name: '', email: '', password: '' });
      setToast({ text: 'Acesso criado' });
      load();
    } catch (err) { setError(err.message); }
  };
  const remove = async (email) => {
    if (!window.confirm(`Remover o acesso de ${email}?`)) return;
    try { await api(`admin/admins/${encodeURIComponent(email)}`, { method: 'DELETE' }); load(); } catch (err) { setToast({ text: err.message, error: true }); }
  };
  const changePw = async (e) => {
    e.preventDefault();
    setPwError('');
    try {
      await api('admin/password', { method: 'POST', body: pw });
      setPw({ currentPassword: '', newPassword: '' });
      setToast({ text: 'Senha trocada' });
    } catch (err) { setPwError(err.message); }
  };

  return (
    <>
      <Section title="Quem acessa o painel" description="Cada pessoa da equipe entra com o próprio e-mail e senha.">
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {list.map((a) => (
            <li key={a.email} className="flex items-center justify-between gap-3 px-4 py-3">
              <div><p className="font-semibold">{a.name}</p><p className="text-sm text-muted">{a.email}, desde {date(a.createdAt)}</p></div>
              {a.email !== user.email ? <button type="button" className="text-sm font-semibold text-muted hover:text-danger" onClick={() => remove(a.email)}>Remover</button> : <span className="text-sm text-muted">Você</span>}
            </li>
          ))}
        </ul>
        <form onSubmit={add} className="grid gap-3 rounded-2xl bg-porcelain p-4 sm:grid-cols-3">
          <input className="input" placeholder="Nome" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Nome" />
          <input className="input" type="email" placeholder="E-mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} aria-label="E-mail" required />
          <input className="input" type="password" placeholder="Senha (mín. 8)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} aria-label="Senha" required autoComplete="new-password" />
          <button className="btn-primary sm:col-span-3 sm:justify-self-start">Dar acesso</button>
          <Notice className="sm:col-span-3">{error}</Notice>
        </form>
      </Section>
      <Section title="Minha senha">
        <form onSubmit={changePw} className="grid gap-3 sm:grid-cols-2">
          <Field label="Senha atual"><input className="input" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required /></Field>
          <Field label="Nova senha"><input className="input" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required /></Field>
          <button className="btn-primary sm:justify-self-start">Trocar senha</button>
          <Notice className="sm:col-span-2">{pwError}</Notice>
        </form>
      </Section>
    </>
  );
}

export default function Settings() {
  const { data, run } = useAdmin();
  const [s, setS] = useState(() => ({ ...data.settings }));
  const [pm, setPm] = useState(lines(data.settings.paymentMethods));
  const [fr, setFr] = useState(lines(data.settings.financeCategories?.receita));
  const [fd, setFd] = useState(lines(data.settings.financeCategories?.despesa));
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setS((x) => ({ ...x, [k]: v }));
  const txt = (k, label, props = {}) => (
    <Field label={label} hint={props.hint}>
      {props.area ? <textarea className="input min-h-24" value={s[k] || ''} onChange={(e) => set(k, e.target.value)} />
        : <input className="input" value={s[k] || ''} placeholder={props.placeholder} onChange={(e) => set(k, props.phone ? phoneMask(e.target.value) : e.target.value)} />}
    </Field>
  );

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await run(() => api('admin/settings', {
        method: 'PUT',
        body: { ...s, paymentMethods: fromLines(pm), financeCategories: { receita: fromLines(fr), despesa: fromLines(fd) } },
      }), 'Configurações salvas. A loja já mostra as mudanças.');
    } catch { /* aviso exibido */ } finally { setBusy(false); }
  };
  const services = s.services || [];
  const setService = (i, patch) => set('services', services.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <>
      <PageHeader title="Configurações" description="Textos, contatos, entrega e pagamento que aparecem na loja." />
      <form onSubmit={save}>
        <Section title="Loja" description="Nome e textos da página inicial.">
          {txt('storeName', 'Nome da loja')}
          {txt('heroTitle', 'Título da página inicial')}
          {txt('heroText', 'Texto abaixo do título', { area: true })}
          {txt('about', 'Sobre a loja (rodapé)', { area: true })}
        </Section>
        <Section title="Contato" description="O WhatsApp recebe os pedidos e as dúvidas dos clientes.">
          <div className="grid gap-4 sm:grid-cols-2">
            {txt('whatsapp', 'WhatsApp', { phone: true, placeholder: '(63) 99999-9999' })}
            {txt('instagram', 'Instagram', { placeholder: '@canecariapanda' })}
          </div>
          {txt('email', 'E-mail')}
          {txt('address', 'Endereço')}
          {txt('hours', 'Horário de atendimento')}
        </Section>
        <Section title="Entrega e prazo">
          <Toggle checked={s.allowPickup} onChange={(v) => set('allowPickup', v)} label="Retirada na loja" />
          <Toggle checked={s.allowDelivery} onChange={(v) => set('allowDelivery', v)} label="Entrega" />
          {s.allowDelivery ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Taxa de entrega"><MoneyInput value={s.deliveryFee} onChange={(v) => set('deliveryFee', v)} /></Field>
              <Field label="Entrega grátis a partir de" hint="Deixe vazio para nunca ser grátis"><MoneyInput value={s.freeDeliveryFrom} onChange={(v) => set('freeDeliveryFrom', v)} /></Field>
            </div>
          ) : null}
          {txt('productionDays', 'Prazo de produção', { placeholder: '3 a 5 dias úteis' })}
        </Section>
        <Section title="Pagamento" description="A chave Pix aparece para o cliente que escolher Pix no pedido.">
          <Field label="Formas de pagamento" hint="Uma por linha"><textarea className="input min-h-28" value={pm} onChange={(e) => setPm(e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            {txt('pixKey', 'Chave Pix')}
            {txt('pixName', 'Nome do titular do Pix')}
          </div>
        </Section>
        <Section title="Serviços" description="Aparecem na página Serviços e na página inicial.">
          {services.map((x, i) => (
            <div key={i} className="space-y-2 rounded-2xl border border-line p-4">
              <div className="flex gap-2">
                <input className="input font-semibold" value={x.title} onChange={(e) => setService(i, { title: e.target.value })} aria-label="Nome do serviço" />
                <button type="button" className="btn-soft btn-sm" onClick={() => set('services', services.filter((_, j) => j !== i))}>Remover</button>
              </div>
              <textarea className="input min-h-16" value={x.text} onChange={(e) => setService(i, { text: e.target.value })} aria-label="Descrição do serviço" />
            </div>
          ))}
          <button type="button" className="btn-soft" onClick={() => set('services', [...services, { title: 'Novo serviço', text: '' }])}>Adicionar serviço</button>
        </Section>
        <Section title="Categorias do financeiro">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Entradas" hint="Uma por linha"><textarea className="input min-h-32" value={fr} onChange={(e) => setFr(e.target.value)} /></Field>
            <Field label="Despesas" hint="Uma por linha"><textarea className="input min-h-32" value={fd} onChange={(e) => setFd(e.target.value)} /></Field>
          </div>
        </Section>
        <div className="sticky bottom-0 z-10 -mx-5 border-t border-line bg-paper/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
          <button className="btn-orange px-8" disabled={busy}>{busy ? 'Salvando…' : 'Salvar configurações'}</button>
        </div>
      </form>
      <Admins />
    </>
  );
}
