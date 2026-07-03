"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type FavItem = {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl?: string | null;
  hasVariants?: boolean;
};

type FavContextValue = {
  items: FavItem[];
  count: number;
  has: (productId: string) => boolean;
  toggle: (item: FavItem) => void;
  remove: (productId: string) => void;
  ready: boolean;
};

const FavContext = createContext<FavContextValue | null>(null);

export function FavoritesProvider({
  storeSlug,
  children,
}: {
  storeSlug: string;
  children: React.ReactNode;
}) {
  const storageKey = `favs:${storeSlug}`;
  const [items, setItems] = useState<FavItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignora datos corruptos
    }
    setReady(true);
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, ready, storageKey]);

  const has = useCallback(
    (productId: string) => items.some((i) => i.productId === productId),
    [items],
  );

  const toggle = useCallback((item: FavItem) => {
    setItems((prev) =>
      prev.some((i) => i.productId === item.productId)
        ? prev.filter((i) => i.productId !== item.productId)
        : [...prev, item],
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const value = useMemo<FavContextValue>(
    () => ({ items, count: items.length, has, toggle, remove, ready }),
    [items, has, toggle, remove, ready],
  );

  return <FavContext value={value}>{children}</FavContext>;
}

export function useFavorites() {
  const ctx = useContext(FavContext);
  if (!ctx) throw new Error("useFavorites debe usarse dentro de <FavoritesProvider>");
  return ctx;
}
