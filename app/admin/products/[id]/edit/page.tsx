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
        href="/admin/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Editar producto</h1>
      <ProductForm
        action={updateProductAction}
        categories={categories}
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
      <div className="mt-6 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50/50 p-4">
        <div>
          <p className="text-sm font-medium text-gray-900">
            Borrar este producto
          </p>
          <p className="text-xs text-gray-500">
            Se quita del catálogo. Los pedidos anteriores no se pierden.
          </p>
        </div>
        <form action={deleteProductAction}>
          <input type="hidden" name="id" value={product.id} />
          <button className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
            Borrar
          </button>
        </form>
      </div>
    </div>
  );
}
