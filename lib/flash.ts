// Mensaje de un solo vistazo para el superadmin (p. ej. la clave temporal al
// resetear la de un admin). Va en una cookie firmada y httpOnly que caduca en
// 2 minutos, en vez de en la URL (que queda en el historial y en los logs).
import "server-only";
import { cookies } from "next/headers";
import { signPayload, verifyPayload, cookieOptions } from "@/lib/signed-cookie";

const COOKIE = "sa_flash";
const PURPOSE = "flash";
const MAX_AGE = 120;

export async function setTempPasswordFlash(email: string, tempPassword: string) {
  const token = signPayload(PURPOSE, {
    email,
    tempPassword,
    exp: Date.now() + MAX_AGE * 1000,
  });
  (await cookies()).set(COOKIE, token, {
    ...cookieOptions(MAX_AGE),
    path: "/superadmin",
  });
}

export async function clearTempPasswordFlash() {
  (await cookies()).delete({ name: COOKIE, path: "/superadmin" });
}

export async function readTempPasswordFlash() {
  return verifyPayload<{ email: string; tempPassword: string; exp: number }>(
    PURPOSE,
    (await cookies()).get(COOKIE)?.value,
  );
}
