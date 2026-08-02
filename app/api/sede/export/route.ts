import { prisma } from "@/lib/prisma";
import { variantLabel } from "@/lib/utils";
import { PAYMENT_LABEL, FULFILLMENT_LABEL } from "@/lib/order-status";
import { getCurrentSede } from "@/lib/sede-auth";

function esc(v: string | number | null | undefined): string {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}
const pesos = (cents: number) => Math.round(cents / 100);

// Exporta a CSV solo los pedidos de la sede en sesión.
export async function GET() {
  const sede = await getCurrentSede();
  if (!sede) return new Response("No autorizado.", { status: 401 });

  const orders = await prisma.order.findMany({
    where: { storeId: sede.storeId, locationName: sede.name },
    orderBy: { createdAt: "asc" },
    include: { items: true },
  });

  const dateFmt = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "short",
  });
  const timeFmt = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
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

  const rows = orders.map((o) => {
    const productos = o.items
      .map((i) => {
        const v = variantLabel(i.color, i.size);
        return `${i.name}${v ? ` (${v})` : ""} x${i.quantity}`;
      })
      .join(" | ");
    return [
      `${dateFmt.format(o.createdAt)} ${timeFmt.format(o.createdAt)}`,
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

  const csv = "﻿" + [headers.map(esc).join(";"), ...rows].join("\r\n");
  const safe = sede.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedidos-${safe}.csv"`,
    },
  });
}
