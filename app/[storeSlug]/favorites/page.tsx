"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { useFavorites } from "@/components/favorites/favorites-context";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { formatPrice } from "@/lib/utils";
import { useStoreHref } from "@/components/store-base";

export default function FavoritesPage() {
  const sh = useStoreHref();
  const { currency } = useCart();
  const { items, ready } = useFavorites();

  if (!ready) {
    return <p className="text-sm text-ink-3">Cargando…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-line-2 p-12 text-center">
        <Heart className="mx-auto h-10 w-10 text-ink-4" />
        <p className="mt-3 text-ink-3">No tienes favoritos todavía.</p>
        <Link
          href={sh()}
          className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink hover:brightness-110"
        >
          Explorar productos
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink">Tus favoritos</h1>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => (
          <div
            key={p.productId}
            className="group relative overflow-hidden rounded-2xl border border-line transition hover:shadow-md"
          >
            <div className="absolute right-2 top-2 z-10">
              <FavoriteButton item={p} size="sm" />
            </div>
            <Link href={sh(`/${p.slug}`)}>
              <div className="aspect-square overflow-hidden bg-surface-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageUrl || "https://placehold.co/400x400?text=Producto"}
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium text-ink">
                  {p.name}
                </p>
                <p className="mt-1 font-semibold text-ink">
                  {formatPrice(p.priceCents, currency)}
                </p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
