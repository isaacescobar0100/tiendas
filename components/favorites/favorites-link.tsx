"use client";

import Link from "next/link";
import { useFavorites } from "./favorites-context";

export function FavoritesLink({ storeSlug }: { storeSlug: string }) {
  const { count, ready } = useFavorites();

  return (
    <Link
      href={`/${storeSlug}/favorites`}
      className="relative flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
      aria-label="Ver favoritos"
    >
      <span aria-hidden>♥</span>
      <span className="hidden sm:inline">Favoritos</span>
      {ready && count > 0 && (
        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
