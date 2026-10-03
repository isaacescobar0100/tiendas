import { requireAdminStore } from "@/lib/guards";
import { GeneralForm } from "./settings-forms";

export const dynamic = "force-dynamic";

// Ajustes › General
export default async function SettingsGeneralPage() {
  const { store } = await requireAdminStore();
  return (
    <GeneralForm
      store={{
        name: store.name,
        description: store.description,
        logoUrl: store.logoUrl,
        surveyUrl: store.surveyUrl,
        whatsapp: store.whatsapp,
      }}
    />
  );
}
