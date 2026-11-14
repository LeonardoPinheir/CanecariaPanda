import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fileUrl } from '../lib/api.js';
import { money } from '../lib/format.js';
import { ProductArt } from './Art.jsx';

export function ProductImage({ product, className = '', sizes }) {
  const img = product?.images?.[0];
  if (img) {
    return <img src={fileUrl(img)} alt={product.name} loading="lazy" sizes={sizes} className={`h-full w-full object-cover ${className}`} />;
  }
  return <ProductArt art={product?.art} className={`h-full w-full p-[8%] ${className}`} />;
}

export function ProductCard({ product, category }) {
  return (
    <Link to={`/produto/${product.slug}`} className="group flex flex-col">
      <div className="relative aspect-[10/9] overflow-hidden rounded-[var(--radius-blob)] bg-porcelain transition-colors group-hover:bg-orange-soft">
        <ProductImage product={product} className="transition-transform duration-300 group-hover:scale-[1.04]" />
        {product.trackStock && product.stock <= 0 ? (
          <span className="absolute left-4 top-4 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-paper">Esgotado</span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-col gap-1 px-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold leading-tight sm:text-xl group-hover:underline decoration-orange decoration-2 underline-offset-4">{product.name}</h3>
          {category ? <p className="text-sm text-muted">{category.name}</p> : null}
        </div>
        <p className="font-display text-xl font-bold whitespace-nowrap">{money(product.price)}</p>
      </div>
    </Link>
  );
}

export function Field({ label, hint, error, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label ? <span className="field-label">{label}</span> : null}
      {children}
      {hint && !error ? <span className="mt-1 block text-sm text-muted">{hint}</span> : null}
      {error ? <span className="mt-1 block text-sm font-medium text-danger">{error}</span> : null}
    </label>
  );
}

export function Notice({ tone = 'error', children, className = '' }) {
  const tones = {
    error: 'bg-red-50 text-danger border-red-200',
    ok: 'bg-bamboo-soft text-bamboo border-bamboo/20',
    info: 'bg-porcelain text-ink border-line',
  };
  if (!children) return null;
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm font-medium ${tones[tone]} ${className}`}>{children}</div>;
}

export function Spinner({ label = 'Carregando' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-line border-t-orange" />
      {label}…
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector('input,select,textarea,button')?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title}
        className={`toast-enter flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-paper sm:rounded-3xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-porcelain" aria-label="Fechar">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className="fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4 no-print" role="status">
      <div className={`toast-enter flex items-center gap-4 rounded-full py-2.5 pl-5 pr-2.5 text-sm font-medium shadow-lg ${toast.error ? 'bg-danger text-paper' : 'bg-ink text-paper'}`}>
        <span>{toast.text}</span>
        {toast.link ? <Link to={toast.link} onClick={onClose} className="rounded-full bg-orange px-3.5 py-1.5 font-semibold hover:bg-orange-dark">{toast.linkText}</Link> : null}
        <button type="button" onClick={onClose} aria-label="Fechar aviso" className="grid h-7 w-7 place-items-center rounded-full hover:bg-paper/15">×</button>
      </div>
    </div>
  );
}

export function QtyInput({ value, onChange, label = 'Quantidade' }) {
  return (
    <div className="inline-flex items-center rounded-full border-2 border-ink" role="group" aria-label={label}>
      <button type="button" className="h-9 w-9 rounded-full text-lg font-bold hover:bg-porcelain disabled:opacity-30" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Diminuir">−</button>
      <input className="w-10 bg-transparent text-center font-semibold outline-none" inputMode="numeric" value={value}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value.replace(/\D/g, '') || '1', 10)))} aria-label={label} />
      <button type="button" className="h-9 w-9 rounded-full text-lg font-bold hover:bg-porcelain" onClick={() => onChange(value + 1)} aria-label="Aumentar">+</button>
    </div>
  );
}

export const Icon = {
  cart: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2" /><circle cx="10" cy="20.5" r="1.3" /><circle cx="17" cy="20.5" r="1.3" /></svg>
  ),
  whatsapp: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2c.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" /></svg>
  ),
  instagram: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
  ),
  menu: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
  ),
  close: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
  ),
  search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
  ),
};
