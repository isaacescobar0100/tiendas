import { requireAdminStore } from "@/lib/guards";
import { PortadaForm } from "../settings-forms";

export const dynamic = "force-dynamic";

// Ajustes › Portada (banner y video)
export default async function SettingsPortadaPage() {
  const { store } = await requireAdminStore();
  return <PortadaForm store={{ bannerUrl: store.bannerUrl, bannerVideoUrl: store.bannerVideoUrl }} />;
}
