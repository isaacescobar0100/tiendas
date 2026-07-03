"use client";

import { useCart } from "./cart-context";

export function CartButton() {
  const { count, ready, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={openCart}
      className="relative flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
      aria-label="Ver carrito"
    >
      <span aria-hidden>🛒</span>
      <span className="hidden sm:inline">Carrito</span>
      {ready && count > 0 && (
        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1 text-xs font-semibold text-white">
          {count}
        </span>
      )}
    </button>
  );
}
