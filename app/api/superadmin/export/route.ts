import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { variantLabel } from "@/lib/utils";
import { PAYMENT_LABEL, FULFILLMENT_LABEL } from "@/lib/order-status";

function esc(v: string | number | null | undefined): string {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}
const pesos = (cents: number) => Math.round(cents / 100);

// Exporta pedidos a CSV. store=<id> para una tienda, o store=all para todas.
// Solo superadmin.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPERADMIN") {
    return new Response("No autorizado.", { status: 401 });
  }
  const storeParam =
    new URL(request.url).searchParams.get("store") ?? "all";

  const orders = await prisma.order.findMany({
    where: storeParam === "all" ? {} : { storeId: storeParam },
    orderBy: { createdAt: "asc" },
    include: { items: true, store: { select: { name: true } } },
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
    "Tienda",
    "Fecha",
    "Pedido",
    "Cliente",
    "Email",
    "Telefono",
    "Ciudad",
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
        const m = i.modifiers ? ` [${i.modifiers}]` : "";
        return `${i.name}${v ? ` (${v})` : ""}${m} x${i.quantity}`;
      })
      .join(" | ");
    return [
      o.store.name,
      `${dateFmt.format(o.createdAt)} ${timeFmt.format(o.createdAt)}`,
      o.id.slice(-8),
      o.customerName,
      o.customerEmail,
      o.customerPhone ?? "",
      o.city,
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
  const filename =
    storeParam === "all"
      ? "pedidos-todas-las-tiendas.csv"
      : `pedidos-${storeParam.slice(-6)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
