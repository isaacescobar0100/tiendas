"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, ShoppingCart, X } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { FreeShippingNote } from "@/components/cart/free-shipping-note";
import { formatPrice, variantLabel } from "@/lib/utils";
import { useStoreHref } from "@/components/store-base";

export default function CartPage() {
  const sh = useStoreHref();
  const { items, totalCents, currency, setQuantity, remove, ready } =
    useCart();

  if (!ready) {
    return <p className="text-sm text-ink-3">Cargando carrito…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-line-2 p-12 text-center">
        <ShoppingCart className="mx-auto h-10 w-10 text-ink-4" />
        <p className="mt-3 text-ink-3">Tu carrito está vacío.</p>
        <Link
          href={sh()}
          className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink hover:brightness-110"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-ink">Tu carrito</h1>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {items.map((item) => (
          <li key={item.key} className="flex gap-3 p-4 sm:items-center sm:gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl || "https://placehold.co/64x64?text=%20"}
              alt=""
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
            />
            {/* En el celular: datos arriba y cantidad/precio debajo (no se pisan). */}
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <Link
                href={sh(`/${item.slug}`)}
                className="block truncate font-medium text-ink hover:underline"
              >
                {item.name}
              </Link>
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
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
            <div className="flex items-center rounded-lg border border-line-2">
              <button
                onClick={() => setQuantity(item.key, item.quantity - 1)}
                className="px-2.5 py-1.5 text-ink-2 hover:text-ink"
                aria-label="Menos"
              >
                −
              </button>
              <span className="w-8 text-center text-sm">{item.quantity}</span>
              <button
                onClick={() => setQuantity(item.key, item.quantity + 1)}
                className="px-2.5 py-1.5 text-ink-2 hover:text-ink"
                aria-label="Más"
              >
                +
              </button>
            </div>

            <div className="w-20 text-right text-sm font-semibold text-ink">
              {formatPrice(item.priceCents * item.quantity, currency)}
            </div>

            <button
              onClick={() => remove(item.key)}
              className="text-ink-3 hover:text-bad-ink"
              aria-label="Quitar"
            >
              <X className="h-4 w-4" />
            </button>
            </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <FreeShippingNote />
      </div>
      <div className="mt-3 flex items-center justify-between rounded-2xl border border-line p-4">
        <span className="text-ink-3">Total</span>
        <span className="text-2xl font-bold text-ink">
          {formatPrice(totalCents, currency)}
        </span>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Link
          href={sh()}
          className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Seguir comprando
        </Link>
        <Link
          href={sh(`/checkout`)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-6 py-3 text-sm font-medium text-brand-ink hover:brightness-110"
        >
          Finalizar compra <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
