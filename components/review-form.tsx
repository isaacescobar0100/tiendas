"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Star, Check } from "lucide-react";
import {
  submitReviewAction,
  type ReviewState,
} from "@/app/[storeSlug]/[productSlug]/review-actions";
import { useStoreHref } from "@/components/store-base";
import { keepFormSubmit } from "@/components/keep-form";

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
  const sh = useStoreHref();
  const [state, formAction, pending] = useActionState<ReviewState, FormData>(
    submitReviewAction,
    undefined,
  );
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);

  if (!loggedIn) {
    return (
      <div className="rounded-2xl border border-line bg-surface-2 p-5 text-sm">
        <p className="font-medium text-ink">¿Compraste este producto?</p>
        <p className="mt-1 text-ink-3">
          Inicia sesión con tu cuenta para dejar tu reseña.
        </p>
        <Link
          href={sh(`/cuenta`)}
          className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink hover:brightness-110"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={keepFormSubmit(formAction)}
      className="space-y-3 rounded-2xl border border-line p-5"
    >
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />

      <p className="text-sm font-medium text-ink">
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
                  active ? "fill-warn text-warn-ink" : "text-ink-4"
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
        className="w-full rounded-lg border border-line-2 px-3 py-2 text-sm outline-none focus:border-ink focus:ring-1 focus:ring-ink"
      />

      {state?.error && (
        <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad-ink">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="flex items-center gap-1.5 rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok-ink">
          <Check className="h-4 w-4" /> ¡Gracias por tu reseña!
        </p>
      )}

      <button
        type="submit"
        disabled={pending || rating < 1}
        className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-ink transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Enviando…" : existing ? "Actualizar reseña" : "Enviar reseña"}
      </button>
    </form>
  );
}
