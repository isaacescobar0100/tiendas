"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCart } from "./cart-context";
import { formatPrice, variantLabel } from "@/lib/utils";

export function CartDrawer() {
  const {
    items,
    totalCents,
    currency,
    storeSlug,
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
      aria-hidden={!isOpen}
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
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Tu carrito</h2>
          <button
            onClick={closeCart}
            className="text-gray-400 hover:text-gray-900"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-3xl">🛒</p>
            <p className="text-sm text-gray-500">Tu carrito está vacío.</p>
            <button
              onClick={closeCart}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Seguir comprando
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto px-5">
              {items.map((item) => (
                <li key={item.key} className="flex gap-3 py-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl || "https://placehold.co/64x64?text=%20"}
                    alt=""
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {item.name}
                    </p>
                    {variantLabel(item.color, item.size) && (
                      <p className="text-xs text-gray-400">
                        {variantLabel(item.color, item.size)}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      {formatPrice(item.priceCents, currency)}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex items-center rounded-md border border-gray-300">
                        <button
                          onClick={() => setQuantity(item.key, item.quantity - 1)}
                          className="px-2 py-0.5 text-gray-600 hover:text-gray-900"
                          aria-label="Menos"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => setQuantity(item.key, item.quantity + 1)}
                          className="px-2 py-0.5 text-gray-600 hover:text-gray-900"
                          aria-label="Más"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => remove(item.key)}
                        className="text-xs text-gray-400 hover:text-red-500"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatPrice(item.priceCents * item.quantity, currency)}
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-gray-200 p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-gray-500">Total</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatPrice(totalCents, currency)}
                </span>
              </div>
              <Link
                href={`/${storeSlug}/checkout`}
                onClick={closeCart}
                className="block w-full rounded-lg bg-gray-900 px-4 py-3 text-center text-sm font-medium text-white hover:bg-gray-800"
              >
                Finalizar compra
              </Link>
              <Link
                href={`/${storeSlug}/cart`}
                onClick={closeCart}
                className="mt-2 block text-center text-sm text-gray-500 hover:text-gray-900"
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
