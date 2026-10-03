import QRCode from "qrcode";
import { Download, ExternalLink, QrCode } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { storePublicUrl } from "@/lib/site-url";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

// QR para las mesas: abre el menú de SOLO LECTURA de la tienda (sin comprar).
// Uno general y, si hay sedes, uno por sede (muestra el nombre de la sede).
export default async function MenuQrPage() {
  const { store } = await requireAdminStore();
  const locations = await prisma.storeLocation.findMany({
    where: { storeId: store.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true },
  });

  const menuUrl = `${storePublicUrl(store)}/menu`;
  const targets = [
    { key: "general", title: "Menú general", url: menuUrl },
    ...locations.map((l) => ({
      key: l.id,
      title: l.name,
      url: `${menuUrl}?sede=${encodeURIComponent(l.name)}`,
    })),
  ];

  const codes = await Promise.all(
    targets.map(async (t) => ({
      ...t,
      svg: await QRCode.toString(t.url, {
        type: "svg",
        margin: 1,
        errorCorrectionLevel: "M",
      }),
      png: await QRCode.toDataURL(t.url, {
        width: 1024,
        margin: 2,
        errorCorrectionLevel: "M",
      }),
    })),
  );
  const fileBase = store.slug.replace(/[^a-z0-9-]/g, "");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <QrCode className="h-6 w-6" /> Menú QR para mesas
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            El cliente escanea y ve la carta con fotos y precios, sin poder
            pedir: en el local se pide al mesero. Se actualiza sola cuando
            cambias productos o precios; no hay que reimprimir.
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
        {codes.map((c) => (
          <div
            key={c.key}
            className="break-inside-avoid rounded-2xl border border-line bg-surface p-5 text-center"
          >
            <p className="font-semibold text-ink">{store.name}</p>
            <p className="text-sm text-ink-3">{c.title}</p>
            <div
              className="mx-auto mt-3 w-full max-w-[220px] [&>svg]:h-auto [&>svg]:w-full"
              // SVG generado en el servidor por la librería a partir de la URL.
              dangerouslySetInnerHTML={{ __html: c.svg }}
            />
            <p className="mt-2 text-xs font-medium uppercase tracking-widest text-ink-3">
              Escanea para ver el menú
            </p>
            <p className="mt-2 break-all text-[11px] text-ink-3 print:hidden">
              {c.url}
            </p>
            <div className="mt-3 flex justify-center gap-2 print:hidden">
              <a
                href={c.png}
                download={`menu-qr-${fileBase}-${c.key}.png`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-ink hover:bg-brand-hover"
              >
                <Download className="h-3.5 w-3.5" /> PNG
              </a>
              <a
                href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(c.svg)}`}
                download={`menu-qr-${fileBase}-${c.key}.svg`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-2 px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-surface-2"
              >
                <Download className="h-3.5 w-3.5" /> SVG (imprenta)
              </a>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-2 px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-surface-2"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Ver
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
