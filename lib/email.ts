import { formatPrice, variantLabel } from "./utils";
import { GRACE_DAYS } from "@/lib/billing";
import { isHex, readableOn } from "@/lib/theme";

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
  modifiers?: string | null;
  note?: string | null; // indicación del cliente ("sin lechuga")
};

export type OrderEmailData = {
  orderId: string;
  storeName: string;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  locationName?: string | null; // sede elegida (negocios con varias sedes)
  address?: string | null; // resumen legible de la dirección
  reference?: string | null; // referencia / cómo llegar
  notes?: string | null; // nota general del pedido
  paymentLabel?: string; // p. ej. "Pagado en línea" o "Contra entrega"
  adminEmail?: string | null;
  totalCents: number; // incluye el envío
  shippingCents?: number;
  items: OrderEmailItem[];
  brand?: EmailBrand; // color y logo de la tienda para el correo
};

// Escapa texto para evitar romper el HTML del correo con datos del cliente
// (también comillas, por si un valor acaba dentro de un atributo).
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Marca del correo: la tienda (su color y logo) o, si no hay, la plataforma. */
export type EmailBrand = { name: string; color?: string | null; logoUrl?: string | null };

// Correo con cabecera en el color de la marca. Solo estilos en línea (los
// clientes de correo ignoran las hojas de estilo). El texto de la cabecera
// es blanco o negro según el color (mismo criterio que el tema de la tienda).
function wrap(inner: string, brand?: EmailBrand): string {
  const color = brand?.color && isHex(brand.color) ? brand.color : "#111827";
  const ink = readableOn(color);
  const name = esc(brand?.name ?? "MiTienda");
  const logo =
    brand?.logoUrl && brand.logoUrl.startsWith("https://")
      ? `<img src="${esc(brand.logoUrl)}" alt="" width="40" height="40" style="border-radius:10px;vertical-align:middle;margin-right:10px;background:#fff">`
      : "";
  return `<div style="background:#f4f4f5;padding:24px 12px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7">
    <div style="background:${color};color:${ink};padding:18px 24px;font-size:17px;font-weight:700">${logo}<span style="vertical-align:middle">${name}</span></div>
    <div style="padding:24px;color:#1f2937;font-size:15px;line-height:1.55">${inner}</div>
  </div>
  <p style="text-align:center;color:#71717a;font-size:12px;margin:14px 0 0">${brand ? `${name} · ` : ""}con tecnología de MiTienda</p>
</div>`;
}

/** Botón del correo con el color de la marca. */
function button(href: string, label: string, brand?: EmailBrand): string {
  const color = brand?.color && isHex(brand.color) ? brand.color : "#111827";
  return `<a href="${esc(href)}" style="background:${color};color:${readableOn(color)};padding:13px 22px;border-radius:10px;text-decoration:none;display:inline-block;font-weight:600">${esc(label)}</a>`;
}
const section = (title: string, body: string) =>
  `<h3 style="margin:22px 0 6px;font-size:15px">${title}</h3>${body}`;

