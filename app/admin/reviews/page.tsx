import { Star, MessageSquare, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { deleteReviewAction } from "./actions";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("es", { dateStyle: "medium" });

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
        <h1 className="text-2xl font-bold text-gray-900">Reseñas</h1>
        <p className="text-sm text-gray-500">
          {reviews.length === 0
            ? "Aún no hay reseñas."
            : `${reviews.length} reseña${reviews.length === 1 ? "" : "s"} · promedio ${avg.toFixed(1)} ★`}
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <MessageSquare className="mx-auto h-9 w-9 text-gray-300" />
          <p className="mt-3 text-gray-500">
            Cuando tus clientes dejen reseñas, aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-gray-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {r.product.name}
                  </p>
                  <p className="text-xs text-gray-400">
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
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </span>
                  <form action={deleteReviewAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                      aria-label="Borrar reseña"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
              {r.comment && (
                <p className="mt-2 whitespace-pre-line text-sm text-gray-600">
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
