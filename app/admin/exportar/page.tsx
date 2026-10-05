import { requireAdminStore } from "@/lib/guards";
import { dayKey } from "@/lib/dates";
import { ExportForm } from "./export-form";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  await requireAdminStore();

  // "Hoy" en hora de Colombia (el servidor está en UTC).
  const today = dayKey(new Date());
  const defaults = {
    day: today,
    month: today.slice(0, 7),
    year: today.slice(0, 4),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Exportar pedidos</h1>
        <p className="text-sm text-ink-3">
          Descarga tus pedidos en CSV (se abre en Excel o Google Sheets) filtrando
          por día, mes o año.
        </p>
      </div>

      <ExportForm defaults={defaults} />

      <p className="text-xs text-ink-3">
        El archivo incluye fecha, cliente, contacto, dirección, estado de pago y
        envío, productos y los importes (subtotal, envío y total).
      </p>
    </div>
  );
}
