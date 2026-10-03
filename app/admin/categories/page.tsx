import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { createCategoryAction, deleteCategoryAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const { store } = await requireAdminStore();
  const categories = await prisma.category.findMany({
    where: { storeId: store.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Categorías</h1>
        <p className="text-sm text-ink-3">
          Organiza los productos de tu tienda.
        </p>
      </div>

      <form
        action={createCategoryAction}
        className="flex gap-2 rounded-2xl border border-line bg-surface p-4"
      >
        <input
          name="name"
          required
          placeholder="Nueva categoría…"
          className="flex-1 rounded-lg border border-line-2 px-3 py-2 text-sm outline-none focus:border-ink focus:ring-1 focus:ring-ink"
        />
        <button className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink hover:bg-brand-hover">
          Añadir
        </button>
      </form>

      {categories.length === 0 ? (
        <p className="text-sm text-ink-3">Aún no hay categorías.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <span className="font-medium text-ink">{c.name}</span>
                <span className="ml-2 text-xs text-ink-3">
                  {c._count.products} producto
                  {c._count.products === 1 ? "" : "s"}
                </span>
              </div>
              <form action={deleteCategoryAction}>
                <input type="hidden" name="id" value={c.id} />
                <button className="rounded-md border border-bad/30 px-2 py-1 text-xs text-bad-ink hover:bg-bad-soft">
                  Borrar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
