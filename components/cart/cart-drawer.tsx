"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShoppingCart, X } from "lucide-react";
import { useCart } from "./cart-context";
import { FreeShippingNote } from "./free-shipping-note";
import { formatPrice, variantLabel } from "@/lib/utils";
import { useStoreHref } from "@/components/store-base";

export function CartDrawer() {
  const sh = useStoreHref();
  const {
    items,
    totalCents,
    currency,
    setQuantity,
    remove,
    isOpen,
    closeCart,
  } = useCart();

  // Cierra con la tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCart();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, closeCart]);

  return (
    <div
      className={`fixed inset-0 z-50 ${isOpen ? "" : "pointer-events-none"}`}
      inert={!isOpen}
    >
      {/* Fondo */}
      <div
        onClick={closeCart}
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-surface shadow-xl transition-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-semibold text-ink">Tu carrito</h2>
          <button
            onClick={closeCart}
            className="text-ink-3 hover:text-ink"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <ShoppingCart className="h-10 w-10 text-ink-4" />
            <p className="text-sm text-ink-3">Tu carrito está vacío.</p>
            <button
              onClick={closeCart}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink hover:brightness-110"
            >
              Seguir comprando
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {items.map((item) => (
                <li key={item.key} className="flex gap-3 py-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl || "https://placehold.co/64x64?text=%20"}
                    alt=""
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {item.name}
                    </p>
                    {variantLabel(item.color, item.size) && (
                      <p className="text-xs text-ink-3">
                        {variantLabel(item.color, item.size)}
                      </p>
                    )}
                    {item.modifiers && item.modifiers.length > 0 && (
                      <p className="text-xs text-ink-3">
                        {item.modifiers.map((m) => m.optionName).join(" · ")}
                      </p>
                    )}
                    <p className="text-sm text-ink-3">
                      {formatPrice(item.priceCents, currency)}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex items-center rounded-md border border-line-2">
                        <button
                          onClick={() => setQuantity(item.key, item.quantity - 1)}
                          className="px-2 py-0.5 text-ink-2 hover:text-ink"
                          aria-label="Menos"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => setQuantity(item.key, item.quantity + 1)}
                          className="px-2 py-0.5 text-ink-2 hover:text-ink"
                          aria-label="Más"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => remove(item.key)}
                        className="text-xs text-ink-3 hover:text-bad-ink"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-ink">
                    {formatPrice(item.priceCents * item.quantity, currency)}
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-line p-5">
              <div className="mb-3">
                <FreeShippingNote />
              </div>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-ink-3">Total</span>
                <span className="text-lg font-bold text-ink">
                  {formatPrice(totalCents, currency)}
                </span>
              </div>
              <Link
                href={sh(`/checkout`)}
                onClick={closeCart}
                className="block w-full rounded-lg bg-brand px-4 py-3 text-center text-sm font-medium text-brand-ink hover:brightness-110"
              >
                Finalizar compra
              </Link>
              <Link
                href={sh(`/cart`)}
                onClick={closeCart}
                className="mt-2 block text-center text-sm text-ink-3 hover:text-ink"
              >
                Ver carrito completo
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
