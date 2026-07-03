"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";

export type SettingsState = { error?: string; ok?: boolean } | undefined;

const storeSchema = z.object({
  name: z.string().min(2, "El nombre es muy corto."),
  description: z.string().optional(),
  logoUrl: z.string().url("URL de logo inválida.").optional().or(z.literal("")),
  currency: z.string().min(3).max(3),
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
    currency: (formData.get("currency") as string)?.toUpperCase(),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // La URL (slug) de la tienda la gestiona el superadmin; el admin no la cambia.
  await prisma.store.update({
    where: { id: store.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      logoUrl: parsed.data.logoUrl || null,
      currency: parsed.data.currency,
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
