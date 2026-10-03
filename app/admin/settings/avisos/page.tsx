import { requireAdminStore } from "@/lib/guards";
import { AvisosForm } from "../settings-forms";

export const dynamic = "force-dynamic";

// Ajustes › Avisos al cliente
export default async function SettingsAvisosPage() {
  const { store } = await requireAdminStore();
  return <AvisosForm store={{ notifyEmail: store.notifyEmail, notifyWhatsapp: store.notifyWhatsapp }} />;
}
