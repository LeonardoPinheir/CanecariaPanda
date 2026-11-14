import { Link } from 'react-router-dom';
import { useShop } from '../../lib/shop.jsx';
import { Icon } from '../../components/ui.jsx';
import { instagramLink, phoneMask, whatsappLink } from '../../lib/format.js';

export default function Contact() {
  const { settings } = useShop();
  const wa = whatsappLink(settings.whatsapp, 'Olá! Vim pelo site da Canecaria Panda.');
  const ig = instagramLink(settings.instagram);
  const rows = [
    settings.whatsapp && ['WhatsApp', phoneMask(settings.whatsapp), wa],
    settings.instagram && ['Instagram', `@${settings.instagram.replace(/^@|https?:\/\/(www\.)?instagram\.com\//g, '').replace(/\/$/, '')}`, ig],
    settings.email && ['E-mail', settings.email, `mailto:${settings.email}`],
    settings.address && ['Endereço', settings.address],
    settings.hours && ['Horário', settings.hours],
  ].filter(Boolean);
  return (
    <div className="container-site grid gap-12 pt-10 lg:grid-cols-[1fr_1fr]">
      <div>
        <h1 className="text-5xl font-extrabold sm:text-6xl">Fale com a gente</h1>
        <p className="mt-4 max-w-lg text-lg text-muted">Dúvidas, orçamentos para empresas ou aquela ideia de presente que ainda não sabe como fazer: chame no WhatsApp.</p>
        {wa ? <a href={wa} target="_blank" rel="noreferrer" className="btn mt-8 bg-bamboo px-7 py-3.5 text-lg text-paper hover:bg-ink"><Icon.whatsapp className="h-6 w-6" />Chamar no WhatsApp</a> : null}
        <p className="mt-8 text-muted">Já fez um pedido? <Link to="/rastreio" className="link font-semibold text-ink">Acompanhe por aqui</Link>.</p>
      </div>
      <dl className="divide-y divide-line self-start border-y-[3px] border-ink">
        {rows.map(([label, value, href]) => (
          <div key={label} className="grid gap-1 py-5 sm:grid-cols-[140px_1fr]">
            <dt className="text-muted">{label}</dt>
            <dd className="text-lg font-semibold">{href ? <a href={href} target="_blank" rel="noreferrer" className="hover:text-orange">{value}</a> : value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
