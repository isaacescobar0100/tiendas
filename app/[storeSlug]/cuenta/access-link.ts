import "server-only";
import { createResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/email";
import { storeOrigin } from "@/lib/store-path";

/**
 * Envía al correo del cliente un enlace de un solo uso para crear o cambiar su
 * contraseña. Usarlo prueba que el email es suyo (lo marca como verificado).
 * La URL es la de la tienda (su subdominio/dominio solo si está comprobado que
 * es suyo; si no, el dominio principal configurado), nunca un host arbitrario.
 */
export async function sendAccessLink(
  store: { slug: string; name: string; customDomain?: string | null },
  customer: { id: string; email: string; name: string },
  purpose: "welcome" | "reset",
) {
  const token = await createResetToken({ kind: "customer", customerId: customer.id });
  const url = `${await storeOrigin(store)}/cuenta/restablecer?token=${encodeURIComponent(token)}`;
  await sendPasswordResetEmail({
    to: customer.email,
    name: customer.name,
    resetUrl: url,
    brandName: store.name,
    purpose,
  });
}
