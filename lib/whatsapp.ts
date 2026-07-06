// Enlaces "click to chat" de WhatsApp (wa.me). Sin API ni costo: abre el chat
// de la tienda con un mensaje ya escrito. Ideal para avisar del pedido.

/** Normaliza un número a solo dígitos con indicativo. Colombia (57) por defecto. */
export function normalizeWhatsapp(raw: string | null | undefined): string {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  // Móvil colombiano sin indicativo (10 dígitos) → anteponer 57.
  if (digits.length === 10) digits = `57${digits}`;
  return digits;
}

/** Devuelve el enlace wa.me con el texto, o null si no hay número válido. */
export function whatsappLink(
  raw: string | null | undefined,
  text: string,
): string | null {
  const number = normalizeWhatsapp(raw);
  if (number.length < 10) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
