import type { PaymentMethod } from "@prisma/client";

// ─── Método de pago del pedido ───────────────────────────────────────────────
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  ONLINE: "En línea (Wompi)",
  COD: "Contra entrega",
  TRANSFER: "Transferencia / QR",
};

/** Etiqueta del método; los pedidos antiguos no lo tienen guardado. */
export function paymentMethodLabel(m: PaymentMethod | null | undefined): string {
  return m ? PAYMENT_METHOD_LABEL[m] : "—";
}

// ─── Cuentas para transferencia directa ──────────────────────────────────────
// La tienda sube sus QR / llaves / números. Se guardan como JSON en
// Store.transferAccountsJson y se muestran al cliente tras hacer el pedido.
export type TransferKind = "BREB" | "NEQUI" | "DAVIPLATA" | "BANCO" | "LINK";

export type TransferAccount = {
  id: string;
  kind: TransferKind;
  value: string; // llave, número de celular/cuenta o URL del link de pago
  holder: string; // titular (opcional), para que el cliente confirme a quién paga
  qrUrl: string; // imagen del QR (opcional)
};

export const TRANSFER_KINDS: {
  value: TransferKind;
  label: string;
  placeholder: string;
}[] = [
  { value: "BREB", label: "Llave Bre-B", placeholder: "@minegocio, celular, cédula o correo" },
  { value: "NEQUI", label: "Nequi", placeholder: "300 123 4567" },
  { value: "DAVIPLATA", label: "Daviplata", placeholder: "300 123 4567" },
  { value: "BANCO", label: "Cuenta bancaria", placeholder: "Bancolombia ahorros 123-456789-00" },
  { value: "LINK", label: "Link de pago", placeholder: "https://…" },
];

export const TRANSFER_KIND_LABEL = Object.fromEntries(
  TRANSFER_KINDS.map((k) => [k.value, k.label]),
) as Record<TransferKind, string>;

const KINDS = new Set<string>(TRANSFER_KINDS.map((k) => k.value));
const MAX_ACCOUNTS = 6;

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

/** Solo URLs http(s) (evita `javascript:` en enlaces e imágenes). */
export const isHttpUrl = (v: string) => /^https?:\/\/\S+$/i.test(v);
// El QR puede ser una URL absoluta (Blob) o relativa (/uploads en local).
const isImageUrl = (v: string) => isHttpUrl(v) || /^\/uploads\/[\w.-]+$/.test(v);

/** Lee y sanea las cuentas. Descarta entradas inválidas o vacías. */
export function parseTransferAccounts(json: string | null | undefined): TransferAccount[] {
  if (!json) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];

  const out: TransferAccount[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const kind = str(o.kind, 20);
    if (!KINDS.has(kind)) continue;
    const value = str(o.value, 300);
    const qrUrl = str(o.qrUrl, 500);
    const safeQr = isImageUrl(qrUrl) ? qrUrl : "";
    // Un link de pago debe ser una URL válida.
    if (kind === "LINK" && value && !isHttpUrl(value)) continue;
    if (!value && !safeQr) continue; // nada que mostrar
    out.push({
      id: str(o.id, 40) || Math.random().toString(36).slice(2, 10),
      kind: kind as TransferKind,
      value,
      holder: str(o.holder, 100),
      qrUrl: safeQr,
    });
    if (out.length >= MAX_ACCOUNTS) break;
  }
  return out;
}

export function serializeTransferAccounts(accounts: TransferAccount[]): string {
  return accounts.length ? JSON.stringify(accounts) : "";
}
