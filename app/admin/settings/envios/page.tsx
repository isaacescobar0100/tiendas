import { requireAdminStore } from "@/lib/guards";
import { EnviosForm } from "../settings-forms";

export const dynamic = "force-dynamic";

// Ajustes › Envíos
export default async function SettingsEnviosPage() {
  const { store } = await requireAdminStore();
  return (
    <EnviosForm
      store={{ shippingCents: store.shippingCents, freeShippingOverCents: store.freeShippingOverCents }}
    />
  );
}
