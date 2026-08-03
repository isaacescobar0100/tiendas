"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { StarRating } from "@/components/star-rating";
import { formatPrice } from "@/lib/utils";
import { isOnSale, effectivePriceCents, discountPercent } from "@/lib/pricing";
import { flyToCart } from "@/lib/fly-to-cart";

type Variant = { id: string; color: string; size: string; stock: number };

export type CardProduct = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  salePriceCents?: number | null;
  imageUrl?: string | null;
  imagePosition?: string | null;
  imageZoom?: number | null;
  stock: number;
  alwaysAvailable?: boolean;
  hasModifiers?: boolean;
  variants: Variant[];
};

export function ProductCard({
  storeSlug,
  currency,
  product,
  freeShipping = false,
  priority = false,
  rating,
}: {
  storeSlug: string;
  currency: string;
  product: CardProduct;
  freeShipping?: boolean;
  // Imágenes visibles de entrada: cargan con prioridad (mejor LCP). El resto,
  // en diferido (lazy) para aligerar la primera vista.
  priority?: boolean;
  rating?: { avg: number; count: number };
}) {
  const { add, storeClosed } = useCart();
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

  const onSale = isOnSale(product);
  const effectiveCents = effectivePriceCents(product);
  const pct = discountPercent(product);

  const favItem = {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    // Guardamos el precio efectivo (con oferta) para carrito y favoritos.
    priceCents: effectiveCents,
    imageUrl: product.imageUrl,
    alwaysAvailable: product.alwaysAvailable ?? false,
    hasVariants,
  };

  // Fuera de horario solo se puede pedir el merch (alwaysAvailable).
  const blockedByHours = storeClosed && !product.alwaysAvailable;

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

      {onSale && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow">
          -{pct}%
        </span>
      )}

      <Link href={`/${storeSlug}/${product.slug}`} className="block">
        <div className="aspect-square overflow-hidden bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={product.imageUrl || "https://placehold.co/400x400?text=Producto"}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            style={{
              objectPosition: product.imagePosition ?? "50% 50%",
              transform: `scale(${product.imageZoom ?? 1})`,
            }}
            className="h-full w-full object-cover transition"
          />
        </div>
        <div className="p-3 pb-2">
          <p className="truncate text-sm font-medium text-gray-900">
            {product.name}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-semibold text-gray-900">
              {formatPrice(effectiveCents, currency)}
            </p>
            {onSale && (
              <p className="text-xs text-gray-400 line-through">
                {formatPrice(product.priceCents, currency)}
              </p>
            )}
          </div>
          {rating && rating.count > 0 && (
            <div className="mt-1">
              <StarRating value={rating.avg} count={rating.count} />
            </div>
          )}
          {freeShipping && (
            <span className="mt-1 inline-block rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
              Envío gratis
            </span>
          )}
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
        ) : blockedByHours ? (
          <button
            disabled
            title="Disponible solo en horario de atención"
            className="w-full cursor-not-allowed rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-400"
          >
            Cerrado
          </button>
        ) : product.hasModifiers ? (
          // Con adiciones/opciones: hay que elegir en la ficha del producto.
          <Link
            href={`/${storeSlug}/${product.slug}`}
            className="block w-full rounded-lg bg-[var(--brand)] px-3 py-2 text-center text-xs font-medium text-white transition hover:brightness-110"
          >
            Elegir opciones
          </Link>
        ) : (
          <button
            onClick={() => {
              if (!hasVariants) return addSimple();
              if (!open) return setOpen(true); // primero desplegar opciones
              addVariant();
            }}
            className="flex w-full items-center justify-center gap-1 rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-medium text-white transition hover:brightness-110"
          >
            {added ? (
              <>
                <Check className="h-3.5 w-3.5" /> Añadido
              </>
            ) : hasVariants && open ? (
              "Añadir"
            ) : hasVariants ? (
              "Elegir y añadir"
            ) : (
              "Agregar al carrito"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
