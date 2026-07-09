// Webhook de eventos de Wompi. Wompi lo llama al cambiar el estado de una
// transacción (aprobada, rechazada…). Es la vía fiable para marcar el pedido
// como pagado aunque el cliente cierre el navegador antes de volver a la tienda.
//
// Configúralo en Wompi → Desarrolladores → URL de eventos:
//   https://TU-DOMINIO/api/wompi/webhook
import type { NextRequest } from "next/server";
import { verifyEvent, resolveWompiKeys } from "@/lib/wompi";
import { prisma } from "@/lib/prisma";
import { markOrderPaid } from "@/lib/orders";

export async function POST(request: NextRequest) {
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
  const tx = verifyEvent(event, keys.eventsSecret);
  if (!tx) {
    return Response.json({ error: "Firma inválida" }, { status: 401 });
  }

  if (tx.status === "APPROVED") {
    await markOrderPaid(tx.reference);
  }

  // Wompi espera 200 para dar el evento por entregado.
  return Response.json({ received: true });
}
