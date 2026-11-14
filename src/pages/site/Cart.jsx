import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useShop } from '../../lib/shop.jsx';
import { api } from '../../lib/api.js';
import { Field, Notice, ProductImage, QtyInput, Spinner, Icon } from '../../components/ui.jsx';
import { money, phoneMask, onlyDigits, whatsappLink } from '../../lib/format.js';

function orderMessage(order, form) {
  const lines = order.items.map((i) => `• ${i.qty}x ${i.name}${i.custom ? ` (${i.custom})` : ''} — ${money(i.total)}`);
  return [
    `Olá! Fiz o pedido #${order.number} pelo site.`,
    `Código para acompanhar: ${order.code}`,
    '',
    ...lines,
    order.discount ? `Desconto: -${money(order.discount)}` : null,
    order.shipping ? `Entrega: ${money(order.shipping)}` : null,
    `Total: ${money(order.total)}`,
    '',
    `Nome: ${form.name}`,
    form.delivery === 'entrega' ? `Entregar em: ${form.address}` : 'Vou retirar na loja.',
    form.paymentMethod ? `Pagamento: ${form.paymentMethod}` : null,
  ].filter((l) => l !== null).join('\n');
}

function Success({ order, form, settings }) {
  const [copied, setCopied] = useState(false);
  const wa = whatsappLink(settings.whatsapp, orderMessage(order, form));
  const pix = form.paymentMethod?.toLowerCase().includes('pix') && settings.pixKey;
  return (
    <div className="container-site max-w-2xl pt-12">
      <div className="rounded-[3rem] bg-ink p-8 text-paper sm:p-12">
        <p className="text-lg text-paper/70">Pedido #{order.number}</p>
        <h1 className="mt-2 text-5xl font-extrabold">Recebemos seu pedido, {order.customerName}!</h1>
        <p className="mt-4 text-lg text-paper/80">
          Guarde este código para acompanhar a produção:
        </p>
        <p className="mt-3 inline-block rounded-2xl bg-paper px-5 py-2 font-display text-4xl font-extrabold tracking-[0.2em] text-ink">{order.code}</p>
        <p className="mt-6 text-paper/80">Total: <strong className="text-paper">{money(order.total)}</strong></p>
      </div>
      <div className="mt-8 space-y-4">
        {wa ? (
          <a href={wa} target="_blank" rel="noreferrer" className="btn w-full bg-bamboo py-3.5 text-lg text-paper hover:bg-ink">
            <Icon.whatsapp className="h-6 w-6" /> Enviar o pedido no WhatsApp
          </a>
        ) : null}
        <p className="text-center text-sm text-muted">Pelo WhatsApp você manda fotos e logos e recebe a arte para aprovar.</p>
        {pix ? (
          <div className="rounded-3xl border-2 border-ink p-6">
            <h2 className="text-2xl font-bold">Pagar com Pix</h2>
            <p className="mt-1 text-muted">Chave {settings.pixName ? `em nome de ${settings.pixName}` : 'da loja'}:</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <code className="rounded-xl bg-porcelain px-4 py-2 text-lg font-semibold">{settings.pixKey}</code>
              <button type="button" className="btn-soft btn-sm" onClick={() => navigator.clipboard?.writeText(settings.pixKey).then(() => setCopied(true))}>
                {copied ? 'Chave copiada' : 'Copiar chave'}
              </button>
            </div>
            <p className="mt-3 text-sm text-muted">Depois de pagar, mande o comprovante no WhatsApp.</p>
          </div>
        ) : null}
        <Link to={`/rastreio?codigo=${order.code}`} className="btn-ghost w-full py-3">Acompanhar o pedido</Link>
      </div>
    </div>
  );
}

