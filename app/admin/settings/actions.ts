"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { parseCoverVideo } from "@/lib/video";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { signOut } from "@/auth";
import { parsePriceToCents, isSafeImageUrl } from "@/lib/utils";
import { isHttpUrl } from "@/lib/payment-methods";
import { parseStoreHours, serializeStoreHours } from "@/lib/store-hours";
import { isWompiConfigured, resolveWompiKeys } from "@/lib/wompi";
import {
  parseTransferAccounts,
  serializeTransferAccounts,
} from "@/lib/payment-methods";

export type SettingsState = { error?: string; ok?: boolean } | undefined;

/**
 * Guarda UNA sección de Ajustes (General, Portada, Envíos, Horario, Avisos).
 * Cada sección solo toca sus propios campos: guardar una no borra las demás.
 */
export async function updateStoreAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { store } = await requireAdminStore();
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const section = str("section");
  let data: Prisma.StoreUpdateInput;

  switch (section) {
    case "general": {
      const logoUrl = str("logoUrl");
      const surveyUrl = str("surveyUrl");
      // Solo http(s) (o /uploads para imágenes): nunca javascript:, data:, etc.
      if (logoUrl && !isSafeImageUrl(logoUrl)) return { error: "URL de logo inválida." };
      if (surveyUrl && !isHttpUrl(surveyUrl)) return { error: "URL de encuesta inválida." };
      data = {
        description: str("description").slice(0, 600) || null,
        logoUrl: logoUrl || null,
        surveyUrl: surveyUrl || null,
        whatsapp: str("whatsapp").slice(0, 30) || null,
      };
      break;
    }
    case "portada": {
      const bannerUrl = str("bannerUrl");
      const bannerVideoUrl = str("bannerVideoUrl");
      if (bannerUrl && !isSafeImageUrl(bannerUrl)) return { error: "URL de banner inválida." };
      // Video: archivo https, YouTube o Vimeo (mismo criterio que la portada).
      if (bannerVideoUrl && !parseCoverVideo(bannerVideoUrl)) {
        return { error: "Video no válido: usa YouTube, Vimeo o un video .mp4 con https." };
      }
      data = { bannerUrl: bannerUrl || null, bannerVideoUrl: bannerVideoUrl || null };
      break;
    }
    case "envios": {
      // Se escribe en pesos; se guarda en céntimos (0 si vacío/inválido).
      data = {
        shippingCents: parsePriceToCents(str("shipping") || "0") ?? 0,
        freeShippingOverCents: parsePriceToCents(str("freeShippingOver") || "0") ?? 0,
      };
      break;
    }
    case "horario": {
      // Horario re-serializado canónico (vacío si es inválido) y categorías
      // "merch" validadas contra las categorías de la tienda.
      const valid = new Set(
        (
          await prisma.category.findMany({ where: { storeId: store.id }, select: { id: true } })
        ).map((c) => c.id),
      );
      data = {
        hoursJson: serializeStoreHours(parseStoreHours(str("hoursJson"))),
        merchCategoryIds: [
          ...new Set(formData.getAll("merchCategoryIds").map(String)),
        ].filter((id) => valid.has(id)),
      };
      break;
    }
    case "avisos": {
      data = {
        notifyEmail: formData.get("notifyEmail") === "on",
        notifyWhatsapp: formData.get("notifyWhatsapp") === "on",
      };
      break;
    }
    default:
      return { error: "Sección inválida." };
  }

  // La URL (slug), el nombre y la moneda (COP) no los cambia el admin.
  await prisma.store.update({ where: { id: store.id }, data });

  revalidatePath("/admin/settings", "layout");
  revalidatePath("/admin");
  revalidatePath(`/${store.slug}`, "layout");
  return { ok: true };
}

/**
 * Métodos de pago que la tienda ofrece en el checkout, y sus cuentas/QR para
 * transferencia directa. Wompi solo se puede activar si el superadmin ya
 * configuró las llaves.
 */
export async function updatePaymentsAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { store } = await requireAdminStore();

  const wompiReady = isWompiConfigured(resolveWompiKeys(store));
  // Sin llaves el checkbox va deshabilitado (no llega): se conserva lo que había.
  const onlinePaymentEnabled = wompiReady
    ? formData.get("onlinePayment") === "on"
    : store.onlinePaymentEnabled;
  const codEnabled = formData.get("codPayment") === "on";
  const transferEnabled = formData.get("transferPayment") === "on";

  const accounts = parseTransferAccounts(
    String(formData.get("transferAccountsJson") ?? ""),
  );
  if (transferEnabled && accounts.length === 0) {
    return {
      error: "Para cobrar por transferencia agrega al menos una llave, número o QR.",
    };
  }
  if (!(onlinePaymentEnabled && wompiReady) && !codEnabled && !transferEnabled) {
    return { error: "Debe quedar al menos un método de pago activo." };
  }

  await prisma.store.update({
    where: { id: store.id },
    data: {
      onlinePaymentEnabled,
      codEnabled,
      transferEnabled,
      transferAccountsJson: serializeTransferAccounts(accounts),
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/superadmin");
  revalidatePath(`/${store.slug}`);
  return { ok: true };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Indica tu contraseña actual."),
    newPassword: z.string().min(8, "La nueva debe tener 8+ caracteres."),
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
  const { user, impersonating } = await requireAdminStore();
  if (impersonating) {
    return { error: "No disponible mientras entras como superadmin." };
  }

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
    // Cierra todas las sesiones abiertas (incluida esta): hay que volver a entrar.
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });

  await signOut({ redirectTo: "/login?changed=1" });
  return { ok: true };
}
