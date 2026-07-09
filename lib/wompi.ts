// Integración de pagos con Wompi (Colombia) — https://docs.wompi.co
// Solo servidor: usa la llave privada y los secretos. Nunca importar en cliente.
import { createHash } from "crypto";

// Wompi procesa en pesos colombianos. El "amount-in-cents" es pesos × 100,
// que coincide con nuestra convención `priceCents`/`totalCents` cuando los
// precios de la tienda están en COP (ver README de pagos).
export const WOMPI_CURRENCY = "COP";

export type WompiKeys = {
  publicKey: string;
  privateKey: string;
  integritySecret: string;
  eventsSecret: string;
};

type StoreWompi = {
  wompiPublicKey?: string | null;
  wompiPrivateKey?: string | null;
  wompiIntegritySecret?: string | null;
  wompiEventsSecret?: string | null;
};

/**
 * Llaves de Wompi de la tienda. Si la tienda no tiene las suyas, se usan las
 * del entorno (.env) como respaldo (útil para pruebas con una sola cuenta).
 */
export function resolveWompiKeys(store?: StoreWompi | null): WompiKeys {
  return {
    publicKey: store?.wompiPublicKey || process.env.WOMPI_PUBLIC_KEY || "",
    privateKey: store?.wompiPrivateKey || process.env.WOMPI_PRIVATE_KEY || "",
    integritySecret:
      store?.wompiIntegritySecret || process.env.WOMPI_INTEGRITY_SECRET || "",
    eventsSecret:
      store?.wompiEventsSecret || process.env.WOMPI_EVENTS_SECRET || "",
  };
}

/** ¿Están las llaves mínimas para iniciar un cobro? (pública + privada + integridad) */
export function isWompiConfigured(keys: WompiKeys): boolean {
  return Boolean(keys.publicKey && keys.privateKey && keys.integritySecret);
}

/** El entorno (sandbox/producción) se deduce del prefijo de la llave. */
function isSandbox(keys: WompiKeys): boolean {
  return (
    keys.privateKey.startsWith("prv_test") ||
    keys.publicKey.startsWith("pub_test")
  );
}

/** Base de la API REST de Wompi según el entorno de las llaves. */
function apiBase(keys: WompiKeys): string {
  return isSandbox(keys)
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
  integritySecret: string,
): string {
  const raw = `${reference}${amountInCents}${currency}${integritySecret}`;
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Construye la URL del Web Checkout de Wompi a la que redirigir al cliente.
 * `reference` = id del pedido (para reconciliar el pago con el pedido).
 */
export function buildCheckoutUrl(
  opts: {
    reference: string;
    amountInCents: number;
    redirectUrl: string;
    customerEmail?: string;
  },
  keys: WompiKeys,
): string {
  const { reference, amountInCents, redirectUrl, customerEmail } = opts;
  const signature = integritySignature(
    reference,
    amountInCents,
    WOMPI_CURRENCY,
    keys.integritySecret,
  );

  const params: [string, string][] = [
    ["public-key", keys.publicKey],
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
  keys: WompiKeys,
): Promise<WompiTransaction | null> {
  try {
    const res = await fetch(`${apiBase(keys)}/transactions/${id}`, {
      headers: { Authorization: `Bearer ${keys.privateKey}` },
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
export function verifyEvent(
  event: WompiEvent,
  eventsSecret: string,
): WompiTransaction | null {
  if (!eventsSecret) return null;
  const { signature, timestamp, data } = event;
  if (!signature?.checksum || !Array.isArray(signature.properties)) return null;

  const concatenated = signature.properties
    .map((prop) => readPath(data, prop))
    .join("");
  const raw = `${concatenated}${timestamp}${eventsSecret}`;
  const expected = createHash("sha256").update(raw).digest("hex");

  if (expected.toLowerCase() !== signature.checksum.toLowerCase()) return null;
  return data.transaction ?? null;
}