function itemsTable(data: OrderEmailData): string {
  const rows = data.items
    .map((i) => {
      const v = variantLabel(i.color ?? "", i.size ?? "");
      const label = `${esc(i.name)}${v ? ` (${esc(v)})` : ""} × ${i.quantity}`;
      const mods = i.modifiers
        ? `<div style="color:#888;font-size:12px">${esc(i.modifiers)}</div>`
        : "";
      const note = i.note
        ? `<div style="color:#b45309;font-size:12px;font-style:italic">“${esc(i.note)}”</div>`
        : "";
      return `<tr><td style="padding:6px 0">${label}${mods}${note}</td><td style="padding:6px 0;text-align:right;vertical-align:top">${formatPrice(
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
    data.locationName ? ["Sede", esc(data.locationName)] : null,
    data.address ? ["Dirección", esc(data.address)] : null,
    data.reference ? ["Referencia", esc(data.reference)] : null,
    data.notes ? ["Notas", esc(data.notes)] : null,
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
export async function sendOrderEmails(
  data: OrderEmailData,
  // false = solo avisa a la tienda (p. ej. si ese email ya recibió muchos).
  opts: { toCustomer?: boolean } = {},
): Promise<void> {
  if (!BREVO_API_KEY || !SENDER_EMAIL) {
    console.log(
      `[email] Brevo no configurado (BREVO_API_KEY/BREVO_SENDER_EMAIL) — se omite el envío del pedido ${data.orderId}`,
    );
    return;
  }

  const shortId = data.orderId.slice(-8);

  try {
    // 1) Confirmación al cliente (con todo el detalle de su pedido)
    if (opts.toCustomer !== false) await brevoSend({
      to: data.customerEmail,
      senderName: data.storeName,
      subject: `Tu pedido en ${data.storeName} (#${shortId})`,
      html: wrap(`
        <h2 style="margin:0 0 4px">¡Gracias por tu compra, ${esc(data.customerName)}!</h2>
        <p style="color:#555;margin:0">Pedido <strong>#${shortId}</strong> en ${esc(data.storeName)}.</p>
        ${section("Tu pedido", itemsTable(data))}
        ${section("Envío a", customerBlock(data))}
        <p style="color:#71717a;font-size:13px;margin-top:22px">La tienda te confirmará el pedido y te avisará cuando vaya en camino. ¿Dudas? Responde a este correo.</p>
      `, data.brand),
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
        `, data.brand),
      });
    }
  } catch (e) {
    console.error("[email] Error enviando emails del pedido:", e);
  }
}

/**
 * Envía al cliente un aviso de estado (pedido confirmado / va en camino). El
 * texto lo arma lib/order-messages para que coincida con el de WhatsApp.
 * Devuelve true si se envió; false si no está configurado o falló.
 */
export async function sendStatusEmail(opts: {
  to: string;
  storeName: string;
  title: string;
  lines: string[];
  brand?: EmailBrand;
}): Promise<boolean> {
  if (!BREVO_API_KEY || !SENDER_EMAIL) return false;

  const body = `<h2 style="margin:0 0 8px">${esc(opts.title)}</h2>
     ${opts.lines.map((l) => `<p>${esc(l)}</p>`).join("")}`;

  try {
    await brevoSend({
      to: opts.to,
      senderName: opts.storeName,
      subject: `${opts.title} - ${opts.storeName}`,
      html: wrap(body, opts.brand ?? { name: opts.storeName }),
    });
    return true;
  } catch (e) {
    console.error("[email] Error enviando estado:", e);
    return false;
  }
}

/** Aviso del plan al admin de la tienda (vence pronto / vencido / suspendida / renovado). */
export async function sendRentEmail(opts: {
  to: string;
  storeName: string;
  kind: "soon" | "overdue" | "suspended" | "renewed";
  days?: number;
  paidUntil: Date;
}): Promise<boolean> {
  if (!BREVO_API_KEY || !SENDER_EMAIL) return false;
  const fecha = new Intl.DateTimeFormat("es", {
    timeZone: "America/Bogota",
    dateStyle: "long",
  }).format(opts.paidUntil);

  const map = {
    soon: {
      subject: `Tu plan de ${opts.storeName} vence pronto`,
      body: `<h2 style="margin:0 0 8px">Tu plan vence pronto</h2>
        <p>El plan de tu tienda <strong>${esc(opts.storeName)}</strong> vence el <strong>${fecha}</strong>.</p>
        <p>Faltan ${opts.days ?? 0} día${opts.days === 1 ? "" : "s"}. Renueva el pago a tiempo para que tu tienda siga activa sin interrupciones.</p>`,
    },
    overdue: {
      subject: `Tu plan de ${opts.storeName} está vencido`,
      body: `<h2 style="margin:0 0 8px">Tu plan está vencido</h2>
        <p>El plan de tu tienda <strong>${esc(opts.storeName)}</strong> venció el <strong>${fecha}</strong>.</p>
        <p>Tienes ${GRACE_DAYS} días de gracia: después, la tienda deja de estar visible para tus clientes hasta que renueves.</p>`,
    },
    suspended: {
      subject: `Tu tienda ${opts.storeName} fue suspendida`,
      body: `<h2 style="margin:0 0 8px">Tienda suspendida</h2>
        <p>El plan de <strong>${esc(opts.storeName)}</strong> venció el <strong>${fecha}</strong> y terminó el periodo de gracia.</p>
        <p>Tus clientes no pueden ver la tienda ni hacer pedidos. Tus datos están guardados: renueva y se reactiva de inmediato.</p>`,
    },
    renewed: {
      subject: `Plan renovado - ${opts.storeName}`,
      body: `<h2 style="margin:0 0 8px">Plan renovado</h2>
        <p>El plan de tu tienda <strong>${esc(opts.storeName)}</strong> quedó activo hasta el <strong>${fecha}</strong>.</p>
        <p>¡Gracias!</p>`,
    },
  }[opts.kind];

  try {
    await brevoSend({
      to: opts.to,
      senderName: opts.storeName,
      subject: map.subject,
      html: wrap(map.body),
    });
    return true;
  } catch (e) {
    console.error("[email] Error enviando aviso de renta:", e);
    return false;
  }
}

/** Envía el correo con el enlace para restablecer la contraseña. */
export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  resetUrl: string;
  brandName: string;
  // "welcome": crear la cuenta (primer acceso). "reset": recuperar la clave.
  purpose?: "reset" | "welcome";
  brand?: EmailBrand; // color y logo de la tienda (clientes); sin él, la plataforma
}): Promise<boolean> {
  const welcome = opts.purpose === "welcome";
  if (!BREVO_API_KEY || !SENDER_EMAIL) {
    console.warn("[email] Brevo no configurado — no se envía el reseteo.");
    return false;
  }
  const body = `<h2 style="margin:0 0 8px">${welcome ? "Activa tu cuenta" : "Restablecer tu contraseña"}</h2>
    <p>Hola ${esc(opts.name)}, ${welcome ? `para activar tu cuenta en ${esc(opts.brandName)} y ver tus pedidos, crea tu contraseña con este botón.` : `recibimos una solicitud para restablecer la contraseña de tu cuenta en ${esc(opts.brandName)}.`}</p>
    <p style="margin:20px 0">
      ${button(opts.resetUrl, welcome ? "Crear mi contraseña" : "Crear nueva contraseña", opts.brand)}
    </p>
    <p style="color:#555;font-size:13px">Este enlace caduca en 1 hora y solo puede usarse una vez. Si no fuiste tú, ignora este correo: no se hará ningún cambio.</p>`;
  try {
    await brevoSend({
      to: opts.to,
      senderName: opts.brandName,
      subject: welcome ? `Activa tu cuenta en ${opts.brandName}` : "Restablecer tu contraseña",
      html: wrap(body, opts.brand ?? { name: opts.brandName }),
    });
    return true;
  } catch (e) {
    console.error("[email] Error enviando reseteo:", e);
    return false;
  }
}
