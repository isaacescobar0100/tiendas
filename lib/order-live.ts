// Pulso en vivo de UN pedido (pago exitoso y Rastrear). La URL no lleva el id
// del pedido sino un token cifrado: así la página de Rastrear (que se abre con
// número + correo) no entrega el id completo, que es la llave de la página
// de pedido exitoso, y /api/live no sirve para adivinar ids.
import "server-only";
import { openPayload, sealPayload } from "@/lib/signed-cookie";

const PURPOSE = "order-live";
const TTL_MS = 7 * 24 * 3_600_000; // la página lo renueva en cada visita

/** URL del pulso para LiveRefresh. */
export function orderLiveSrc(orderId: string): string {
  const t = sealPayload(PURPOSE, { id: orderId, exp: Date.now() + TTL_MS });
  return `/api/live?scope=order&t=${t}`;
}

/** Id del pedido del token, o null si no es válido o venció. */
export function orderIdFromLiveToken(token: string | null): string | null {
  return openPayload<{ id: string; exp: number }>(PURPOSE, token)?.id ?? null;
}
