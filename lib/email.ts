import nodemailer from "nodemailer";
import { formatPrice, variantLabel } from "./utils";

// Envío por Gmail (SMTP). Requiere una "Contraseña de aplicación" de Google
// (no la contraseña normal). Si no está configurado, el envío se omite y la
// app sigue funcionando.
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

const transporter =
  GMAIL_USER && GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      })
    : null;

export type OrderEmailItem = {
  name: string;
  quantity: number;
  priceCents: number;
  color?: string | null;
  size?: string | null;
};

export type OrderEmailData = {
  orderId: string;
  storeName: string;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  address?: string | null; // resumen legible de la dirección
  reference?: string | null; // referencia / cómo llegar
  paymentLabel?: string; // p. ej. "Pagado en línea" o "Contra entrega"
  adminEmail?: string | null;
  totalCents: number; // incluye el envío
  shippingCents?: number;
  items: OrderEmailItem[];
};

// Escapa texto para evitar romper el HTML del correo con datos del cliente.
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function itemsTable(data: OrderEmailData): string {
  const rows = data.items
    .map((i) => {
      const v = variantLabel(i.color ?? "", i.size ?? "");
      const label = `${esc(i.name)}${v ? ` (${esc(v)})` : ""} × ${i.quantity}`;
      return `<tr><td style="padding:6px 0">${label}</td><td style="padding:6px 0;text-align:right">${formatPrice(
        i.priceCents * i.quantity,
        data.currency,
      )}</td></tr>`;
    })
    .join("");
  const subtotalCents = data.totalCents - (data.shippingCents ?? 0);
  const subtotalRow =
    data.shippingCents == null
      ? ""
      : `<tr><td style="padding:6px 0;color:#666">Subtotal</td><td style="padding:6px 0;text-align:right;color:#666">${formatPrice(
          subtotalCents,
          data.currency,
        )}</td></tr>`;
  const shippingRow =
    data.shippingCents == null
      ? ""
      : `<tr><td style="padding:6px 0;color:#666">Envío</td><td style="padding:6px 0;text-align:right;color:#666">${
          data.shippingCents > 0
            ? formatPrice(data.shippingCents, data.currency)
            : "Gratis"
        }</td></tr>`;
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
    <tr><td colspan="2" style="border-top:1px solid #eee;padding-top:6px"></td></tr>
    ${subtotalRow}${shippingRow}
    <tr><td style="padding-top:6px;font-weight:600">Total</td>
    <td style="padding-top:6px;text-align:right;font-weight:600">${formatPrice(
      data.totalCents,
      data.currency,
    )}</td></tr></table>`;
}

// Bloque con los datos del cliente y la dirección de envío.
function customerBlock(data: OrderEmailData): string {
  const rows = [
    ["Cliente", esc(data.customerName)],
    ["Email", esc(data.customerEmail)],
    data.customerPhone ? ["Teléfono", esc(data.customerPhone)] : null,
    data.address ? ["Dirección", esc(data.address)] : null,
    data.reference ? ["Referencia", esc(data.reference)] : null,
    data.paymentLabel ? ["Pago", esc(data.paymentLabel)] : null,
  ].filter(Boolean) as [string, string][];
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:6px">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:3px 8px 3px 0;color:#888;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:3px 0">${v}</td></tr>`,
    )
    .join("")}</table>`;
}

/**
 * Envía el email de confirmación al cliente y el aviso al admin (por Gmail),
 * ambos con el detalle completo del pedido. No lanza: si algo falla, lo
 * registra y sigue (no debe romper el checkout).
 */
export async function sendOrderEmails(data: OrderEmailData): Promise<void> {
  if (!transporter) {
    console.log(
      `[email] Gmail no configurado (GMAIL_USER/GMAIL_APP_PASSWORD) — se omite el envío del pedido ${data.orderId}`,
    );
    return;
  }

  const from = `"${data.storeName}" <${GMAIL_USER}>`;
  const shortId = data.orderId.slice(-8);
  const wrap = (inner: string) =>
    `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;color:#222">${inner}</div>`;
  const section = (title: string, body: string) =>
    `<h3 style="margin:22px 0 6px;font-size:15px">${title}</h3>${body}`;

  try {
    // 1) Confirmación al cliente (con todo el detalle de su pedido)
    await transporter.sendMail({
      from,
      to: data.customerEmail,
      subject: `Tu pedido en ${data.storeName} (#${shortId})`,
      html: wrap(`
        <h2 style="margin:0 0 4px">¡Gracias por tu compra, ${esc(data.customerName)}!</h2>
        <p style="color:#555;margin:0">Pedido <strong>#${shortId}</strong> en ${esc(data.storeName)}.</p>
        ${section("Tu pedido", itemsTable(data))}
        ${section("Envío a", customerBlock(data))}
        <p style="color:#888;font-size:12px;margin-top:22px">Te avisaremos cuando se envíe. ¿Dudas? Responde a este correo.</p>
      `),
    });

    // 2) Aviso al admin de la tienda (con datos para poder enviar el pedido)
    if (data.adminEmail) {
      await transporter.sendMail({
        from,
        to: data.adminEmail,
        replyTo: data.customerEmail,
        subject: `Nuevo pedido en ${data.storeName} (#${shortId})`,
        html: wrap(`
          <h2 style="margin:0 0 4px">Nuevo pedido #${shortId}</h2>
          ${section("Artículos", itemsTable(data))}
          ${section("Cliente y envío", customerBlock(data))}
        `),
      });
    }
  } catch (e) {
    console.error("[email] Error enviando emails del pedido:", e);
  }
}
