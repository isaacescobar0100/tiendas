import Link from "next/link";
import { ShoppingBag, KeyRound } from "lucide-react";
import { requireSuperadmin } from "@/lib/guards";
import { SignOutButton } from "@/components/sign-out-button";

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSuperadmin();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/superadmin"
              className="flex items-center gap-2 font-semibold text-gray-900"
            >
              <ShoppingBag className="h-5 w-5" />
              MiTienda
            </Link>
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              Superadmin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-gray-500 sm:inline">
              {user.email}
            </span>
            <Link
              href="/superadmin/account"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
            >
              <KeyRound className="h-4 w-4" />
              <span className="hidden sm:inline">Cambiar contraseña</span>
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
