"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  setCustomerSession,
  clearCustomerSession,
  getCurrentCustomer,
} from "@/lib/customer-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import {
  isLocked,
  registerFailure,
  clearFailures,
  DUMMY_HASH,
} from "@/lib/lockout";
import { sendAccessLink } from "./access-link";
import { storeHref } from "@/lib/store-path";

export type AccountState = { error?: string; ok?: boolean } | undefined;

const registerSchema = z.object({
  name: z.string().trim().min(2, "Indica tu nombre.").max(80),
  email: z.string().trim().email("Email inválido.").max(200),
});

async function storeBySlug(slug: string) {
  return prisma.store.findFirst({
    where: { slug, active: true },
    select: { id: true, slug: true, name: true, customDomain: true, themeColor: true, logoUrl: true },
  });
}

/**
 * Crear cuenta: solo nombre y email. Enviamos un enlace al correo para crear la
 * contraseña; así se prueba que el email es de quien se registra (sin eso,
 * cualquiera podría registrarse con un correo ajeno y ver sus pedidos).
 * La respuesta es la misma exista o no la cuenta (no revela quién es cliente).
 */
export async function registerAction(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const rl = await rateLimit(`register:${await clientIp()}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return { error: `Demasiados intentos. Espera ${rl.retryAfter}s.` };
  }

  const store = await storeBySlug(String(formData.get("storeSlug") ?? ""));
  if (!store) return { error: "Tienda no encontrada." };

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const email = parsed.data.email.toLowerCase();
  // Máx. 3 correos por dirección cada hora (no se puede usar para llenar un buzón).
  const perEmail = await rateLimit(`access-mail:${store.id}:${email}`, 3, 60 * 60 * 1000);
  if (perEmail.ok) {
    const customer =
      (await prisma.customer.findUnique({
        where: { storeId_email: { storeId: store.id, email } },
      })) ??
      (await prisma.customer.create({
        // Sin contraseña hasta que use el enlace del correo.
        data: { storeId: store.id, email, name: parsed.data.name, passwordHash: "" },
      }));
    await sendAccessLink(store, customer, "welcome");
  }
  return { ok: true };
}

export async function loginAction(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const rl = await rateLimit(`login:${await clientIp()}`, 10, 5 * 60 * 1000);
  if (!rl.ok) {
    return { error: `Demasiados intentos. Espera ${rl.retryAfter}s.` };
  }

  const store = await storeBySlug(String(formData.get("storeSlug") ?? ""));
  if (!store) return { error: "Tienda no encontrada." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Indica email y contraseña." };

  // Un único mensaje para todo fallo: no revela si el email tiene cuenta ni
  // si está bloqueada.
  const fail = {
    error:
      "Email o contraseña incorrectos. Si fallas varias veces, espera unos minutos o recupera tu contraseña.",
  };

  const customer = await prisma.customer.findUnique({
    where: { storeId_email: { storeId: store.id, email } },
  });
  if (!customer || !customer.passwordHash) {
    await bcrypt.compare(password, DUMMY_HASH); // misma espera que un fallo real
    return fail;
  }

  // Bloqueo por intentos fallidos (atómico: no se salta con peticiones simultáneas).
  if (await isLocked("customer", customer.id)) {
    await bcrypt.compare(password, DUMMY_HASH);
    return fail;
  }
  const valid = await bcrypt.compare(password, customer.passwordHash);
  if (!valid) {
    await registerFailure("customer", customer.id);
    return fail;
  }
  if (await isLocked("customer", customer.id)) return fail;
  await clearFailures("customer", customer.id);

  await setCustomerSession({
    customerId: customer.id,
    storeId: store.id,
    sv: customer.sessionVersion,
  });
  redirect(await storeHref(store.slug, "/cuenta"));
}

/** Cliente con sesión pero sin correo verificado: le reenviamos el enlace. */
export async function sendVerifyLinkAction(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const store = await storeBySlug(String(formData.get("storeSlug") ?? ""));
  if (!store) return { error: "Tienda no encontrada." };
  const customer = await getCurrentCustomer(store.id);
  if (!customer) return { error: "Inicia sesión de nuevo." };
  const rl = await rateLimit(`access-mail:${store.id}:${customer.email}`, 3, 60 * 60 * 1000);
  if (!rl.ok) return { error: "Ya te enviamos varios correos. Revisa tu bandeja o espera un rato." };
  await sendAccessLink(store, customer, "welcome");
  return { ok: true };
}

export async function logoutAction(formData: FormData) {
  const slug = String(formData.get("storeSlug") ?? "");
  await clearCustomerSession();
  // Solo slugs válidos (evita redirecciones a otro sitio con "//…").
  redirect(/^[a-z0-9-]+$/.test(slug) ? await storeHref(slug, "/cuenta") : "/");
}
