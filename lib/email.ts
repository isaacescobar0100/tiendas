import nodemailer from "nodemailer";
import { formatPrice } from "./utils";

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

export type OrderEmailData = {
  orderId: string;
  storeName: string;
  currency: string;
  customerName: string;
  customerEmail: string;
  adminEmail?: string | null;
  totalCents: number; // incluye el envío
  shippingCents?: number;
  items: { name: string; quantity: number; priceCents: number }[];
};

function itemsTable(data: OrderEmailData): string {
  const rows = data.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${i.name} × ${i.quantity}</td><td style="padding:6px 0;text-align:right">${formatPrice(
          i.priceCents * i.quantity,
          data.currency,
        )}</td></tr>`,
    )
    .join("");
  const shippingRow =
    data.shippingCents == null
      ? ""
      : `<tr><td style="padding:6px 0">Envío</td><td style="padding:6px 0;text-align:right">${
          data.shippingCents > 0
            ? formatPrice(data.shippingCents, data.currency)
            : "Gratis"
        }</td></tr>`;
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}${shippingRow}
    <tr><td style="padding-top:10px;border-top:1px solid #eee;font-weight:600">Total</td>
    <td style="padding-top:10px;border-top:1px solid #eee;text-align:right;font-weight:600">${formatPrice(
      data.totalCents,
      data.currency,
    )}</td></tr></table>`;
}

/**
 * Envía el email de confirmación al cliente y el aviso al admin (por Gmail).
 * No lanza: si algo falla, lo registra y sigue (no debe romper el checkout).
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
  try {
    // 1) Confirmación al cliente (al correo que puso en el checkout)
    await transporter.sendMail({
      from,
      to: data.customerEmail,
      subject: `Tu pedido en ${data.storeName} (#${shortId})`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto">
          <h2>¡Gracias por tu compra, ${data.customerName}!</h2>
          <p>Hemos recibido tu pedido <strong>#${shortId}</strong> en ${data.storeName}.</p>
          ${itemsTable(data)}
          <p style="color:#888;font-size:12px;margin-top:20px">Te avisaremos cuando se envíe.</p>
        </div>`,
    });

    // 2) Aviso al admin de la tienda (puede responder directo al cliente)
    if (data.adminEmail) {
      await transporter.sendMail({
        from,
        to: data.adminEmail,
        replyTo: data.customerEmail,
        subject: `Nuevo pedido en ${data.storeName} (#${shortId})`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto">
            <h2>Nuevo pedido #${shortId}</h2>
            <p>Cliente: ${data.customerName} (${data.customerEmail})</p>
            ${itemsTable(data)}
          </div>`,
      });
    }
  } catch (e) {
    console.error("[email] Error enviando emails del pedido:", e);
  }
}
