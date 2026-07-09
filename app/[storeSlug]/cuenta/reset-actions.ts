"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createResetToken,
  findValidToken,
  markTokenUsed,
} from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export type ResetState = { error?: string; ok?: boolean } | undefined;

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

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

  const customer = await prisma.customer.findUnique({
    where: { storeId_email: { storeId: store.id, email } },
  });
  if (customer) {
    const token = await createResetToken({
      kind: "customer",
      customerId: customer.id,
    });
    const url = `${await baseUrl()}/${store.slug}/cuenta/restablecer?token=${token}`;
    await sendPasswordResetEmail({
      to: customer.email,
      name: customer.name,
      resetUrl: url,
      brandName: store.name,
    });
  }
  // No revelamos si el email existe o no.
  return { ok: true };
}

const pwSchema = z
  .object({
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Las contraseñas no coinciden.",
    path: ["confirm"],
  });

// Guardar la nueva contraseña con un token válido (cliente).
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

  const rec = await findValidToken(token);
  if (!rec || rec.kind !== "customer" || !rec.customerId) {
    return { error: "El enlace no es válido o ya caducó. Solicita uno nuevo." };
  }
  // El token debe ser de un cliente de esta tienda.
  const customer = await prisma.customer.findFirst({
    where: { id: rec.customerId, storeId: store.id },
  });
  if (!customer) {
    return { error: "El enlace no es válido para esta tienda." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.customer.update({
    where: { id: customer.id },
    data: { passwordHash, failedAttempts: 0, lockedUntil: null },
  });
  await markTokenUsed(rec.id);
  redirect(`/${store.slug}/cuenta?reset=1`);
}
