import { ExternalLink, QrCode } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { storePublicUrl } from "@/lib/site-url";
import { TablesManager } from "./tables-manager";

export const dynamic = "force-dynamic";

export const metadata = { title: "Menú QR" };

// QR del menú de SOLO LECTURA: nada viene creado de fábrica. La tienda crea
// los suyos (mesas por sede o QR generales) y puede borrarlos cuando quiera.
export default async function MenuQrPage() {
  const { store } = await requireAdminStore();
  const [locations, rows] = await Promise.all([
    prisma.storeLocation.findMany({
      where: { storeId: store.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.diningTable.findMany({
      where: { storeId: store.id },
      select: { id: true, name: true, locationId: true, general: true },
    }),
  ]);
  // Generales primero; después las mesas como las cuenta una persona
  // (Mesa 2 antes que Mesa 10).
  const tables = rows.sort(
    (a, b) =>
      Number(b.general) - Number(a.general) ||
      a.name.localeCompare(b.name, "es", { numeric: true, sensitivity: "base" }),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <QrCode className="h-6 w-6" /> Menú QR
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            El cliente escanea y ve la carta con fotos y precios, sin poder pedir: en el local se pide al
            mesero. Se actualiza sola cuando cambias productos o precios; no hay que reimprimir.
          </p>
        </div>
        <a
          href={`${storePublicUrl(store)}/menu`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2"
        >
          <ExternalLink className="h-4 w-4" /> Ver el menú
        </a>
      </div>
      <TablesManager locations={locations} tables={tables} />
    </div>
  );
}
