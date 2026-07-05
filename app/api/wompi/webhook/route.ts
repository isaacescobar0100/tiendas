// Webhook de eventos de Wompi. Wompi lo llama al cambiar el estado de una
// transacción (aprobada, rechazada…). Es la vía fiable para marcar el pedido
// como pagado aunque el cliente cierre el navegador antes de volver a la tienda.
//
// Configúralo en Wompi → Desarrolladores → URL de eventos:
//   https://TU-DOMINIO/api/wompi/webhook
import type { NextRequest } from "next/server";
import { verifyEvent } from "@/lib/wompi";
import { markOrderPaid } from "@/lib/orders";

export async function POST(request: NextRequest) {
  let event: unknown;
  try {
    event = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  // Verifica la firma con el secreto de eventos. Devuelve la transacción o null.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tx = verifyEvent(event as any);
  if (!tx) {
    return Response.json({ error: "Firma inválida" }, { status: 401 });
  }

  // La referencia que enviamos al iniciar el pago es el id del pedido.
  if (tx.status === "APPROVED") {
    await markOrderPaid(tx.reference);
  }

  // Wompi espera 200 para dar el evento por entregado.
  return Response.json({ received: true });
}
