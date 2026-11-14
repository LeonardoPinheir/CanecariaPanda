import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export const ALL = ['settings', 'categories', 'products', 'customers', 'orders', 'coupons', 'finance', 'stock'];

const AdminContext = createContext(null);

export function AdminDataProvider({ user, mode, onLogout, children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const reload = useCallback(async () => {
    try {
      const d = await api(`admin/data?c=${ALL.join(',')}`);
      setData(d);
      setError('');
      return d;
    } catch (e) {
      if (e.status === 401) onLogout();
      setError(e.message);
      return null;
    }
  }, [onLogout]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Executa uma ação na API, recarrega os dados e mostra o aviso.
  const run = useCallback(async (fn, okText) => {
    try {
      const r = await fn();
      await reload();
      if (okText) setToast({ text: okText });
      return r;
    } catch (e) {
      if (e.status === 401) onLogout();
      setToast({ text: e.message, error: true });
      throw e;
    }
  }, [reload, onLogout]);

  return (
    <AdminContext.Provider value={{ data, error, reload, run, toast, setToast, user, mode, onLogout }}>
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => useContext(AdminContext);

export function PageHeader({ title, children, description }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl font-extrabold">{title}</h1>
        {description ? <p className="mt-1 text-muted">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

export function Stat({ label, value, sub, tone = '' }) {
  return (
    <div className={`rounded-2xl border border-line p-5 ${tone}`}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold leading-none">{value}</p>
      {sub ? <p className="mt-2 text-sm text-muted">{sub}</p> : null}
    </div>
  );
}

export function Empty({ title, text, children }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-line px-6 py-12 text-center">
      <p className="font-display text-2xl font-bold">{title}</p>
      {text ? <p className="mx-auto mt-1 max-w-md text-muted">{text}</p> : null}
      {children ? <div className="mt-5 flex justify-center gap-2">{children}</div> : null}
    </div>
  );
}

export function Table({ head, children, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-2xl border border-line ${className}`}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-porcelain text-muted">
          <tr>{head.map((h, i) => <th key={i} className={`px-4 py-3 font-semibold ${h.right ? 'text-right' : ''}`}>{h.label ?? h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Buscar' }) {
  return (
    <label className="relative block w-full sm:w-72">
      <span className="sr-only">{placeholder}</span>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input className="input py-2 pl-10" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-bamboo peer-focus-visible:ring-2 peer-focus-visible:ring-orange" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-paper shadow transition-transform peer-checked:translate-x-5" />
      </span>
      <span>
        <span className="block font-semibold">{label}</span>
        {hint ? <span className="block text-sm text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

export function MoneyInput({ value, onChange, ...rest }) {
  const [text, setText] = useState(value === '' || value == null ? '' : String(value).replace('.', ','));
  useEffect(() => {
    const parsed = parseFloat(text.replace(/\./g, '').replace(',', '.'));
    if ((Number.isNaN(parsed) ? '' : parsed) !== value) setText(value === '' || value == null ? '' : String(value).replace('.', ','));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">R$</span>
      <input className="input pl-10" inputMode="decimal" value={text} {...rest}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d,.]/g, '');
          setText(t);
          const n = parseFloat(t.replace(/\./g, '').replace(',', '.'));
          onChange(Number.isNaN(n) ? '' : n);
        }} />
    </div>
  );
}

// Utilitário de período usado em relatórios e financeiro.
export function inRange(iso, from, to) {
  const d = iso.slice(0, 10);
  return (!from || d >= from) && (!to || d <= to);
}
