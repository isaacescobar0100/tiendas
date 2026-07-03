"use client";

import Link from "next/link";
import { ShoppingCart, X } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { formatPrice, variantLabel } from "@/lib/utils";

export default function CartPage() {
  const { items, totalCents, currency, storeSlug, setQuantity, remove, ready } =
    useCart();

  if (!ready) {
    return <p className="text-sm text-gray-400">Cargando carrito…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-gray-300 p-12 text-center">
        <ShoppingCart className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-3 text-gray-500">Tu carrito está vacío.</p>
        <Link
          href={`/${storeSlug}`}
          className="mt-4 inline-block rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Tu carrito</h1>

      <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-4 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl || "https://placehold.co/64x64?text=%20"}
              alt=""
              className="h-16 w-16 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <Link
                href={`/${storeSlug}/${item.slug}`}
                className="truncate font-medium text-gray-900 hover:underline"
              >
                {item.name}
              </Link>
              {variantLabel(item.color, item.size) && (
                <p className="text-xs text-gray-400">
                  {variantLabel(item.color, item.size)}
                </p>
              )}
              <p className="text-sm text-gray-500">
                {formatPrice(item.priceCents, currency)}
              </p>
            </div>

            <div className="flex items-center rounded-lg border border-gray-300">
              <button
                onClick={() => setQuantity(item.key, item.quantity - 1)}
                className="px-2.5 py-1.5 text-gray-600 hover:text-gray-900"
                aria-label="Menos"
              >
                −
              </button>
              <span className="w-8 text-center text-sm">{item.quantity}</span>
              <button
                onClick={() => setQuantity(item.key, item.quantity + 1)}
                className="px-2.5 py-1.5 text-gray-600 hover:text-gray-900"
                aria-label="Más"
              >
                +
              </button>
            </div>

            <div className="w-20 text-right text-sm font-semibold text-gray-900">
              {formatPrice(item.priceCents * item.quantity, currency)}
            </div>

            <button
              onClick={() => remove(item.key)}
              className="text-gray-400 hover:text-red-500"
              aria-label="Quitar"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between rounded-2xl border border-gray-200 p-4">
        <span className="text-gray-500">Total</span>
        <span className="text-2xl font-bold text-gray-900">
          {formatPrice(totalCents, currency)}
        </span>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Link
          href={`/${storeSlug}`}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Seguir comprando
        </Link>
        <Link
          href={`/${storeSlug}/checkout`}
          className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
        >
          Finalizar compra →
        </Link>
      </div>
    </div>
  );
}
