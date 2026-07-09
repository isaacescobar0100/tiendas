import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { variantLabel } from "@/lib/utils";
import { PAYMENT_LABEL, FULFILLMENT_LABEL } from "@/lib/order-status";

// Medianoche en Colombia (UTC−5, sin horario de verano) expresada en UTC.
const bogota = (y: number, mo: number, d: number) =>
  new Date(Date.UTC(y, mo - 1, d, 5, 0, 0));

// Calcula el rango [inicio, fin) según el tipo de filtro y el valor,
// usando los límites del día/mes/año en hora de Colombia.
function computeRange(
  type: string,
  value: string,
): { start: Date; end: Date; label: string } | null {
  if (type === "day") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return null;
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return { start: bogota(y, mo, d), end: bogota(y, mo, d + 1), label: value };
  }
  if (type === "month") {
    const m = /^(\d{4})-(\d{2})$/.exec(value);
    if (!m) return null;
    const [y, mo] = [Number(m[1]), Number(m[2])];
    return { start: bogota(y, mo, 1), end: bogota(y, mo + 1, 1), label: value };
  }
  if (type === "year") {
    const m = /^(\d{4})$/.exec(value);
    if (!m) return null;
    const y = Number(m[1]);
    return { start: bogota(y, 1, 1), end: bogota(y + 1, 1, 1), label: value };
  }
  return null;
}

// Escapa un campo para CSV (delimitador ';', comillas dobladas).
function esc(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

const pesos = (cents: number) => Math.round(cents / 100);

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return new Response("No autorizado.", { status: 401 });
  }
  const store = await prisma.store.findUnique({
    where: { ownerId: session.user.id },
  });
  if (!store) return new Response("Sin tienda.", { status: 404 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "month";
  const value = searchParams.get("value") ?? "";
  const range = computeRange(type, value);
  if (!range) {
    return new Response("Filtro inválido.", { status: 400 });
  }

  const orders = await prisma.order.findMany({
    where: {
      storeId: store.id,
      createdAt: { gte: range.start, lt: range.end },
    },
    orderBy: { createdAt: "asc" },
    include: { items: true },
  });

  const headers = [
    "Fecha",
    "Pedido",
    "Cliente",
    "Email",
    "Telefono",
    "Ciudad",
    "Direccion",
    "Estado pago",
    "Estado envio",
    "Productos",
    "Subtotal",
    "Envio",
    "Total",
  ];

  const dateFmt = new Intl.DateTimeFormat("es", {
    timeZone: "America/Bogota",
    dateStyle: "short",
    timeStyle: "short",
  });

  const rows = orders.map((o) => {
    const productos = o.items
      .map((i) => {
        const v = variantLabel(i.color, i.size);
        return `${i.name}${v ? ` (${v})` : ""} x${i.quantity}`;
      })
      .join(" | ");
    return [
      dateFmt.format(o.createdAt),
      o.id.slice(-8),
      o.customerName,
      o.customerEmail,
      o.customerPhone ?? "",
      o.city,
      o.address,
      PAYMENT_LABEL[o.status],
      FULFILLMENT_LABEL[o.fulfillment],
      productos,
      pesos(o.totalCents - o.shippingCents),
      pesos(o.shippingCents),
      pesos(o.totalCents),
    ]
      .map(esc)
      .join(";");
  });

  // BOM para que Excel muestre bien los acentos.
  const csv = "﻿" + [headers.map(esc).join(";"), ...rows].join("\r\n");
  const filename = `pedidos-${range.label}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
