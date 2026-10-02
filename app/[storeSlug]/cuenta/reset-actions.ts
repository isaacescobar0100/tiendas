"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  findValidToken,
  consumeToken,
  invalidateOtherTokens,
} from "@/lib/password-reset";
import { setCustomerSession } from "@/lib/customer-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sendAccessLink } from "./access-link";

export type ResetState = { error?: string; ok?: boolean } | undefined;

async function storeBySlug(slug: string) {
  return prisma.store.findFirst({
    where: { slug, active: true },
    select: { id: true, slug: true, name: true },
  });
}

// Solicitar el enlace de reseteo (cliente de una tienda).
export async function requestCustomerResetAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const rl = rateLimit(`reset-req:${await clientIp()}`, 5, 15 * 60 * 1000);
  if (!rl.ok) {
    return { error: `Demasiadas solicitudes. Espera ${rl.retryAfter}s.` };
  }

  const store = await storeBySlug(String(formData.get("storeSlug") ?? ""));
  if (!store) return { error: "Tienda no encontrada." };

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { error: "Indica tu email." };

  const perEmail = rateLimit(`access-mail:${store.id}:${email}`, 3, 60 * 60 * 1000);
  const customer = perEmail.ok
    ? await prisma.customer.findUnique({
        where: { storeId_email: { storeId: store.id, email } },
      })
    : null;
  if (customer) await sendAccessLink(store, customer, "reset");
  // No revelamos si el email existe o no.
  return { ok: true };
}

const pwSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Las contraseñas no coinciden.",
    path: ["confirm"],
  });

// Guardar la contraseña con un token válido (cliente). Sirve para recuperar la
// contraseña y para activar una cuenta nueva: en ambos casos prueba que el
// correo es suyo.
export async function resetCustomerPasswordAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const store = await storeBySlug(String(formData.get("storeSlug") ?? ""));
  if (!store) return { error: "Tienda no encontrada." };

  const token = String(formData.get("token") ?? "");
  const parsed = pwSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const invalid = { error: "El enlace no es válido o ya caducó. Solicita uno nuevo." };
  const rec = await findValidToken(token);
  if (!rec || rec.kind !== "customer" || !rec.customerId) return invalid;
  // El token debe ser de un cliente de esta tienda.
  const customer = await prisma.customer.findFirst({
    where: { id: rec.customerId, storeId: store.id },
  });
  if (!customer) return { error: "El enlace no es válido para esta tienda." };
  // Consumo atómico: el mismo enlace no puede usarse dos veces a la vez.
  if (!(await consumeToken(rec.id))) return invalid;

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: {
      passwordHash,
      failedAttempts: 0,
      lockedUntil: null,
      emailVerifiedAt: customer.emailVerifiedAt ?? new Date(),
      // Cierra las sesiones abiertas de esta cuenta.
      sessionVersion: { increment: 1 },
    },
    select: { sessionVersion: true },
  });
  await invalidateOtherTokens({ customerId: customer.id });

  // Ya probó que el correo es suyo: entra directamente.
  await setCustomerSession({
    customerId: customer.id,
    storeId: store.id,
    sv: updated.sessionVersion,
  });
  redirect(`/${store.slug}/cuenta?reset=1`);
}
