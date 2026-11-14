import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const ShopContext = createContext(null);
const CART_KEY = 'canecaria-carrinho';

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

export function ShopProvider({ children }) {
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState('');
  const [cart, setCart] = useState(loadCart);
  const [toast, setToast] = useState(null);

  const reload = useCallback(() => {
    setError('');
    return api('public/catalog').then(setCatalog).catch((e) => setError(e.message));
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* modo privado */ }
  }, [cart]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const products = catalog?.products || [];
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  // Itens do carrinho com dados atuais do catálogo; itens que saíram do catálogo somem.
  const lines = useMemo(
    () => cart.map((l) => ({ ...l, product: byId[l.productId] })).filter((l) => !catalog || l.product),
    [cart, byId, catalog],
  );
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + (l.product?.price || 0) * l.qty, 0);

  const add = useCallback((product, qty = 1, custom = '') => {
    setCart((c) => {
      const key = `${product.id}|${custom.trim()}`;
      const existing = c.find((l) => l.key === key);
      if (existing) return c.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l));
      return [...c, { key, productId: product.id, qty, custom: custom.trim() }];
    });
    setToast({ text: `${product.name} foi para o carrinho.`, link: '/carrinho', linkText: 'Ver carrinho' });
  }, []);
  const setQty = (key, qty) => setCart((c) => c.map((l) => (l.key === key ? { ...l, qty: Math.max(1, Math.min(999, qty)) } : l)));
  const remove = (key) => setCart((c) => c.filter((l) => l.key !== key));
  const clear = () => setCart([]);

  const value = {
    catalog, settings: catalog?.settings || {}, categories: catalog?.categories || [], products, byId,
    error, reload, lines, count, subtotal, add, setQty, remove, clear, toast, setToast,
  };
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export const useShop = () => useContext(ShopContext);
