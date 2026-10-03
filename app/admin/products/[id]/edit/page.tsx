import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { ProductForm } from "@/components/product-form";
import { updateProductAction, deleteProductAction } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { store } = await requireAdminStore();

  const [product, categories] = await Promise.all([
    prisma.product.findFirst({
      where: { id, storeId: store.id },
      include: { variants: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.category.findMany({
      where: { storeId: store.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <Link
        prefetch={false}
        href="/admin/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-ink">Editar producto</h1>
      <ProductForm
        action={updateProductAction}
        categories={categories}
        storeType={store.type}
        defaults={{
          ...product,
          images: product.images,
          variants: product.variants.map((v) => ({
            color: v.color,
            size: v.size,
            stock: v.stock,
          })),
        }}
        submitLabel="Guardar cambios"
      />

      {/* Borrar el producto (los pedidos antiguos se conservan) */}
      <div className="mt-6 flex items-center justify-between rounded-2xl border border-bad/30 bg-bad-soft/50 p-4">
        <div>
          <p className="text-sm font-medium text-ink">
            Borrar este producto
          </p>
          <p className="text-xs text-ink-3">
            Se quita del catálogo. Los pedidos anteriores no se pierden.
          </p>
        </div>
        <form action={deleteProductAction}>
          <input type="hidden" name="id" value={product.id} />
          <button className="rounded-lg border border-bad/30 bg-surface px-4 py-2 text-sm font-medium text-bad-ink hover:bg-bad-soft">
            Borrar
          </button>
        </form>
      </div>
    </div>
  );
}
