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
import { setOrderPaymentStatus } from "@/lib/orders";
import {
  isLocked,
  registerFailure,
  clearFailures,
  DUMMY_HASH,
  LOCK_MIN,
} from "@/lib/lockout";

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

  const fail = { error: "Correo o contraseña incorrectos." };
  const sede = await prisma.storeLocation.findUnique({ where: { email } });
  if (!sede || !sede.passwordHash) {
    // Misma espera que con una sede real (no revela si el correo existe).
    await bcrypt.compare(password, DUMMY_HASH);
    return fail;
  }

  // Bloqueo por intentos fallidos (3 → 15 min), igual que admin y clientes.
  if (await isLocked("sede", sede.id)) {
    return { error: `Acceso bloqueado por seguridad. Inténtalo en ${LOCK_MIN} min.` };
  }
  if (!(await bcrypt.compare(password, sede.passwordHash))) {
    await registerFailure("sede", sede.id);
    return fail;
  }
  if (await isLocked("sede", sede.id)) {
    return { error: `Acceso bloqueado por seguridad. Inténtalo en ${LOCK_MIN} min.` };
  }
  await clearFailures("sede", sede.id);

  await setSedeSession(sede.id, sede.sessionVersion);
  redirect("/sede");
}

export async function sedeLogoutAction() {
  await clearSedeSession();
  redirect("/sede/login");
}

const FULFILLMENTS: Fulfillment[] = ["PENDING", "SHIPPED", "DELIVERED"];
const PAYMENTS = ["PENDING", "PAID", "CANCELLED"] as const;

/** La sede cambia el estado de ENVÍO, solo de SUS pedidos. */
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
  revalidatePath("/sede/pedidos");
  revalidatePath("/sede");
}

/** La sede cambia el estado de PAGO, solo de SUS pedidos. */
export async function updateSedePaymentAction(formData: FormData) {
  const sede = await getCurrentSede();
  if (!sede) redirect("/sede/login");

  const orderId = String(formData.get("orderId") ?? "");
  const value = String(formData.get("status") ?? "") as (typeof PAYMENTS)[number];
  if (!PAYMENTS.includes(value)) return;

  await setOrderPaymentStatus(
    { id: orderId, storeId: sede.storeId, locationName: sede.name },
    value,
  );
  revalidatePath("/sede/pedidos");
  revalidatePath("/sede");
}
