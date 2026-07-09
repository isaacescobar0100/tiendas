import { requireAdminStore } from "@/lib/guards";
import { ExportForm } from "./export-form";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  await requireAdminStore();

  // Valores por defecto (hoy) calculados en el servidor para evitar desajustes.
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const defaults = {
    day: `${yyyy}-${mm}-${dd}`,
    month: `${yyyy}-${mm}`,
    year: String(yyyy),
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
