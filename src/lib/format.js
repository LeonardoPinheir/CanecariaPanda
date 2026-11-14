const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const money = (n) => brl.format(Number(n) || 0);

export const date = (iso) => (iso ? new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('pt-BR') : '');
export const dateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
export const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
export const localDay = (iso) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const STATUS = {
  novo: { label: 'Recebido', tone: 'bg-orange-soft text-orange-dark', help: 'Recebemos seu pedido e vamos confirmar os detalhes com você.' },
  confirmado: { label: 'Confirmado', tone: 'bg-sky-100 text-sky-800', help: 'Pedido confirmado. A arte está sendo preparada.' },
  producao: { label: 'Em produção', tone: 'bg-violet-100 text-violet-800', help: 'Seu pedido está sendo impresso.' },
  pronto: { label: 'Pronto', tone: 'bg-bamboo-soft text-bamboo', help: 'Pronto para retirada ou entrega.' },
  enviado: { label: 'Saiu para entrega', tone: 'bg-amber-100 text-amber-800', help: 'O pedido está a caminho.' },
  entregue: { label: 'Entregue', tone: 'bg-ink text-paper', help: 'Pedido entregue. Obrigado pela compra!' },
  cancelado: { label: 'Cancelado', tone: 'bg-red-100 text-danger', help: 'Este pedido foi cancelado.' },
};
export const STATUS_FLOW = ['novo', 'confirmado', 'producao', 'pronto', 'enviado', 'entregue'];

export const onlyDigits = (s) => String(s || '').replace(/\D/g, '');
export function phoneMask(v) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
export function whatsappLink(phone, text = '') {
  let d = onlyDigits(phone);
  if (!d) return '';
  if (d.length <= 11) d = '55' + d;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
export const instagramLink = (handle) =>
  handle ? (handle.startsWith('http') ? handle : `https://instagram.com/${handle.replace('@', '')}`) : '';

export function normalize(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
