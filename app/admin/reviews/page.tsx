import { Star, MessageSquare, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { deleteReviewAction } from "./actions";
import { TZ } from "@/lib/dates";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("es", { timeZone: TZ, dateStyle: "medium" });

export default async function AdminReviewsPage() {
  const { store } = await requireAdminStore();

  const reviews = await prisma.review.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true, slug: true } } },
  });

  const avg =
    reviews.length > 0
      ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length
      : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Reseñas</h1>
        <p className="text-sm text-ink-3">
          {reviews.length === 0
            ? "Aún no hay reseñas."
            : `${reviews.length} reseña${reviews.length === 1 ? "" : "s"} · promedio ${avg.toFixed(1)} ★`}
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-2 bg-surface p-12 text-center">
          <MessageSquare className="mx-auto h-9 w-9 text-ink-4" />
          <p className="mt-3 text-ink-3">
            Cuando tus clientes dejen reseñas, aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-line bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">
                    {r.product.name}
                  </p>
                  <p className="text-xs text-ink-3">
                    {r.customerName} · {dateFmt.format(r.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-4 w-4 ${
                          n <= r.rating
                            ? "fill-warn text-warn-ink"
                            : "text-ink-4"
                        }`}
                      />
                    ))}
                  </span>
                  <form action={deleteReviewAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      className="rounded-lg border border-bad/30 p-2 text-bad-ink hover:bg-bad-soft"
                      aria-label="Borrar reseña"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
              {r.comment && (
                <p className="mt-2 whitespace-pre-line text-sm text-ink-2">
                  {r.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
