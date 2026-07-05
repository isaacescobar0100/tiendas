"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { requireSuperadmin } from "@/lib/guards";

const createStoreSchema = z.object({
  storeName: z.string().min(2, "El nombre de la tienda es muy corto."),
  currency: z.string().min(3).max(3).default("COP"),
  adminName: z.string().min(2, "El nombre del admin es muy corto."),
  adminEmail: z.string().email("Email inválido."),
  adminPassword: z.string().min(6, "La contraseña debe tener 6+ caracteres."),
});

export type ActionState = { error?: string; ok?: boolean } | undefined;

/** Genera un slug único para la tienda a partir del nombre. */
async function uniqueStoreSlug(name: string): Promise<string> {
  const base = slugify(name) || "tienda";
  let slug = base;
  let n = 1;
  while (await prisma.store.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function createStoreAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSuperadmin();

  const parsed = createStoreSchema.safeParse({
    storeName: formData.get("storeName"),
    currency: (formData.get("currency") as string)?.toUpperCase() || "COP",
    adminName: formData.get("adminName"),
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const data = parsed.data;
  const email = data.adminEmail.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Ya existe un usuario con ese email." };
  }

  const slug = await uniqueStoreSlug(data.storeName);
  const passwordHash = await bcrypt.hash(data.adminPassword, 10);

  // Crea el usuario admin y su tienda de forma atómica
  await prisma.user.create({
    data: {
      email,
      name: data.adminName,
      passwordHash,
      role: "ADMIN",
      store: {
        create: {
          name: data.storeName,
          slug,
          currency: data.currency,
        },
      },
    },
  });

  revalidatePath("/superadmin");
  redirect("/superadmin");
}

export async function toggleStoreActiveAction(formData: FormData) {
  await requireSuperadmin();
  const storeId = String(formData.get("storeId"));
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (store) {
    await prisma.store.update({
      where: { id: storeId },
      data: { active: !store.active },
    });
    revalidatePath("/superadmin");
  }
}

/**
 * Activa/desactiva un método de pago de la tienda (online o contraentrega).
 * Nunca deja la tienda sin ningún método: si al desactivar quedarían los dos
 * apagados, no hace el cambio.
 */
export async function toggleStorePaymentAction(formData: FormData) {
  await requireSuperadmin();
  const storeId = String(formData.get("storeId"));
  const method = String(formData.get("method")); // "online" | "cod"
  if (method !== "online" && method !== "cod") return;

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return;

  const next = {
    onlinePaymentEnabled: store.onlinePaymentEnabled,
    codEnabled: store.codEnabled,
  };
  if (method === "online") next.onlinePaymentEnabled = !next.onlinePaymentEnabled;
  else next.codEnabled = !next.codEnabled;

  // No permitir desactivar los dos a la vez.
  if (!next.onlinePaymentEnabled && !next.codEnabled) return;

  await prisma.store.update({ where: { id: storeId }, data: next });
  revalidatePath("/superadmin");
}

export async function resetAdminPasswordAction(formData: FormData) {
  await requireSuperadmin();
  const storeId = String(formData.get("storeId"));
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: { owner: true },
  });
  if (!store) return;

  // Contraseña temporal legible (se muestra una sola vez al superadmin)
  const tempPassword = randomBytes(6).toString("base64url").slice(0, 10);
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await prisma.user.update({
    where: { id: store.ownerId },
    data: { passwordHash },
  });

  redirect(
    `/superadmin?resetEmail=${encodeURIComponent(store.owner.email)}&tempPass=${encodeURIComponent(tempPassword)}`,
  );
}

export async function deleteStoreAction(formData: FormData) {
  await requireSuperadmin();
  const storeId = String(formData.get("storeId"));
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (store) {
    // Borra la tienda y su usuario admin (los productos caen en cascada)
    await prisma.store.delete({ where: { id: storeId } });
    await prisma.user.delete({ where: { id: store.ownerId } }).catch(() => {});
    revalidatePath("/superadmin");
  }
}
