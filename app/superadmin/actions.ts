"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { renewedUntil } from "@/lib/billing";
import { slugify, isReservedSlug } from "@/lib/utils";
import { requireSuperadmin } from "@/lib/guards";
import { setImpersonation, clearImpersonation } from "@/lib/impersonation";
import { setTempPasswordFlash, clearTempPasswordFlash } from "@/lib/flash";
import { sendRentEmail } from "@/lib/email";
import { signOut } from "@/auth";

const adminSchema = z.object({
  adminName: z.string().min(2, "El nombre del admin es muy corto."),
  adminEmail: z.string().email("Email inválido."),
  adminPassword: z.string().min(8, "La contraseña debe tener 8+ caracteres."),
});

export type ActionState = { error?: string; ok?: boolean } | undefined;

/** Genera un slug único para la tienda a partir del nombre. */
async function uniqueStoreSlug(name: string): Promise<string> {
  let base = slugify(name) || "tienda";
  if (isReservedSlug(base)) base = `${base}-tienda`;
  let slug = base;
  let n = 1;
  while (await prisma.store.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
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

/**
 * ¿El dominio ya abre ESTA tienda? Se pide su llms.txt (lo responde la propia
 * tienda según el dominio) y se compara el nombre. Evita activar un dominio
 * cuyo DNS o Vercel aún no está listo (rompería los enlaces y el SEO).
 */
async function domainServesStore(domain: string, storeName: string): Promise<boolean> {
  try {
    const res = await fetch(`https://${domain}/llms.txt`, { signal: AbortSignal.timeout(7000), cache: "no-store" });
    if (!res.ok) return false;
    return (await res.text()).startsWith(`# ${storeName}`);
  } catch {
    return false;
  }
}

const configSchema = z.object({
  storeName: z.string().min(2, "El nombre de la tienda es muy corto."),
  slug: z.string().optional(),
  type: z.enum(["FASHION", "FOOD", "LIQUOR"]),
  currency: z.string().optional(),
  customDomain: z.string().optional(),
  plan: z.enum(["SALE", "RENT"]).optional(),
  paidUntil: z.string().optional(),
  maxLocations: z.coerce
    .number()
    .int("Las sedes deben ser un número entero.")
    .min(1, "El plan incluye al menos 1 sede.")
    .max(50, "Máximo 50 sedes."),
  seoCity: z.string().max(60).optional(),
  seoKeywords: z.string().max(300).optional(),
  wompiPublicKey: z.string().optional(),
  wompiPrivateKey: z.string().optional(),
  wompiIntegritySecret: z.string().optional(),
  wompiEventsSecret: z.string().optional(),
});

type CurrentStore = { id: string; slug: string; name: string; customDomain: string | null; domainActive: boolean; paidUntil: Date | null };

/**
 * Lee y valida la configuración de una tienda: la MISMA al crearla
 * (current = null) y al editarla. Devuelve los datos listos para guardar.
 */
async function readStoreConfig(formData: FormData, current: CurrentStore | null) {
  const parsed = configSchema.safeParse({
    storeName: formData.get("storeName"),
    slug: formData.get("slug") ?? "",
    type: (formData.get("type") as string) || "FOOD",
    currency: (formData.get("currency") as string) ?? "",
    customDomain: formData.get("customDomain") ?? "",
    plan: (formData.get("plan") as string) || "SALE",
    paidUntil: formData.get("paidUntil") ?? "",
    maxLocations: formData.get("maxLocations") ?? 1,
    seoCity: formData.get("seoCity") ?? "",
    seoKeywords: formData.get("seoKeywords") ?? "",
    wompiPublicKey: formData.get("wompiPublicKey") ?? "",
    wompiPrivateKey: formData.get("wompiPrivateKey") ?? "",
    wompiIntegritySecret: formData.get("wompiIntegritySecret") ?? "",
    wompiEventsSecret: formData.get("wompiEventsSecret") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message } as const;
  const d = parsed.data;
  const s = (v?: string) => {
    const t = (v ?? "").trim();
    return t.length ? t : null;
  };

  // URL corta: la escrita o, al crear sin escribirla, una a partir del nombre.
  let slug = slugify(d.slug ?? "");
  if (!slug) {
    if (current) return { error: "Slug inválido." } as const;
    slug = await uniqueStoreSlug(d.storeName);
  } else {
    if (isReservedSlug(slug)) return { error: "Ese slug está reservado por el sistema. Elige otro." } as const;
    if (await prisma.store.findFirst({ where: { slug, ...(current ? { id: { not: current.id } } : {}) } })) {
      return { error: "Ese slug ya está en uso por otra tienda." } as const;
    }
  }

  const customDomain = normalizeDomain(d.customDomain);
  if (customDomain && (await prisma.store.findFirst({ where: { customDomain, ...(current ? { id: { not: current.id } } : {}) } }))) {
    return { error: "Ese dominio ya está asignado a otra tienda." } as const;
  }
  // Dominio activo: solo si ya abre esta tienda (se comprueba al activarlo).
  let domainActive = false;
  if (current && customDomain && formData.get("domainActive") === "on") {
    const already = current.domainActive && current.customDomain === customDomain;
    if (!already && !(await domainServesStore(customDomain, current.name))) {
      return {
        error: `El dominio ${customDomain} todavía no abre esta tienda. Revisa que esté en Vercel → Domains y que el DNS apunte bien; luego vuelve a activarlo.`,
      } as const;
    }
    domainActive = true;
  }

  const paidUntil = d.paidUntil ? new Date(`${d.paidUntil}T23:59:59-05:00`) : null;
  if (paidUntil && Number.isNaN(paidUntil.getTime())) return { error: "Fecha de pago inválida." } as const;

  const onlinePaymentEnabled = formData.get("onlinePayment") === "on";
  const codEnabled = formData.get("codPayment") === "on";
  const transferEnabled = formData.get("transferPayment") === "on";
  if (!onlinePaymentEnabled && !codEnabled && !transferEnabled) {
    return { error: "Debe quedar al menos un método de pago activo." } as const;
  }

  const keywords =
    s(d.seoKeywords)
      ?.split(",")
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 12)
      .join(", ") || null;

  return {
    data: {
      name: d.storeName.trim(),
      slug,
      type: d.type,
      customDomain,
      domainActive,
      plan: d.plan === "RENT" ? ("RENT" as const) : ("SALE" as const),
      paidUntil,
      maxLocations: d.maxLocations,
      onlinePaymentEnabled,
      codEnabled,
      transferEnabled,
      seoCity: s(d.seoCity),
      seoKeywords: keywords,
      wompiPublicKey: s(d.wompiPublicKey),
      wompiPrivateKey: s(d.wompiPrivateKey),
      wompiIntegritySecret: s(d.wompiIntegritySecret),
      wompiEventsSecret: s(d.wompiEventsSecret),
    },
    currency: (s(d.currency) ?? "COP").toUpperCase().slice(0, 3),
  } as const;
}

/** Crea la tienda YA configurada (igual que «Configurar tienda») y su admin. */
export async function createStoreAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSuperadmin();

  const admin = adminSchema.safeParse({
    adminName: formData.get("adminName"),
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
  });
  if (!admin.success) return { error: admin.error.issues[0].message };
  const cfg = await readStoreConfig(formData, null);
  if ("error" in cfg) return { error: cfg.error };
  if (!/^[A-Z]{3}$/.test(cfg.currency)) return { error: "La moneda debe tener 3 letras (ej. COP)." };

  const email = admin.data.adminEmail.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: "Ya existe un usuario con ese email." };
  }
  const passwordHash = await bcrypt.hash(admin.data.adminPassword, 10);

  // Crea el usuario admin y su tienda de forma atómica
  await prisma.user.create({
    data: {
      email,
      name: admin.data.adminName,
      passwordHash,
      role: "ADMIN",
      store: { create: { ...cfg.data, currency: cfg.currency } },
    },
  });

  revalidatePath("/superadmin");
  redirect("/superadmin");
}

