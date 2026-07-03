import Link from "next/link";
import { requireAdminStore } from "@/lib/guards";
import { AdminNav } from "@/components/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { store } = await requireAdminStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="relative border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/admin"
              className="truncate font-semibold text-gray-900"
            >
              {store.name}
            </Link>
            <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Admin
            </span>
          </div>
          <AdminNav storeSlug={store.slug} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
