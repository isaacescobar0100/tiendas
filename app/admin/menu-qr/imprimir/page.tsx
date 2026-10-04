import QRCode from "qrcode";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { storePublicUrl } from "@/lib/site-url";
import { PrintButton } from "../print-button";
import { AutoPrint } from "./auto-print";

export const dynamic = "force-dynamic";

export const metadata = { title: "Imprimir QR" };

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, "es", { numeric: true, sensitivity: "base" });

// Tarjetas para imprimir y poner en las mesas, con la marca de la tienda:
// nombre grande + QR al menú.
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
      select: { id: true, name: true, general: true, location: { select: { name: true } } },
    })
  ).sort((a, b) => Number(b.general) - Number(a.general) || byName(a, b));

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
          No hay códigos QR para imprimir.
        </p>
      ) : (
        <>
          {cards.length === 1 && <AutoPrint />}
          {/* Con la marca de la tienda (Apariencia): color, logo y tipografía.
              print-color-adjust: exact obliga a imprimir los colores de fondo. */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 print:grid-cols-2 print:gap-[6mm]">
            {cards.map((c) => (
              <article
                key={c.id}
                className="flex break-inside-avoid flex-col overflow-hidden rounded-3xl border border-line bg-surface text-ink shadow-sm [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:h-[125mm] print:shadow-none"
              >
                <header className="relative flex flex-col items-center gap-2 bg-brand px-6 pb-5 pt-6 text-brand-ink">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-ink/10" aria-hidden />
                  {store.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={store.logoUrl}
                      alt=""
                      className="relative h-16 w-16 rounded-2xl bg-surface object-cover shadow-lg ring-4 ring-brand-ink/15"
                    />
                  ) : null}
                  <span className="relative font-heading text-base font-extrabold uppercase tracking-wide">
                    {store.name}
                  </span>
                </header>
                <div className="flex flex-1 flex-col items-center px-6 pb-6 pt-4 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-text">
                    Menú digital
                  </p>
                  <h2 className="mt-1 font-heading text-4xl font-extrabold leading-none tracking-tight">{c.name}</h2>
                  {c.location && <p className="mt-1.5 text-sm text-ink-3">{c.location.name}</p>}
                  {/* El QR siempre negro sobre blanco: así lo lee cualquier celular. */}
                  <div
                    className="mt-4 w-full max-w-[52mm] rounded-2xl bg-white p-2.5 ring-2 ring-brand [&>svg]:h-auto [&>svg]:w-full"
                    // SVG generado en el servidor por la librería a partir de la URL.
                    dangerouslySetInnerHTML={{ __html: c.svg }}
                  />
                  <p className="mt-auto pt-4 text-xs font-bold uppercase tracking-[0.2em] text-brand-text">
                    Escanea para ver el menú
                  </p>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
