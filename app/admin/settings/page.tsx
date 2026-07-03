import Link from "next/link";
import { requireAdminStore } from "@/lib/guards";
import { StoreForm, PasswordForm } from "./settings-forms";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { store } = await requireAdminStore();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>
        <p className="text-sm text-gray-500">
          Configura tu tienda y tu cuenta.
        </p>
      </div>

      <StoreForm
        store={{
          name: store.name,
          slug: store.slug,
          description: store.description,
          logoUrl: store.logoUrl,
          currency: store.currency,
        }}
      />

      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-4 text-sm">
        <span className="text-gray-600">Tu tienda pública</span>
        <Link
          href={`/${store.slug}`}
          target="_blank"
          className="font-medium text-gray-900 hover:underline"
        >
          /{store.slug} ↗
        </Link>
      </div>

      <PasswordForm />
    </div>
  );
}
