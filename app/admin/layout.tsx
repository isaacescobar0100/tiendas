import Link from "next/link";
import { requireAdminStore } from "@/lib/guards";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { store } = await requireAdminStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="font-semibold text-gray-900">
              {store.name}
            </Link>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Admin
            </span>
          </div>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/admin" className="text-gray-600 hover:text-gray-900">
              Inicio
            </Link>
            <Link
              href="/admin/products"
              className="text-gray-600 hover:text-gray-900"
            >
              Productos
            </Link>
            <Link
              href="/admin/orders"
              className="text-gray-600 hover:text-gray-900"
            >
              Pedidos
            </Link>
            <Link
              href="/admin/categories"
              className="text-gray-600 hover:text-gray-900"
            >
              Categorías
            </Link>
            <Link
              href="/admin/settings"
              className="text-gray-600 hover:text-gray-900"
            >
              Ajustes
            </Link>
            <Link
              href={`/${store.slug}`}
              target="_blank"
              className="text-gray-600 hover:text-gray-900"
            >
              Ver tienda ↗
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