/** El superadmin edita la configuración de la tienda (los mismos campos que al crearla). */
export async function updateStoreConfigAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSuperadmin();

  const storeId = String(formData.get("storeId") ?? "");
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return { error: "Tienda no encontrada." };
  const cfg = await readStoreConfig(formData, store);
  if ("error" in cfg) return { error: cfg.error };
  const { slug } = cfg.data;

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
  // Si cambia la fecha de pago, reinicia el aviso para el nuevo ciclo.
  const paidChanged = (cfg.data.paidUntil?.getTime() ?? null) !== (store.paidUntil?.getTime() ?? null);

  await prisma.store.update({
    where: { id: store.id },
    data: { ...cfg.data, ...(paidChanged ? { rentNotice: null } : {}) },
  });

  revalidatePath("/superadmin");
  revalidatePath(`/${store.slug}`, "layout");
  revalidatePath(`/${slug}`, "layout");
  return { ok: true };
}

/** Renueva el plan: +1 año (pago único + anual) o +1 mes (mensual), desde la
 *  fecha actual si aún no vence o desde hoy si ya venció. Reactiva la tienda. */
export async function renewStoreAction(formData: FormData) {
  await requireSuperadmin();
  const storeId = String(formData.get("storeId"));
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: { owner: { select: { email: true } } },
  });
  if (!store) return;

  const base = renewedUntil(store);

  await prisma.store.update({
    where: { id: storeId },
    data: { paidUntil: base, active: true, rentNotice: null },
  });
  // Confirmación al admin de la tienda (no bloquea si el correo falla).
  await sendRentEmail({
    to: store.owner.email,
    storeName: store.name,
    kind: "renewed",
    paidUntil: base,
  });
  revalidatePath("/superadmin");
}

