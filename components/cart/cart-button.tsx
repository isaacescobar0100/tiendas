"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "./cart-context";

export function CartButton() {
  const { count, ready, openCart } = useCart();

  return (
    <button
      type="button"
      id="cart-target"
      onClick={openCart}
      className="relative flex items-center gap-2 rounded-lg border border-line-2 px-3 py-2 text-sm font-medium text-ink-2 transition hover:bg-surface-2"
      aria-label="Ver carrito"
    >
      <ShoppingCart className="h-4 w-4" />
      <span className="hidden sm:inline">Carrito</span>
      {ready && count > 0 && (
        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-brand-ink">
          {count}
        </span>
      )}
    </button>
  );
}
