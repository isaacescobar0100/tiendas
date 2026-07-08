"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartItem = {
  key: string; // identifica la línea: producto + variante
  productId: string;
  variantId?: string | null;
  color?: string | null;
  size?: string | null;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl?: string | null;
  quantity: number;
};

/** Clave única de una línea del carrito (producto + variante). */
export function lineKey(productId: string, variantId?: string | null): string {
  return `${productId}::${variantId ?? ""}`;
}

type CartContextValue = {
  items: CartItem[];
  count: number;
  totalCents: number;
  currency: string;
  storeSlug: string;
  shippingCents: number; // costo de envío fijo de la tienda (0 = gratis)
  freeShippingOverCents: number; // umbral de envío gratis (0 = desactivado)
  add: (item: Omit<CartItem, "quantity" | "key">, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  ready: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  storeSlug,
  currency = "COP",
  shippingCents = 0,
  freeShippingOverCents = 0,
  children,
}: {
  storeSlug: string;
  currency?: string;
  shippingCents?: number;
  freeShippingOverCents?: number;
  children: React.ReactNode;
}) {
  const storageKey = `cart:${storeSlug}`;
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Carga inicial desde localStorage (una vez montado en el cliente)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignora datos corruptos
    }
    setReady(true);
  }, [storageKey]);

  // Persiste en cada cambio
  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, ready, storageKey]);

  const add = useCallback(
    (item: Omit<CartItem, "quantity" | "key">, quantity = 1) => {
      const key = lineKey(item.productId, item.variantId);
      setItems((prev) => {
        const existing = prev.find((i) => i.key === key);
        if (existing) {
          return prev.map((i) =>
            i.key === key ? { ...i, quantity: i.quantity + quantity } : i,
          );
        }
        return [...prev, { ...item, key, quantity }];
      });
    },
    [],
  );

  const setQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.key !== key)
        : prev.map((i) => (i.key === key ? { ...i, quantity } : i)),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const totalCents = items.reduce((n, i) => n + i.priceCents * i.quantity, 0);
    return {
      items,
      count,
      totalCents,
      currency,
      storeSlug,
      shippingCents,
      freeShippingOverCents,
      add,
      setQuantity,
      remove,
      clear,
      ready,
      isOpen,
      openCart,
      closeCart,
    };
  }, [
    items,
    currency,
    storeSlug,
    shippingCents,
    freeShippingOverCents,
    add,
    setQuantity,
    remove,
    clear,
    ready,
    isOpen,
    openCart,
    closeCart,
  ]);

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
