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
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="font-semibold text-gray-900">
              {store.name}
            </Link>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Admin
            </span>
          </div>
          <nav className="-mx-4 flex items-center gap-4 overflow-x-auto whitespace-nowrap px-4 text-sm sm:mx-0 sm:gap-5 sm:px-0">
            <Link
              href="/admin"
              className="shrink-0 text-gray-600 hover:text-gray-900"
            >
              Inicio
            </Link>
            <Link
              href="/admin/products"
              className="shrink-0 text-gray-600 hover:text-gray-900"
            >
              Productos
            </Link>
            <Link
              href="/admin/orders"
              className="shrink-0 text-gray-600 hover:text-gray-900"
            >
              Pedidos
            </Link>
            <Link
              href="/admin/categories"
              className="shrink-0 text-gray-600 hover:text-gray-900"
            >
              Categorías
            </Link>
            <Link
              href="/admin/settings"
              className="shrink-0 text-gray-600 hover:text-gray-900"
            >
              Ajustes
            </Link>
            <Link
              href={`/${store.slug}`}
              target="_blank"
              className="shrink-0 text-gray-600 hover:text-gray-900"
            >
              Ver tienda ↗
            </Link>
            <span className="shrink-0">
              <SignOutButton />
            </span>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
