// Pulso en vivo de UN pedido (pago exitoso y Rastrear). La URL no lleva el id
// del pedido sino un token cifrado: así la página de Rastrear (que se abre con
// número + correo) no entrega el id completo, que es la llave de la página
// de pedido exitoso, y /api/live no sirve para adivinar ids.
//
// Además, la página de pedido exitoso solo muestra los datos del comprador
// (nombre, teléfono, dirección, notas, correo) en el navegador que hizo el
// pedido: se le da una cookie cifrada con sus pedidos recientes.
import "server-only";
import { cookies } from "next/headers";
import { cookieOptions, openPayload, sealPayload } from "@/lib/signed-cookie";

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

const ACCESS_COOKIE = "orders_access";
const ACCESS_PURPOSE = "order-access";
const ACCESS_DAYS = 30;
const ACCESS_MAX = 10; // pedidos recientes que recuerda

async function accessIds(): Promise<string[]> {
  const data = openPayload<{ ids: string[]; exp: number }>(
    ACCESS_PURPOSE,
    (await cookies()).get(ACCESS_COOKIE)?.value,
  );
  return Array.isArray(data?.ids) ? data.ids.filter((x) => typeof x === "string") : [];
}

/** Este navegador hizo el pedido: puede ver sus datos en la página de éxito. */
export async function grantOrderAccess(orderId: string) {
  const ids = [orderId, ...(await accessIds()).filter((x) => x !== orderId)].slice(0, ACCESS_MAX);
  const token = sealPayload(ACCESS_PURPOSE, { ids, exp: Date.now() + ACCESS_DAYS * 86_400_000 });
  (await cookies()).set(ACCESS_COOKIE, token, cookieOptions(ACCESS_DAYS * 86_400));
}

/** ¿Este navegador hizo el pedido? */
export async function hasOrderAccess(orderId: string): Promise<boolean> {
  return (await accessIds()).includes(orderId);
}
