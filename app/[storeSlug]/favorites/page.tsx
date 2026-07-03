"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";
import { useFavorites } from "@/components/favorites/favorites-context";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { formatPrice } from "@/lib/utils";

export default function FavoritesPage() {
  const { storeSlug, currency } = useCart();
  const { items, ready } = useFavorites();

  if (!ready) {
    return <p className="text-sm text-gray-400">Cargando…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-gray-300 p-12 text-center">
        <p className="text-4xl">♡</p>
        <p className="mt-3 text-gray-500">No tienes favoritos todavía.</p>
        <Link
          href={`/${storeSlug}`}
          className="mt-4 inline-block rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Explorar productos
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Tus favoritos</h1>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => (
          <div
            key={p.productId}
            className="group relative overflow-hidden rounded-2xl border border-gray-200 transition hover:shadow-md"
          >
            <div className="absolute right-2 top-2 z-10">
              <FavoriteButton item={p} size="sm" />
            </div>
            <Link href={`/${storeSlug}/${p.slug}`}>
              <div className="aspect-square overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageUrl || "https://placehold.co/400x400?text=Producto"}
                  alt={p.name}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <h3 className="truncate text-sm font-medium text-gray-900">
                  {p.name}
                </h3>
                <p className="mt-1 font-semibold text-gray-900">
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
