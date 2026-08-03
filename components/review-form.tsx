"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Star, Check } from "lucide-react";
import {
  submitReviewAction,
  type ReviewState,
} from "@/app/[storeSlug]/[productSlug]/review-actions";

export function ReviewForm({
  storeSlug,
  productId,
  loggedIn,
  existing,
}: {
  storeSlug: string;
  productId: string;
  loggedIn: boolean;
  existing?: { rating: number; comment: string | null } | null;
}) {
  const [state, formAction, pending] = useActionState<ReviewState, FormData>(
    submitReviewAction,
    undefined,
  );
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);

  if (!loggedIn) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm">
        <p className="font-medium text-gray-900">¿Compraste este producto?</p>
        <p className="mt-1 text-gray-500">
          Inicia sesión con tu cuenta para dejar tu reseña.
        </p>
        <Link
          href={`/${storeSlug}/cuenta`}
          className="mt-3 inline-block rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:brightness-110"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-2xl border border-gray-200 p-5"
    >
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />

      <p className="text-sm font-medium text-gray-900">
        {existing ? "Edita tu reseña" : "Deja tu reseña"}
      </p>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = (hover || rating) >= n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${n} estrella${n === 1 ? "" : "s"}`}
              className="p-0.5"
            >
              <Star
                className={`h-7 w-7 transition ${
                  active ? "fill-amber-400 text-amber-400" : "text-gray-300"
                }`}
              />
            </button>
          );
        })}
      </div>

      <textarea
        name="comment"
        rows={3}
        defaultValue={existing?.comment ?? ""}
        placeholder="Cuéntanos qué te pareció (opcional)…"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
      />

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          <Check className="h-4 w-4" /> ¡Gracias por tu reseña!
        </p>
      )}

      <button
        type="submit"
        disabled={pending || rating < 1}
        className="rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Enviando…" : existing ? "Actualizar reseña" : "Enviar reseña"}
      </button>
    </form>
  );
}
