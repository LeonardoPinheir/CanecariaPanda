import { useShop } from '../../lib/shop.jsx';
import { Icon } from '../../components/ui.jsx';
import { whatsappLink } from '../../lib/format.js';

export default function Services() {
  const { settings } = useShop();
  const services = settings.services || [];
  return (
    <div className="container-site pt-10">
      <h1 className="max-w-3xl text-5xl font-extrabold sm:text-6xl">Serviços de personalização</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">Fazemos de uma peça para presente até pedidos grandes para empresas e eventos. Conte o que precisa e mandamos o orçamento.</p>
      <ul className="mt-12 grid gap-x-12 md:grid-cols-2">
        {services.map((s) => {
          const wa = whatsappLink(settings.whatsapp, `Olá! Quero um orçamento de: ${s.title}.`);
          return (
            <li key={s.title} className="flex flex-col border-t-[3px] border-ink py-7">
              <h2 className="text-3xl font-bold">{s.title}</h2>
              <p className="mt-2 flex-1 text-lg text-muted">{s.text}</p>
              {wa ? <a href={wa} target="_blank" rel="noreferrer" className="link mt-4 inline-flex w-fit items-center gap-2 font-semibold"><Icon.whatsapp className="h-5 w-5 text-bamboo" />Pedir orçamento</a> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
