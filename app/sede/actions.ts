"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { Fulfillment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  setSedeSession,
  clearSedeSession,
  getCurrentSede,
} from "@/lib/sede-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export type SedeLoginState = { error?: string } | undefined;

export async function sedeLoginAction(
  _prev: SedeLoginState,
  formData: FormData,
): Promise<SedeLoginState> {
  const rl = rateLimit(`sede-login:${await clientIp()}`, 10, 5 * 60 * 1000);
  if (!rl.ok) {
    return { error: `Demasiados intentos. Espera ${rl.retryAfter}s.` };
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Indica correo y contraseña." };

  const sede = await prisma.storeLocation.findUnique({ where: { email } });
  if (
    !sede ||
    !sede.passwordHash ||
    !(await bcrypt.compare(password, sede.passwordHash))
  ) {
    return { error: "Correo o contraseña incorrectos." };
  }

  await setSedeSession(sede.id);
  redirect("/sede");
}

export async function sedeLogoutAction() {
  await clearSedeSession();
  redirect("/sede/login");
}

const FULFILLMENTS: Fulfillment[] = ["PENDING", "SHIPPED", "DELIVERED"];

/** La sede cambia el estado de envío, solo de SUS pedidos. */
export async function updateSedeFulfillmentAction(formData: FormData) {
  const sede = await getCurrentSede();
  if (!sede) redirect("/sede/login");

  const orderId = String(formData.get("orderId") ?? "");
  const value = String(formData.get("fulfillment") ?? "") as Fulfillment;
  if (!FULFILLMENTS.includes(value)) return;

  await prisma.order.updateMany({
    where: { id: orderId, storeId: sede.storeId, locationName: sede.name },
    data: { fulfillment: value },
  });
  revalidatePath("/sede");
}