export default function Cart() {
  const { catalog, lines, subtotal, setQty, remove, clear, settings, reload } = useShop();
  const [form, setForm] = useState({ name: '', phone: '', email: '', delivery: '', address: '', paymentMethod: '', notes: '', website: '' });
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!form.delivery && catalog) setForm((f) => ({ ...f, delivery: settings.allowPickup !== false ? 'retirada' : 'entrega' }));
  }, [catalog, settings, form.delivery]);
  // Recalcula o desconto quando o carrinho muda.
  useEffect(() => {
    if (!coupon) return;
    api('public/coupon', { method: 'POST', body: { code: coupon.code, subtotal } })
      .then(setCoupon).catch((e) => { setCoupon(null); setCouponError(e.message); });
  }, [subtotal]); // eslint-disable-line react-hooks/exhaustive-deps

  if (done) return <Success {...done} settings={settings} />;
  if (!catalog) return <Spinner />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'phone' ? phoneMask(e.target.value) : e.target.value }));
  const discount = coupon?.discount || 0;
  const after = subtotal - discount;
  const shipping = form.delivery === 'entrega' && !(settings.freeDeliveryFrom && after >= settings.freeDeliveryFrom) ? settings.deliveryFee || 0 : 0;
  const total = after + shipping;

  async function applyCoupon(e) {
    e.preventDefault();
    setCouponError('');
    try {
      setCoupon(await api('public/coupon', { method: 'POST', body: { code: couponInput, subtotal } }));
    } catch (err) {
      setCoupon(null);
      setCouponError(err.message);
    }
  }

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Informe seu nome.';
    if (onlyDigits(form.phone).length < 10) errs.phone = 'Informe um WhatsApp com DDD.';
    if (form.delivery === 'entrega' && !form.address.trim()) errs.address = 'Informe o endereço de entrega.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSending(true);
    setError('');
    try {
      const order = await api('public/orders', {
        method: 'POST',
        body: {
          customer: { name: form.name, phone: form.phone, email: form.email },
          items: lines.map((l) => ({ productId: l.productId, qty: l.qty, custom: l.custom })),
          coupon: coupon?.code || '', delivery: form.delivery, address: form.address,
          paymentMethod: form.paymentMethod, notes: form.notes, website: form.website,
        },
      });
      clear();
      setDone({ order, form });
      window.scrollTo(0, 0);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (!lines.length) {
    return (
      <div className="container-site max-w-2xl py-16 text-center">
        <h1 className="text-5xl font-extrabold">Seu carrinho está vazio</h1>
        <p className="mt-4 text-lg text-muted">Escolha um produto e conte como quer personalizar.</p>
        <Link to="/produtos" className="btn-primary mt-8 px-8 py-3.5 text-lg">Ver produtos</Link>
      </div>
    );
  }

  return (
    <div className="container-site pt-10">
      <h1 className="text-5xl font-extrabold sm:text-6xl">Carrinho</h1>
      <form onSubmit={submit} className="mt-10 grid gap-10 lg:grid-cols-[1fr_400px]" noValidate>
        <div className="space-y-10">
          <ul className="divide-y divide-line border-y border-line">
            {lines.map((l) => (
              <li key={l.key} className="flex gap-4 py-5">
                <Link to={`/produto/${l.product.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-porcelain sm:h-28 sm:w-28">
                  <ProductImage product={l.product} />
                </Link>
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex justify-between gap-3">
                    <Link to={`/produto/${l.product.slug}`} className="font-display text-xl font-semibold leading-tight hover:underline">{l.product.name}</Link>
                    <p className="font-display text-xl font-bold">{money(l.product.price * l.qty)}</p>
                  </div>
                  {l.custom ? <p className="text-sm text-muted">{l.custom}</p> : null}
                  <div className="mt-auto flex items-center gap-4">
                    <QtyInput value={l.qty} onChange={(v) => setQty(l.key, v)} />
                    <button type="button" className="text-sm font-semibold text-muted underline underline-offset-4 hover:text-danger" onClick={() => remove(l.key)}>Remover</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <fieldset className="space-y-4">
            <legend className="mb-4 font-display text-3xl font-bold">Seus dados</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome" error={errors.name}><input className="input" autoComplete="name" value={form.name} onChange={set('name')} /></Field>
              <Field label="WhatsApp" error={errors.phone}><input className="input" inputMode="tel" autoComplete="tel" placeholder="(63) 99999-9999" value={form.phone} onChange={set('phone')} /></Field>
            </div>
            <Field label="E-mail (opcional)"><input className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} /></Field>
            <input type="text" tabIndex={-1} autoComplete="off" className="hidden" value={form.website} onChange={set('website')} aria-hidden="true" />
          </fieldset>

          <fieldset>
            <legend className="mb-4 font-display text-3xl font-bold">Como quer receber?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {settings.allowPickup !== false ? (
                <label className={`cursor-pointer rounded-2xl border-2 p-4 ${form.delivery === 'retirada' ? 'border-ink bg-porcelain' : 'border-line'}`}>
                  <input type="radio" name="delivery" value="retirada" checked={form.delivery === 'retirada'} onChange={set('delivery')} className="sr-only" />
                  <span className="block font-semibold">Retirar na loja</span>
                  <span className="text-sm text-muted">Grátis. {settings.address}</span>
                </label>
              ) : null}
              {settings.allowDelivery !== false ? (
                <label className={`cursor-pointer rounded-2xl border-2 p-4 ${form.delivery === 'entrega' ? 'border-ink bg-porcelain' : 'border-line'}`}>
                  <input type="radio" name="delivery" value="entrega" checked={form.delivery === 'entrega'} onChange={set('delivery')} className="sr-only" />
                  <span className="block font-semibold">Receber em casa</span>
                  <span className="text-sm text-muted">{settings.deliveryFee ? money(settings.deliveryFee) : 'Grátis'}{settings.freeDeliveryFrom ? `, grátis acima de ${money(settings.freeDeliveryFrom)}` : ''}</span>
                </label>
              ) : null}
            </div>
            {form.delivery === 'entrega' ? (
              <Field label="Endereço completo" error={errors.address} className="mt-4">
                <textarea className="input min-h-20" autoComplete="street-address" placeholder="Rua, número, bairro e ponto de referência" value={form.address} onChange={set('address')} />
              </Field>
            ) : null}
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-4 font-display text-3xl font-bold">Pagamento e observações</legend>
            {settings.paymentMethods?.length ? (
              <Field label="Como prefere pagar?">
                <select className="input" value={form.paymentMethod} onChange={set('paymentMethod')}>
                  <option value="">Combino depois</option>
                  {settings.paymentMethods.map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>
            ) : null}
            <Field label="Observações (opcional)" hint="Data que precisa do pedido, cores, tema da festa…">
              <textarea className="input min-h-20" value={form.notes} onChange={set('notes')} />
            </Field>
          </fieldset>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[2rem] bg-porcelain p-6 sm:p-7">
            <h2 className="text-3xl font-bold">Resumo</h2>
            <div className="mt-5 flex gap-2">
              <label className="sr-only" htmlFor="cupom">Cupom de desconto</label>
              <input id="cupom" className="input uppercase" placeholder="Cupom" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} />
              <button type="button" className="btn-primary" onClick={applyCoupon} disabled={!couponInput.trim()}>Aplicar</button>
            </div>
            {couponError ? <p className="mt-2 text-sm font-medium text-danger">{couponError}</p> : null}
            {coupon ? <p className="mt-2 text-sm font-semibold text-bamboo">Cupom {coupon.code} aplicado.</p> : null}
            <dl className="mt-6 space-y-2.5">
              <div className="flex justify-between"><dt>Produtos</dt><dd>{money(subtotal)}</dd></div>
              {discount ? <div className="flex justify-between text-bamboo"><dt>Desconto</dt><dd>−{money(discount)}</dd></div> : null}
              {form.delivery === 'entrega' ? <div className="flex justify-between"><dt>Entrega</dt><dd>{shipping ? money(shipping) : 'Grátis'}</dd></div> : null}
              <div className="flex justify-between border-t border-porcelain-dark pt-3 font-display text-2xl font-bold"><dt>Total</dt><dd>{money(total)}</dd></div>
            </dl>
            <Notice className="mt-5">{error}</Notice>
            <button className="btn-orange mt-5 w-full py-3.5 text-lg" disabled={sending}>{sending ? 'Enviando pedido…' : 'Fazer pedido'}</button>
            <p className="mt-3 text-center text-sm text-muted">Depois do pedido, combinamos a arte e o pagamento pelo WhatsApp.</p>
          </div>
        </aside>
      </form>
    </div>
  );
}
