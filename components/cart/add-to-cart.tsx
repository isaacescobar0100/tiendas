"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useCart, type CartItem } from "./cart-context";
import { flyToCart } from "@/lib/fly-to-cart";

type Variant = { id: string; color: string; size: string; stock: number };

export function AddToCart({
  storeSlug,
  product,
  variants,
  disabled,
}: {
  storeSlug: string;
  product: Omit<
    CartItem,
    "quantity" | "key" | "variantId" | "size" | "color"
  >;
  variants?: Variant[];
  disabled?: boolean;
}) {
  const { add } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [selColor, setSelColor] = useState<string | null>(null);
  const [selSize, setSelSize] = useState<string | null>(null);
  const [warn, setWarn] = useState("");

  const list = variants ?? [];
  const hasVariants = list.length > 0;
  const uniq = (arr: string[]) => [...new Set(arr)];
  const colors = uniq(list.map((v) => v.color).filter(Boolean));
  const sizes = uniq(list.map((v) => v.size).filter(Boolean));
  const hasColors = colors.length > 0;
  const hasSizes = sizes.length > 0;

  const soldOut = hasVariants
    ? list.every((v) => v.stock <= 0)
    : !!disabled;

  const selected = list.find(
    (v) =>
      (!hasColors || v.color === selColor) &&
      (!hasSizes || v.size === selSize),
  );
  const canAdd = hasVariants
    ? !!selected && selected.stock > 0
    : !disabled;

  if (soldOut) {
    return (
      <button
        disabled
        className="mt-8 w-full cursor-not-allowed rounded-lg bg-gray-200 px-6 py-3 text-sm font-medium text-gray-500 sm:w-auto"
      >
        Agotado
      </button>
    );
  }

  // Stock de una talla dado el color elegido (o global si no hay color)
  const sizeStock = (size: string) => {
    const v = list.find(
      (x) => (!hasColors || x.color === selColor) && x.size === size,
    );
    return v?.stock ?? -1; // -1 = combinación inexistente
  };
  const colorStock = (color: string) =>
    list
      .filter((x) => x.color === color)
      .reduce((n, x) => Math.max(n, x.stock), 0);

  const doAdd = (): boolean => {
    if (hasColors && !selColor) return fail("Elige un color.");
    if (hasSizes && !selSize) return fail("Elige una talla.");
    if (hasVariants && (!selected || selected.stock <= 0))
      return fail("Esa combinación no está disponible.");
    add(
      {
        ...product,
        variantId: selected?.id ?? null,
        color: selected?.color || null,
        size: selected?.size || null,
      },
      qty,
    );
    return true;
  };
  const fail = (msg: string) => {
    setWarn(msg);
    return false;
  };

  return (
    <div className="mt-8 space-y-4">
      {hasColors && (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">
            Color{selColor ? `: ${selColor}` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
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
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
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
        </div>
      )}

      {hasSizes && (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Talla</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const stock = sizeStock(s);
              const blockedByColor = hasColors && !selColor;
              const out = stock <= 0;
              const active = s === selSize;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={out || blockedByColor}
                  onClick={() => {
                    setSelSize(s);
                    setWarn("");
                  }}
                  className={`min-w-11 rounded-lg border px-3 py-2 text-sm transition ${
                    active
                      ? "border-gray-900 bg-gray-900 text-white"
                      : out || blockedByColor
                        ? "cursor-not-allowed border-gray-200 text-gray-300 line-through"
                        : "border-gray-300 text-gray-700 hover:border-gray-900"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          {hasColors && !selColor && (
            <p className="mt-1 text-xs text-gray-400">Elige primero un color.</p>
          )}
        </div>
      )}

      {selected && canAdd && (
        <p className="text-xs text-gray-400">
          {selected.stock} disponibles
        </p>
      )}
      {warn && <p className="text-xs text-red-500">{warn}</p>}

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-lg border border-gray-300">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="px-3 py-2 text-gray-600 hover:text-gray-900"
            aria-label="Menos"
          >
            −
          </button>
          <span className="w-8 text-center text-sm">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            className="px-3 py-2 text-gray-600 hover:text-gray-900"
            aria-label="Más"
          >
            +
          </button>
        </div>

        <button
          type="button"
          disabled={hasVariants ? false : !canAdd}
          onClick={(e) => {
            const btn = e.currentTarget;
            if (doAdd()) {
              setAdded(true);
              flyToCart(btn, product.imageUrl);
              setTimeout(() => setAdded(false), 1500);
            }
          }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 sm:flex-none"
        >
          {added ? (
            <>
              <Check className="h-4 w-4" /> Añadido
            </>
          ) : (
            "Añadir al carrito"
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          if (doAdd()) router.push(`/${storeSlug}/cart`);
        }}
        className="text-sm text-gray-500 underline hover:text-gray-900"
      >
        Comprar ahora →
      </button>
    </div>
  );
}
