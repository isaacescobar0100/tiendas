import "server-only";
import { createResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/site-url";

/**
 * Envía al correo del cliente un enlace de un solo uso para crear o cambiar su
 * contraseña. Usarlo prueba que el email es suyo (lo marca como verificado).
 * La URL sale de la configuración del sitio, nunca de cabeceras de la petición.
 */
export async function sendAccessLink(
  store: { slug: string; name: string },
  customer: { id: string; email: string; name: string },
  purpose: "welcome" | "reset",
) {
  const token = await createResetToken({ kind: "customer", customerId: customer.id });
  const url = `${getBaseUrl()}/${store.slug}/cuenta/restablecer?token=${encodeURIComponent(token)}`;
  await sendPasswordResetEmail({
    to: customer.email,
    name: customer.name,
    resetUrl: url,
    brandName: store.name,
    purpose,
  });
}
