import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { ProductForm } from "@/components/product-form";
import { createProductAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const { store } = await requireAdminStore();
  const categories = await prisma.category.findMany({
    where: { storeId: store.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/admin/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Nuevo producto</h1>
      <ProductForm
        action={createProductAction}
        categories={categories}
        storeType={store.type}
        submitLabel="Crear producto"
      />
    </div>
  );
}
