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
        <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
        <p className="text-sm text-gray-500">
          Organiza los productos de tu tienda.
        </p>
      </div>

      <form
        action={createCategoryAction}
        className="flex gap-2 rounded-2xl border border-gray-200 bg-white p-4"
      >
        <input
          name="name"
          required
          placeholder="Nueva categoría…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
        />
        <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          Añadir
        </button>
      </form>

      {categories.length === 0 ? (
        <p className="text-sm text-gray-500">Aún no hay categorías.</p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <span className="font-medium text-gray-900">{c.name}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {c._count.products} producto
                  {c._count.products === 1 ? "" : "s"}
                </span>
              </div>
              <form action={deleteCategoryAction}>
                <input type="hidden" name="id" value={c.id} />
                <button className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
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
