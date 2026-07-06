"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { parsePriceToCents } from "@/lib/utils";

export type SettingsState = { error?: string; ok?: boolean } | undefined;

const storeSchema = z.object({
  name: z.string().min(2, "El nombre es muy corto."),
  description: z.string().optional(),
  logoUrl: z.string().url("URL de logo inválida.").optional().or(z.literal("")),
  // Color de marca en formato hex (#rrggbb). La moneda es fija (COP).
  themeColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color inválido.")
    .optional(),
  // Envío (en pesos, texto): costo fijo y umbral de envío gratis.
  shipping: z.string().optional(),
  freeShippingOver: z.string().optional(),
  // WhatsApp de la tienda (para avisos de pedido). Texto libre; se normaliza al usar.
  whatsapp: z.string().optional(),
});

export async function updateStoreAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { store } = await requireAdminStore();

  const parsed = storeSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    logoUrl: formData.get("logoUrl") ?? "",
    themeColor: (formData.get("themeColor") as string) || undefined,
    shipping: (formData.get("shipping") as string) ?? "",
    freeShippingOver: (formData.get("freeShippingOver") as string) ?? "",
    whatsapp: (formData.get("whatsapp") as string) ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Envío: se escribe en pesos; se guarda en céntimos (0 si vacío/ inválido).
  const shippingCents = parsePriceToCents(parsed.data.shipping || "0") ?? 0;
  const freeShippingOverCents =
    parsePriceToCents(parsed.data.freeShippingOver || "0") ?? 0;

  // La URL (slug) y la moneda (COP) no las cambia el admin.
  await prisma.store.update({
    where: { id: store.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      logoUrl: parsed.data.logoUrl || null,
      whatsapp: parsed.data.whatsapp?.trim() || null,
      shippingCents,
      freeShippingOverCents,
      ...(parsed.data.themeColor
        ? { themeColor: parsed.data.themeColor }
        : {}),
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath(`/${store.slug}`);
  return { ok: true };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Indica tu contraseña actual."),
    newPassword: z.string().min(6, "La nueva debe tener 6+ caracteres."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Las contraseñas nuevas no coinciden.",
    path: ["confirmPassword"],
  });

export async function changePasswordAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { user } = await requireAdminStore();

  const parsed = passwordSchema.safeParse({
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
