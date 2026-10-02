// Webhook de eventos de Wompi. Wompi lo llama al cambiar el estado de una
// transacción (aprobada, rechazada…). Es la vía fiable para marcar el pedido
// como pagado aunque el cliente cierre el navegador antes de volver a la tienda.
//
// Configúralo en Wompi → Desarrolladores → URL de eventos:
//   https://TU-DOMINIO/api/wompi/webhook
import type { NextRequest } from "next/server";
import { verifyEvent, resolveWompiKeys, getTransaction } from "@/lib/wompi";
import { prisma } from "@/lib/prisma";
import { markOrderPaid } from "@/lib/orders";
import { rateLimit, clientIpFromRequest } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Límite por IP: los eventos firmados de Wompi son pocos; esto frena a quien
  // envíe basura masiva para gastar consultas a la base o a Wompi.
  const rl = await rateLimit(`wompi-webhook:${clientIpFromRequest(request)}`, 120, 60 * 1000);
  if (!rl.ok) return Response.json({ error: "Demasiadas peticiones" }, { status: 429 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  // La referencia = id del pedido. Con ella ubicamos la tienda y su secreto de
  // eventos (respaldo al .env si la tienda no tiene el suyo).
  const reference: string = event?.data?.transaction?.reference ?? "";
  const order = reference
    ? await prisma.order.findUnique({
        where: { id: reference },
        select: {
          id: true,
          store: {
            select: {
              wompiPublicKey: true,
              wompiPrivateKey: true,
              wompiIntegritySecret: true,
              wompiEventsSecret: true,
            },
          },
        },
      })
    : null;

  const keys = resolveWompiKeys(order?.store ?? null);

  // Verifica la firma con el secreto de eventos de esa tienda.
  const signed = verifyEvent(event, keys.eventsSecret);
  if (!signed) {
    return Response.json({ error: "Firma inválida" }, { status: 401 });
  }

  if (signed.status === "APPROVED" && order) {
    // La firma de Wompi no siempre cubre la referencia: confirmamos la
    // transacción consultándola a Wompi con la llave de la tienda y usamos esos
    // datos (referencia, estado, monto y moneda) en vez de los del evento.
    const tx = await getTransaction(String(signed.id ?? ""), keys);
    if (!tx) {
      // No se pudo consultar: respondemos error para que Wompi reintente.
      return Response.json({ error: "No verificado" }, { status: 503 });
    }
    await markOrderPaid(order.id, tx);
  }

  // Wompi espera 200 para dar el evento por entregado.
  return Response.json({ received: true });
}
