import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { ProductForm } from "@/components/product-form";
import { updateProductAction } from "../../../actions";

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
        className="mb-4 inline-block text-sm text-gray-500 hover:text-gray-900"
      >
        ← Volver
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
    </div>
  );
}