/** "Entrar a la tienda": abre el panel del admin de esa tienda. */
export async function impersonateStoreAction(formData: FormData) {
  const user = await requireSuperadmin();
  const storeId = String(formData.get("storeId"));
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return;
  await setImpersonation(storeId, user.id);
  redirect("/admin");
}

/** Salir del modo "ver como tienda" y volver al panel del superadmin. */
export async function stopImpersonationAction() {
  await requireSuperadmin();
  await clearImpersonation();
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
  const method = String(formData.get("method")); // "online" | "cod" | "transfer"
  if (method !== "online" && method !== "cod" && method !== "transfer") return;

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return;

  const next = {
    onlinePaymentEnabled: store.onlinePaymentEnabled,
    codEnabled: store.codEnabled,
    transferEnabled: store.transferEnabled,
  };
  if (method === "online") next.onlinePaymentEnabled = !next.onlinePaymentEnabled;
  else if (method === "cod") next.codEnabled = !next.codEnabled;
  else next.transferEnabled = !next.transferEnabled;

  // No permitir dejar la tienda sin ningún método.
  if (!next.onlinePaymentEnabled && !next.codEnabled && !next.transferEnabled) return;

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
    // Cierra las sesiones abiertas del admin y quita un bloqueo previo.
    data: {
      passwordHash,
      sessionVersion: { increment: 1 },
      failedAttempts: 0,
      lockedUntil: null,
    },
  });

  // La clave temporal se muestra una vez vía una cookie firmada de 2 minutos,
  // no en la URL (evita historial del navegador y logs).
  await setTempPasswordFlash(store.owner.email, tempPassword);
  redirect("/superadmin");
}

/** Oculta el aviso con la clave temporal. */
export async function dismissTempPasswordAction() {
  await requireSuperadmin();
  await clearTempPasswordFlash();
  redirect("/superadmin");
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
    // Cierra todas las sesiones abiertas (incluida esta).
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });

  await clearImpersonation();
  await signOut({ redirectTo: "/login?changed=1" });
  return { ok: true };
}
