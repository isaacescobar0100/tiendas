import QRCode from "qrcode";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { storePublicUrl } from "@/lib/site-url";
import { PrintButton } from "../print-button";
import { AutoPrint } from "./auto-print";

export const dynamic = "force-dynamic";

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, "es", { numeric: true, sensitivity: "base" });

// Tarjetas para imprimir y poner en las mesas: nombre grande + QR al menú.
// ?mesa=<id> una sola; ?sede=<id>|none todas las de esa sede.
export default async function PrintTablesPage({
  searchParams,
}: {
  searchParams: Promise<{ mesa?: string; sede?: string }>;
}) {
  const { store } = await requireAdminStore();
  const { mesa, sede } = await searchParams;

  const tables = (
    await prisma.diningTable.findMany({
      where: {
        storeId: store.id,
        ...(mesa ? { id: String(mesa) } : sede ? { locationId: sede === "none" ? null : String(sede) } : {}),
      },
      select: { id: true, name: true, location: { select: { name: true } } },
    })
  ).sort(byName);

  const base = `${storePublicUrl(store)}/menu`;
  const cards = await Promise.all(
    tables.map(async (t) => ({
      ...t,
      svg: await QRCode.toString(`${base}?mesa=${t.id}`, { type: "svg", margin: 1, errorCorrectionLevel: "M" }),
    })),
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/admin/menu-qr" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Volver a Menú QR
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-3">
            {cards.length} {cards.length === 1 ? "tarjeta" : "tarjetas"} · 4 por hoja carta/A4
          </span>
          <PrintButton />
        </div>
      </div>

      {cards.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-2 px-4 py-10 text-center text-sm text-ink-3">
          No hay mesas para imprimir.
        </p>
      ) : (
        <>
          {cards.length === 1 && <AutoPrint />}
          {/* Siempre en blanco y negro, sin importar el tema: ahorra tinta y se lee bien. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-0">
            {cards.map((c) => (
              <article
                key={c.id}
                className="flex break-inside-avoid flex-col items-center rounded-2xl border-2 border-dashed border-neutral-300 bg-white p-6 text-center text-neutral-900 print:h-[128mm] print:rounded-none print:border print:p-[8mm]"
              >
                <div className="flex items-center gap-2">
                  {store.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={store.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                  )}
                  <span className="text-sm font-bold uppercase tracking-wide">{store.name}</span>
                </div>
                <p className="mt-3 text-4xl font-extrabold leading-none tracking-tight">{c.name}</p>
                {c.location && <p className="mt-1 text-sm text-neutral-600">{c.location.name}</p>}
                <div
                  className="mt-4 w-full max-w-[60mm] [&>svg]:h-auto [&>svg]:w-full"
                  // SVG generado en el servidor por la librería a partir de la URL.
                  dangerouslySetInnerHTML={{ __html: c.svg }}
                />
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-700">
                  Escanea para ver el menú
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
