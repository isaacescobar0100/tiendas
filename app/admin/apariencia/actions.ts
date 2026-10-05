"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { checkTheme, normalizeTheme, type ThemeInput } from "@/lib/theme";

export type SaveThemeState = { ok?: boolean; error?: string } | undefined;

/**
 * Guarda el tema de la tienda. El servidor vuelve a normalizar (saturación) y
 * a comprobar el contraste: no se fía de lo que mande el navegador.
 */
export async function saveThemeAction(
  raw: Partial<Record<keyof ThemeInput, unknown>>,
): Promise<SaveThemeState> {
  const { store } = await requireAdminStore();
  if (!raw || typeof raw !== "object") return { error: "Datos inválidos." };

  const theme = normalizeTheme(raw);
  const failing = checkTheme(theme).filter((c) => !c.ok);
  if (failing.length) {
    return {
      error: `No se puede guardar: ${failing.map((c) => c.label.toLowerCase()).join(", ")} no se leen bien. Usa "Ajustar automáticamente".`,
    };
  }

  await prisma.store.update({
    where: { id: store.id },
    data: {
      themeColor: theme.brand,
      themeBg: theme.bg,
      themeSurface: theme.surface,
      themeInk: theme.ink,
      themeMode: theme.mode,
      themeFont: theme.font,
    },
  });
  // Toda la tienda (catálogo, producto, menú, carrito…) usa el tema.
  revalidatePath(`/${store.slug}`, "layout");
  revalidatePath("/admin/apariencia");
  return { ok: true };
}
