"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  setCustomerSession,
  clearCustomerSession,
} from "@/lib/customer-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export type AccountState = { error?: string } | undefined;

// Bloqueo por intentos fallidos.
const MAX_ATTEMPTS = 3;
const LOCK_MIN = 15;
const LOCK_MS = LOCK_MIN * 60 * 1000;

const registerSchema = z.object({
  name: z.string().min(2, "Indica tu nombre."),
  email: z.string().email("Email inválido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

async function storeBySlug(slug: string) {
  return prisma.store.findFirst({
    where: { slug, active: true },
    select: { id: true, slug: true },
  });
}

export async function registerAction(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const rl = rateLimit(`register:${await clientIp()}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return { error: `Demasiados intentos. Espera ${rl.retryAfter}s.` };
  }

  const store = await storeBySlug(String(formData.get("storeSlug") ?? ""));
  if (!store) return { error: "Tienda no encontrada." };

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.customer.findUnique({
    where: { storeId_email: { storeId: store.id, email } },
  });
  if (existing) {
    return { error: "Ya existe una cuenta con ese email. Inicia sesión." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const customer = await prisma.customer.create({
    data: { storeId: store.id, email, name: parsed.data.name, passwordHash },
  });
  await setCustomerSession({ customerId: customer.id, storeId: store.id });
  redirect(`/${store.slug}/cuenta`);
}

export async function loginAction(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const rl = rateLimit(`login:${await clientIp()}`, 10, 5 * 60 * 1000);
  if (!rl.ok) {
    return { error: `Demasiados intentos. Espera ${rl.retryAfter}s.` };
  }

  const store = await storeBySlug(String(formData.get("storeSlug") ?? ""));
  if (!store) return { error: "Tienda no encontrada." };

  const email = String(formData.get("email") ?? "").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Indica email y contraseña." };

  const customer = await prisma.customer.findUnique({
    where: { storeId_email: { storeId: store.id, email } },
  });
  if (!customer) return { error: "Email o contraseña incorrectos." };

  const now = Date.now();
  // ¿Cuenta bloqueada todavía?
  if (customer.lockedUntil && customer.lockedUntil.getTime() > now) {
    const mins = Math.ceil((customer.lockedUntil.getTime() - now) / 60000);
    return {
      error: `Cuenta bloqueada por seguridad. Inténtalo en ${mins} min.`,
    };
  }

  const valid = await bcrypt.compare(password, customer.passwordHash);
  if (!valid) {
    // Si el bloqueo anterior ya expiró, se reinicia el conteo.
    const attempts = (customer.lockedUntil ? 0 : customer.failedAttempts) + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { failedAttempts: 0, lockedUntil: new Date(now + LOCK_MS) },
      });
      return {
        error: `Demasiados intentos. Cuenta bloqueada ${LOCK_MIN} minutos.`,
      };
    }
    await prisma.customer.update({
      where: { id: customer.id },
      data: { failedAttempts: attempts, lockedUntil: null },
    });
    const left = MAX_ATTEMPTS - attempts;
    return {
      error: `Email o contraseña incorrectos. Te queda${left === 1 ? "" : "n"} ${left} intento${left === 1 ? "" : "s"}.`,
    };
  }

  // Éxito: limpia el conteo de intentos.
  if (customer.failedAttempts !== 0 || customer.lockedUntil) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });
  }

  await setCustomerSession({ customerId: customer.id, storeId: store.id });
  redirect(`/${store.slug}/cuenta`);
}

export async function logoutAction(formData: FormData) {
  const slug = String(formData.get("storeSlug") ?? "");
  await clearCustomerSession();
  redirect(`/${slug}/cuenta`);
}
