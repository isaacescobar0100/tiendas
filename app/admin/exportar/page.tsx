import { requireAdminStore } from "@/lib/guards";
import { ExportForm } from "./export-form";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  await requireAdminStore();

  // "Hoy" en hora de Colombia (el servidor está en UTC; Colombia es UTC−5).
  // en-CA da el formato YYYY-MM-DD.
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const defaults = {
    day: today,
    month: today.slice(0, 7),
    year: today.slice(0, 4),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exportar pedidos</h1>
        <p className="text-sm text-gray-500">
          Descarga tus pedidos en CSV (se abre en Excel o Google Sheets) filtrando
          por día, mes o año.
        </p>
      </div>

      <ExportForm defaults={defaults} />

      <p className="text-xs text-gray-400">
        El archivo incluye fecha, cliente, contacto, dirección, estado de pago y
        envío, productos y los importes (subtotal, envío y total).
      </p>
    </div>
  );
}
