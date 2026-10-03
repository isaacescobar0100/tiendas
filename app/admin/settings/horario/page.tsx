import { requireAdminStore } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { HorarioForm } from "../settings-forms";

export const dynamic = "force-dynamic";

// Ajustes › Horario (horario de atención y categorías "merch")
export default async function SettingsHorarioPage() {
  const { store } = await requireAdminStore();
  const categories = await prisma.category.findMany({
    where: { storeId: store.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return (
    <HorarioForm
      hoursJson={store.hoursJson ?? ""}
      merchCategoryIds={store.merchCategoryIds}
      categories={categories}
    />
  );
}
