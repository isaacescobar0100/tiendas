"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useCart } from "@/components/cart/cart-context";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { formatPrice } from "@/lib/utils";
import { flyToCart } from "@/lib/fly-to-cart";

type Variant = { id: string; color: string; size: string; stock: number };

export type CardProduct = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl?: string | null;
  stock: number;
  variants: Variant[];
};

export function ProductCard({
  storeSlug,
  currency,
  product,
}: {
  storeSlug: string;
  currency: string;
  product: CardProduct;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [open, setOpen] = useState(false);
  const [selColor, setSelColor] = useState<string | null>(null);
  const [selSize, setSelSize] = useState<string | null>(null);
  const [warn, setWarn] = useState("");

  const list = product.variants;
  const hasVariants = list.length > 0;
  const available = hasVariants
    ? list.some((v) => v.stock > 0)
    : product.stock > 0;

  const uniq = (arr: string[]) => [...new Set(arr)];
  const colors = uniq(list.map((v) => v.color).filter(Boolean));
  const sizes = uniq(list.map((v) => v.size).filter(Boolean));
  const hasColors = colors.length > 0;
  const hasSizes = sizes.length > 0;

  const favItem = {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    priceCents: product.priceCents,
    imageUrl: product.imageUrl,
    hasVariants,
  };

  const selected = list.find(
    (v) =>
      (!hasColors || v.color === selColor) &&
      (!hasSizes || v.size === selSize),
  );

  const sizeStock = (size: string) => {
    const v = list.find(
      (x) => (!hasColors || x.color === selColor) && x.size === size,
    );
    return v?.stock ?? -1;
  };
  const colorStock = (color: string) =>
    list.filter((x) => x.color === color).reduce((n, x) => Math.max(n, x.stock), 0);

  const flash = () => {
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const addSimple = () => {
    add({
      ...favItem,
      variantId: null,
      color: null,
      size: null,
    });
    flash();
    flyToCart(imgRef.current, product.imageUrl);
  };

  const addVariant = () => {
    if (hasColors && !selColor) return setWarn("Elige un color.");
    if (hasSizes && !selSize) return setWarn("Elige una talla.");
    if (!selected || selected.stock <= 0)
      return setWarn("Combinación no disponible.");
    add({
      ...favItem,
      variantId: selected.id,
      color: selected.color || null,
      size: selected.size || null,
    });
    setWarn("");
    setOpen(false);
    setSelColor(null);
    setSelSize(null);
    flash();
    flyToCart(imgRef.current, product.imageUrl);
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 transition hover:shadow-md">
      <div className="absolute right-2 top-2 z-10">
        <FavoriteButton item={favItem} size="sm" />
      </div>

      <Link href={`/${storeSlug}/${product.slug}`} className="block">
        <div className="aspect-square overflow-hidden bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={product.imageUrl || "https://placehold.co/400x400?text=Producto"}
            alt={product.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        </div>
        <div className="p-3 pb-2">
          <h3 className="truncate text-sm font-medium text-gray-900">
            {product.name}
          </h3>
          <p className="mt-1 font-semibold text-gray-900">
            {formatPrice(product.priceCents, currency)}
          </p>
        </div>
      </Link>

      <div className="mt-auto p-3 pt-0">
        {/* Selector inline de variantes */}
        {hasVariants && open && (
          <div className="mb-2 space-y-2">
            {hasColors && (
              <div className="flex flex-wrap gap-1">
                {colors.map((c) => {
                  const out = colorStock(c) <= 0;
                  const active = c === selColor;
                  return (
                    <button
                      key={c}
                      type="button"
                      disabled={out}
                      onClick={() => {
                        setSelColor(c);
                        setSelSize(null);
                        setWarn("");
                      }}
                      className={`rounded border px-2 py-1 text-xs transition ${
                        active
                          ? "border-gray-900 bg-gray-900 text-white"
                          : out
                            ? "cursor-not-allowed border-gray-200 text-gray-300 line-through"
                            : "border-gray-300 text-gray-700 hover:border-gray-900"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            )}
            {hasSizes && (
              <div className="flex flex-wrap gap-1">
                {sizes.map((s) => {
                  const blocked = hasColors && !selColor;
                  const out = sizeStock(s) <= 0;
                  const active = s === selSize;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={out || blocked}
                      onClick={() => {
                        setSelSize(s);
                        setWarn("");
                      }}
                      className={`min-w-8 rounded border px-2 py-1 text-xs transition ${
                        active
                          ? "border-gray-900 bg-gray-900 text-white"
                          : out || blocked
                            ? "cursor-not-allowed border-gray-200 text-gray-300 line-through"
                            : "border-gray-300 text-gray-700 hover:border-gray-900"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            )}
            {warn && <p className="text-xs text-red-500">{warn}</p>}
          </div>
        )}

        {!available ? (
          <button
            disabled
            className="w-full cursor-not-allowed rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-400"
          >
            Agotado
          </button>
        ) : (
          <button
            onClick={() => {
              if (!hasVariants) return addSimple();
              if (!open) return setOpen(true); // primero desplegar opciones
              addVariant();
            }}
            className="w-full rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-800"
          >
            {added
              ? "✓ Añadido"
              : hasVariants && open
                ? "Añadir"
                : hasVariants
                  ? "Elegir y añadir"
                  : "Agregar al carrito"}
          </button>
        )}
      </div>
    </div>
  );
}
