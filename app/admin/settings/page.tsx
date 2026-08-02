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
          description: store.description,
          logoUrl: store.logoUrl,
          bannerUrl: store.bannerUrl,
          bannerVideoUrl: store.bannerVideoUrl,
          surveyUrl: store.surveyUrl,
          whatsapp: store.whatsapp,
          notifyEmail: store.notifyEmail,
          notifyWhatsapp: store.notifyWhatsapp,
          themeColor: store.themeColor,
          shippingCents: store.shippingCents,
          freeShippingOverCents: store.freeShippingOverCents,
        }}
      />

      <PasswordForm />
    </div>
  );
}
