import { useCallback, useEffect, useState } from 'react';
import { NavLink, Route, Routes, Link, useLocation } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { PandaMark } from '../../components/Art.jsx';
import { Field, Notice, Spinner, Toast, Icon } from '../../components/ui.jsx';
import { AdminDataProvider, useAdmin } from './common.jsx';
import Dashboard from './Dashboard.jsx';
import Orders from './Orders.jsx';
import Pos from './Pos.jsx';
import Products from './Products.jsx';
import Categories from './Categories.jsx';
import Stock from './Stock.jsx';
import Customers from './Customers.jsx';
import Coupons from './Coupons.jsx';
import Finance from './Finance.jsx';
import Reports from './Reports.jsx';
import Settings from './Settings.jsx';

const NAV = [
  ['', 'Visão geral'],
  ['pedidos', 'Pedidos'],
  ['pdv', 'Vender no balcão'],
  ['produtos', 'Produtos'],
  ['categorias', 'Categorias'],
  ['estoque', 'Estoque'],
  ['clientes', 'Clientes'],
  ['cupons', 'Cupons'],
  ['financeiro', 'Financeiro'],
  ['relatorios', 'Relatórios'],
  ['configuracoes', 'Configurações'],
];

function Login({ info, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const r = await api('auth/login', { method: 'POST', body: { email, password } });
      onLogin(r.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="grid min-h-dvh place-items-center bg-ink px-5 py-10">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[2.5rem] bg-paper p-8">
        <PandaMark size={64} />
        <h1 className="mt-4 text-4xl font-extrabold">Painel da loja</h1>
        <p className="mt-1 text-muted">Entre com o e-mail e a senha da equipe.</p>
        {info?.firstAccess && !info.demoHint ? (
          <Notice tone="info" className="mt-5">Primeiro acesso: use o e-mail de ADMIN_EMAIL e a senha de ADMIN_PASSWORD cadastrados na Vercel. Depois troque a senha em Configurações.</Notice>
        ) : null}
        {info?.demoHint ? (
          <Notice tone="info" className="mt-5">Prévia de demonstração: os dados não são salvos. Entre com {info.demoHint.email} e a senha {info.demoHint.password}.</Notice>
        ) : null}
        <div className="mt-6 space-y-4">
          <Field label="E-mail"><input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          <Field label="Senha"><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        </div>
        <Notice className="mt-4">{error}</Notice>
        <button className="btn-primary mt-6 w-full py-3" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
        <Link to="/" className="mt-5 block text-center text-sm text-muted hover:text-ink">Voltar para a loja</Link>
      </form>
    </div>
  );
}

function Shell() {
  const { data, error, reload, user, onLogout, toast, setToast, mode } = useAdmin();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  const newOrders = data?.orders.filter((o) => o.status === 'novo').length || 0;

  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label="Painel">
      {NAV.map(([to, label]) => (
        <NavLink key={to} to={`/admin/${to}`} end={to === ''}
          className={({ isActive }) => `flex items-center justify-between rounded-xl px-3.5 py-2.5 font-semibold transition-colors ${isActive ? 'bg-paper text-ink' : 'text-paper/75 hover:bg-paper/10 hover:text-paper'}`}>
          {label}
          {to === 'pedidos' && newOrders ? <span className="rounded-full bg-orange px-2 py-0.5 text-xs text-paper">{newOrders}</span> : null}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[250px_1fr]">
      <div className="hidden bg-ink lg:block no-print">
      <aside className="sticky top-0 flex h-dvh flex-col p-4">
        <Link to="/admin" className="mb-6 flex items-center gap-2 px-2 pt-2">
          <PandaMark size={38} />
          <span className="whitespace-nowrap font-display text-lg font-extrabold text-paper">Canecaria<span className="text-orange"> Panda</span></span>
        </Link>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <div className="mt-4 border-t border-paper/15 pt-4 text-sm text-paper/70">
          <p className="truncate px-2">{user.name || user.email}</p>
          <div className="mt-2 flex gap-2 px-2">
            <a href="/" target="_blank" rel="noreferrer" className="hover:text-paper">Ver loja</a>
            <span aria-hidden="true">|</span>
            <button type="button" onClick={onLogout} className="hover:text-paper">Sair</button>
          </div>
        </div>
      </aside>
      </div>

      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 lg:hidden no-print">
        <Link to="/admin" className="flex items-center gap-2"><PandaMark size={34} /><span className="font-display text-lg font-extrabold text-paper">Painel</span></Link>
        <button type="button" onClick={() => setOpen((o) => !o)} className="grid h-10 w-10 place-items-center rounded-full text-paper hover:bg-paper/10" aria-expanded={open} aria-label="Menu">
          {open ? <Icon.close className="h-6 w-6" /> : <Icon.menu className="h-6 w-6" />}
        </button>
      </header>
      {open ? (
        <div className="fixed inset-x-0 top-16 bottom-0 z-30 overflow-y-auto bg-ink p-4 lg:hidden">
          {nav}
          <button type="button" onClick={onLogout} className="mt-4 px-3.5 text-paper/75">Sair</button>
        </div>
      ) : null}

      <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-10">
        {mode === 'memory' ? <Notice tone="info" className="mb-6 no-print">Prévia de demonstração: as alterações somem quando o servidor reinicia. Na loja publicada, tudo é salvo no GitHub.</Notice> : null}
        {error && !data ? (
          <div><Notice>{error}</Notice><button type="button" className="btn-primary mt-4" onClick={reload}>Tentar de novo</button></div>
        ) : !data ? <Spinner /> : (
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="pedidos" element={<Orders />} />
            <Route path="pdv" element={<Pos />} />
            <Route path="produtos" element={<Products />} />
            <Route path="categorias" element={<Categories />} />
            <Route path="estoque" element={<Stock />} />
            <Route path="clientes" element={<Customers />} />
            <Route path="cupons" element={<Coupons />} />
            <Route path="financeiro" element={<Finance />} />
            <Route path="relatorios" element={<Reports />} />
            <Route path="configuracoes" element={<Settings />} />
            <Route path="*" element={<p>Página não encontrada. <Link className="link" to="/admin">Voltar</Link></p>} />
          </Routes>
        )}
      </main>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export default function AdminApp() {
  const [info, setInfo] = useState(null);
  const [user, setUser] = useState(null);
  const load = useCallback(() => api('auth/me').then((r) => { setInfo(r); setUser(r.user); }).catch(() => setInfo({})), []);
  useEffect(() => { load(); document.title = 'Painel | Canecaria Panda'; }, [load]);
  const logout = useCallback(async () => {
    await api('auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    load();
  }, [load]);

  if (!info) return <Spinner label="Abrindo o painel" />;
  if (!user) return <Login info={info} onLogin={setUser} />;
  return (
    <AdminDataProvider user={user} mode={info.mode} onLogout={logout}>
      <Shell />
    </AdminDataProvider>
  );
}
