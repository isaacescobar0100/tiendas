import { formatPrice, variantLabel } from "./utils";

// Envío de correos por Brevo (API HTTP). Funciona en Vercel (a diferencia del
// SMTP de Gmail). Si no está configurado, el envío se omite sin romper nada.
//   BREVO_API_KEY        → clave de API de Brevo
//   BREVO_SENDER_EMAIL   → correo remitente VERIFICADO en Brevo (ej. issac10.es@gmail.com)
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL =
  process.env.BREVO_SENDER_EMAIL || process.env.GMAIL_USER || "";

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
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const wrap = (inner: string) =>
  `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;color:#222">${inner}</div>`;
const section = (title: string, body: string) =>
  `<h3 style="margin:22px 0 6px;font-size:15px">${title}</h3>${body}`;

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

/** Envía un correo por la API de Brevo. Lanza si la respuesta no es OK. */
async function brevoSend(opts: {
  to: string;
  subject: string;
  html: string;
  senderName: string;
  replyTo?: string;
}): Promise<void> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY as string,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: opts.senderName, email: SENDER_EMAIL },
      to: [{ email: opts.to }],
      subject: opts.subject,
      htmlContent: opts.html,
      ...(opts.replyTo ? { replyTo: { email: opts.replyTo } } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`Brevo ${res.status}: ${await res.text()}`);
  }
}

/**
 * Envía el email de confirmación al cliente y el aviso al admin (por Brevo),
 * ambos con el detalle completo del pedido. No lanza: si algo falla, lo
 * registra y sigue (no debe romper el checkout).
 */
export async function sendOrderEmails(data: OrderEmailData): Promise<void> {
  if (!BREVO_API_KEY || !SENDER_EMAIL) {
    console.log(
      `[email] Brevo no configurado (BREVO_API_KEY/BREVO_SENDER_EMAIL) — se omite el envío del pedido ${data.orderId}`,
    );
    return;
  }

  const shortId = data.orderId.slice(-8);

  try {
    // 1) Confirmación al cliente (con todo el detalle de su pedido)
    await brevoSend({
      to: data.customerEmail,
      senderName: data.storeName,
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
      await brevoSend({
        to: data.adminEmail,
        senderName: data.storeName,
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

/**
 * Envía al cliente un correo de cambio de estado (en camino / entregado).
 * Devuelve true si se envió; false si no está configurado o falló.
 */
export async function sendStatusEmail(opts: {
  to: string;
  storeName: string;
  customerName: string;
  orderShortId: string;
  kind: "shipped" | "delivered";
  address?: string | null;
  total?: string | null;
}): Promise<boolean> {
  if (!BREVO_API_KEY || !SENDER_EMAIL) return false;

  const shipped = opts.kind === "shipped";
  const subject = shipped
    ? `🚚 Tu pedido va en camino (#${opts.orderShortId})`
    : `✅ Tu pedido fue entregado (#${opts.orderShortId})`;
  const body = shipped
    ? `<h2 style="margin:0 0 8px">¡Tu pedido va en camino! 🚚</h2>
       <p>Hola ${esc(opts.customerName)}, tu pedido <strong>#${opts.orderShortId}</strong> de ${esc(opts.storeName)} ya está en camino.</p>
       ${opts.address ? `<p style="color:#555">Envío a: ${esc(opts.address)}</p>` : ""}
       ${opts.total ? `<p style="color:#555">Total: ${esc(opts.total)}</p>` : ""}
       <p style="margin-top:16px">¡Gracias por tu compra!</p>`
    : `<h2 style="margin:0 0 8px">¡Pedido entregado! ✅</h2>
       <p>Hola ${esc(opts.customerName)}, tu pedido <strong>#${opts.orderShortId}</strong> de ${esc(opts.storeName)} fue entregado.</p>
       <p style="margin-top:16px">¡Gracias por tu compra! Esperamos que lo disfrutes 😊</p>`;

  try {
    await brevoSend({
      to: opts.to,
      senderName: opts.storeName,
      subject,
      html: wrap(body),
    });
    return true;
  } catch (e) {
    console.error("[email] Error enviando estado:", e);
    return false;
  }
}

/** Envía el correo con el enlace para restablecer la contraseña. */
export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  resetUrl: string;
  brandName: string;
}): Promise<boolean> {
  if (!BREVO_API_KEY || !SENDER_EMAIL) {
    console.warn("[email] Brevo no configurado — no se envía el reseteo.");
    return false;
  }
  const body = `<h2 style="margin:0 0 8px">Restablecer tu contraseña</h2>
    <p>Hola ${esc(opts.name)}, recibimos una solicitud para restablecer la contraseña de tu cuenta en ${esc(opts.brandName)}.</p>
    <p style="margin:20px 0">
      <a href="${opts.resetUrl}" style="background:#111827;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Crear nueva contraseña</a>
    </p>
    <p style="color:#555;font-size:13px">Este enlace caduca en 1 hora y solo puede usarse una vez. Si no fuiste tú, ignora este correo: tu contraseña no cambiará.</p>`;
  try {
    await brevoSend({
      to: opts.to,
      senderName: opts.brandName,
      subject: "Restablecer tu contraseña",
      html: wrap(body),
    });
    return true;
  } catch (e) {
    console.error("[email] Error enviando reseteo:", e);
    return false;
  }
}
