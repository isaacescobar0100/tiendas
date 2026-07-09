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

/** Normaliza un dominio: minúsculas, sin protocolo, sin ruta ni puerto. */
function normalizeDomain(raw?: string): string | null {
  const d = (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[/:].*$/, "");
  return d || null;
}

const configSchema = z.object({
  storeId: z.string().min(1),
  storeName: z.string().min(2, "El nombre de la tienda es muy corto."),
  slug: z.string().min(2, "El slug es muy corto."),
  customDomain: z.string().optional(),
  wompiPublicKey: z.string().optional(),
  wompiPrivateKey: z.string().optional(),
  wompiIntegritySecret: z.string().optional(),
  wompiEventsSecret: z.string().optional(),
});

/** El superadmin edita la URL (slug), el dominio propio y las llaves de Wompi. */
export async function updateStoreConfigAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSuperadmin();

  const parsed = configSchema.safeParse({
    storeId: formData.get("storeId"),
    storeName: formData.get("storeName"),
    slug: formData.get("slug"),
    customDomain: formData.get("customDomain") ?? "",
    wompiPublicKey: formData.get("wompiPublicKey") ?? "",
    wompiPrivateKey: formData.get("wompiPrivateKey") ?? "",
    wompiIntegritySecret: formData.get("wompiIntegritySecret") ?? "",
    wompiEventsSecret: formData.get("wompiEventsSecret") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const store = await prisma.store.findUnique({ where: { id: d.storeId } });
  if (!store) return { error: "Tienda no encontrada." };

  const slug = slugify(d.slug);
  if (!slug) return { error: "Slug inválido." };
  if (await prisma.store.findFirst({ where: { slug, id: { not: store.id } } })) {
    return { error: "Ese slug ya está en uso por otra tienda." };
  }

  const customDomain = normalizeDomain(d.customDomain);
  if (
    customDomain &&
    (await prisma.store.findFirst({
      where: { customDomain, id: { not: store.id } },
    }))
  ) {
    return { error: "Ese dominio ya está asignado a otra tienda." };
  }

  const s = (v?: string) => {
    const t = (v ?? "").trim();
    return t.length ? t : null;
  };

  // Si cambia el slug, guardamos el anterior como alias (para redirigir viejos
  // enlaces al nuevo) y liberamos el nuevo por si era un alias.
  if (slug !== store.slug) {
    await prisma.storeSlugAlias.deleteMany({ where: { slug } });
    await prisma.storeSlugAlias.upsert({
      where: { slug: store.slug },
      update: { storeId: store.id },
      create: { slug: store.slug, storeId: store.id },
    });
  }

  await prisma.store.update({
    where: { id: store.id },
    data: {
      name: d.storeName.trim(),
      slug,
      customDomain,
      wompiPublicKey: s(d.wompiPublicKey),
      wompiPrivateKey: s(d.wompiPrivateKey),
      wompiIntegritySecret: s(d.wompiIntegritySecret),
      wompiEventsSecret: s(d.wompiEventsSecret),
    },
  });

  revalidatePath("/superadmin");
  revalidatePath(`/${store.slug}`);
  revalidatePath(`/${slug}`);
  return { ok: true };
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

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Indica tu contraseña actual."),
    newPassword: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Las contraseñas nuevas no coinciden.",
    path: ["confirmPassword"],
  });

/** El superadmin cambia su propia contraseña (pide la actual por seguridad). */
export async function changeMyPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireSuperadmin();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "Usuario no encontrado." };

  const valid = await bcrypt.compare(
    parsed.data.currentPassword,
    dbUser.passwordHash,
  );
  if (!valid) return { error: "La contraseña actual no es correcta." };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return { ok: true };
}
