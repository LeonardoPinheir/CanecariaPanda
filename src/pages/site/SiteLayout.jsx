import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useShop } from '../../lib/shop.jsx';
import { PandaMark } from '../../components/Art.jsx';
import { Icon, Toast, Notice } from '../../components/ui.jsx';
import { instagramLink, whatsappLink } from '../../lib/format.js';

const NAV = [
  ['/produtos', 'Produtos'],
  ['/servicos', 'Serviços'],
  ['/rastreio', 'Acompanhar pedido'],
  ['/contato', 'Contato'],
];

export function Logo({ light = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Canecaria Panda, página inicial">
      <PandaMark size={38} />
      <span className={`whitespace-nowrap font-display text-[1.3rem] font-extrabold leading-none tracking-tight sm:text-[1.6rem] ${light ? 'text-paper' : ''}`}>
        Canecaria<span className="text-orange"> Panda</span>
      </span>
    </Link>
  );
}

export default function SiteLayout() {
  const { count, toast, setToast, settings, error, reload } = useShop();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);

  const wa = whatsappLink(settings.whatsapp, 'Olá! Vim pelo site da Canecaria Panda.');
  const ig = instagramLink(settings.instagram);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">Ir para o conteúdo</a>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur no-print">
        <div className="container-site flex h-[74px] items-center justify-between gap-4">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
            {NAV.map(([to, label]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `rounded-full px-4 py-2 font-semibold transition-colors ${isActive ? 'bg-ink text-paper' : 'hover:bg-porcelain'}`}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/carrinho" className="relative grid h-11 w-11 place-items-center rounded-full bg-porcelain hover:bg-orange-soft" aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}>
              <Icon.cart className="h-6 w-6" />
              {count > 0 ? <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-orange px-1.5 text-xs font-bold text-paper">{count}</span> : null}
            </Link>
            <button type="button" className="grid h-11 w-11 place-items-center rounded-full hover:bg-porcelain lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu">
              {open ? <Icon.close className="h-6 w-6" /> : <Icon.menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {open ? (
          <nav className="border-t border-line bg-paper lg:hidden" aria-label="Menu do celular">
            <div className="container-site flex flex-col py-3">
              {[...NAV, ['/area-cliente', 'Meus pedidos']].map(([to, label]) => (
                <NavLink key={to} to={to} className="rounded-xl px-3 py-3 font-display text-xl font-semibold hover:bg-porcelain">{label}</NavLink>
              ))}
            </div>
          </nav>
        ) : null}
      </header>

      <main id="conteudo" className="flex-1">
        {error ? (
          <div className="container-site py-16">
            <Notice>{error}</Notice>
            <button type="button" className="btn-primary mt-4" onClick={reload}>Tentar de novo</button>
          </div>
        ) : <Outlet />}
      </main>

      <footer className="mt-24 bg-ink text-paper no-print">
        <div className="container-site grid gap-10 py-14 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <Logo light />
            <p className="mt-4 max-w-sm text-paper/75">{settings.about}</p>
            <div className="mt-5 flex gap-2">
              {wa ? <a href={wa} target="_blank" rel="noreferrer" className="grid h-11 w-11 place-items-center rounded-full bg-paper/10 hover:bg-orange" aria-label="WhatsApp"><Icon.whatsapp className="h-5 w-5" /></a> : null}
              {ig ? <a href={ig} target="_blank" rel="noreferrer" className="grid h-11 w-11 place-items-center rounded-full bg-paper/10 hover:bg-orange" aria-label="Instagram"><Icon.instagram className="h-5 w-5" /></a> : null}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold">Loja</h2>
            <ul className="mt-3 space-y-2 text-paper/75">
              <li><Link className="hover:text-orange" to="/produtos">Todos os produtos</Link></li>
              <li><Link className="hover:text-orange" to="/servicos">Serviços</Link></li>
              <li><Link className="hover:text-orange" to="/rastreio">Acompanhar pedido</Link></li>
              <li><Link className="hover:text-orange" to="/area-cliente">Meus pedidos</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-bold">Onde estamos</h2>
            <p className="mt-3 text-paper/75">{settings.address}</p>
            <p className="mt-2 text-paper/75">{settings.hours}</p>
          </div>
        </div>
        <div className="border-t border-paper/10">
          <div className="container-site flex flex-wrap items-center justify-between gap-3 py-5 text-sm text-paper/55">
            <p>© {new Date().getFullYear()} {settings.storeName || 'Canecaria Panda'}</p>
            <Link to="/admin" className="hover:text-paper">Área da equipe</Link>
          </div>
        </div>
      </footer>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
