import { getSessionUser } from "@/lib/guards";
import { csvCell as esc, csvResponse } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { variantLabel } from "@/lib/utils";
import { PAYMENT_LABEL, FULFILLMENT_LABEL } from "@/lib/order-status";
import { paymentMethodLabel } from "@/lib/payment-methods";
import { rateLimit, clientIpFromRequest } from "@/lib/rate-limit";

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

const pesos = (cents: number) => Math.round(cents / 100);

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return new Response("No autorizado.", { status: 401 });
  }
  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
  });
  if (!store) return new Response("Sin tienda.", { status: 404 });

  const rl = await rateLimit(`export:${clientIpFromRequest(request)}`, 20, 60 * 1000);
  if (!rl.ok) {
    return new Response("Demasiadas descargas. Espera un momento.", {
      status: 429,
    });
  }

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
    "Método pago",
    "Estado pago",
    "Estado envio",
    "Productos",
    "Subtotal",
    "Envio",
    "Total",
  ];

  const dateFmt = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "short",
  });
  // Hora en formato 12 h (ej. 4:19 p. m. en vez de 16:19).
  const timeFmt = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const rows = orders.map((o) => {
    const productos = o.items
      .map((i) => {
        const v = variantLabel(i.color, i.size);
        const m = i.modifiers ? ` [${i.modifiers}]` : "";
        return `${i.name}${v ? ` (${v})` : ""}${m} x${i.quantity}`;
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
      paymentMethodLabel(o.paymentMethod),
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

  return csvResponse(
    [headers.map(esc).join(";"), ...rows],
    `pedidos-${range.label}.csv`,
  );
}
