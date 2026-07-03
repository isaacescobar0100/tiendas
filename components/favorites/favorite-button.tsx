"use client";

import { useFavorites, type FavItem } from "./favorites-context";

export function FavoriteButton({
  item,
  className = "",
  size = "md",
}: {
  item: FavItem;
  className?: string;
  size?: "sm" | "md";
}) {
  const { has, toggle, ready } = useFavorites();
  const active = ready && has(item.productId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(item);
      }}
      aria-label={active ? "Quitar de favoritos" : "Añadir a favoritos"}
      aria-pressed={active}
      className={`flex items-center justify-center rounded-full transition ${
        size === "sm" ? "h-8 w-8 text-base" : "h-10 w-10 text-lg"
      } ${
        active
          ? "bg-red-50 text-red-500"
          : "bg-white/80 text-gray-400 hover:text-red-500"
      } ${className}`}
    >
      {active ? "♥" : "♡"}
    </button>
  );
}
