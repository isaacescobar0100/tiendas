// Integración de pagos con Wompi (Colombia) — https://docs.wompi.co
// Solo servidor: usa la llave privada y los secretos. Nunca importar en cliente.
import { createHash } from "crypto";

// Wompi procesa en pesos colombianos. El "amount-in-cents" es pesos × 100,
// que coincide con nuestra convención `priceCents`/`totalCents` cuando los
// precios de la tienda están en COP (ver README de pagos).
export const WOMPI_CURRENCY = "COP";

const PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY ?? "";
const PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY ?? "";
const INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET ?? "";
const EVENTS_SECRET = process.env.WOMPI_EVENTS_SECRET ?? "";

/** ¿Están las llaves mínimas para iniciar un cobro? (pública + privada + integridad) */
export function isWompiConfigured(): boolean {
  return Boolean(PUBLIC_KEY && PRIVATE_KEY && INTEGRITY_SECRET);
}

/** El entorno (sandbox/producción) se deduce del prefijo de la llave. */
function isSandbox(): boolean {
  return PRIVATE_KEY.startsWith("prv_test") || PUBLIC_KEY.startsWith("pub_test");
}

/** Base de la API REST de Wompi según el entorno de las llaves. */
function apiBase(): string {
  return isSandbox()
    ? "https://sandbox.wompi.co/v1"
    : "https://production.wompi.co/v1";
}

/**
 * Firma de integridad: SHA256 de `reference + amountInCents + currency + secreto`.
 * Evita que alguien manipule el monto en la URL de pago.
 */
function integritySignature(
  reference: string,
  amountInCents: number,
  currency: string,
): string {
  const raw = `${reference}${amountInCents}${currency}${INTEGRITY_SECRET}`;
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Construye la URL del Web Checkout de Wompi a la que redirigir al cliente.
 * `reference` = id del pedido (para reconciliar el pago con el pedido).
 */
export function buildCheckoutUrl(opts: {
  reference: string;
  amountInCents: number;
  redirectUrl: string;
  customerEmail?: string;
}): string {
  const { reference, amountInCents, redirectUrl, customerEmail } = opts;
  const signature = integritySignature(reference, amountInCents, WOMPI_CURRENCY);

  const params: [string, string][] = [
    ["public-key", PUBLIC_KEY],
    ["currency", WOMPI_CURRENCY],
    ["amount-in-cents", String(amountInCents)],
    ["reference", reference],
    ["signature:integrity", signature],
    ["redirect-url", redirectUrl],
  ];
  if (customerEmail) params.push(["customer-data:email", customerEmail]);

  // Construcción manual: las claves llevan ":" literal que Wompi espera sin codificar.
  const qs = params
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `https://checkout.wompi.co/p/?${qs}`;
}

export type WompiTransaction = {
  id: string;
  status: "APPROVED" | "DECLINED" | "VOIDED" | "ERROR" | "PENDING";
  reference: string;
  amount_in_cents: number;
  currency: string;
};

/** Consulta el estado de una transacción por su id (usa la llave privada). */
export async function getTransaction(
  id: string,
): Promise<WompiTransaction | null> {
  try {
    const res = await fetch(`${apiBase()}/transactions/${id}`, {
      headers: { Authorization: `Bearer ${PRIVATE_KEY}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: WompiTransaction };
    return body.data ?? null;
  } catch {
    return null;
  }
}

// ─── Verificación del webhook de eventos ─────────────────────────────────────

type WompiEvent = {
  event: string;
  data: { transaction?: WompiTransaction };
  timestamp: number;
  signature: { checksum: string; properties: string[] };
};

/** Lee un valor anidado por ruta "a.b.c" dentro del objeto `data` del evento. */
function readPath(obj: unknown, path: string): string {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
  return value == null ? "" : String(value);
}

/**
 * Verifica la firma del webhook: SHA256 de (valores de `properties` en orden) +
 * timestamp + secreto de eventos. Devuelve la transacción solo si la firma es válida.
 */
export function verifyEvent(event: WompiEvent): WompiTransaction | null {
  if (!EVENTS_SECRET) return null;
  const { signature, timestamp, data } = event;
  if (!signature?.checksum || !Array.isArray(signature.properties)) return null;

  const concatenated = signature.properties
    .map((prop) => readPath(data, prop))
    .join("");
  const raw = `${concatenated}${timestamp}${EVENTS_SECRET}`;
  const expected = createHash("sha256").update(raw).digest("hex");

  if (expected.toLowerCase() !== signature.checksum.toLowerCase()) return null;
  return data.transaction ?? null;
}
