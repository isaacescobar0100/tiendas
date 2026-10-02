// "Entrar a la tienda": el superadmin ve el panel de un admin sin su clave.
// Cookie httpOnly firmada (lib/signed-cookie), ligada al superadmin que la creó
// y con caducidad propia. Solo la usa el superadmin.
import "server-only";
import { cookies } from "next/headers";
import { signPayload, verifyPayload, cookieOptions } from "@/lib/signed-cookie";

const COOKIE = "sa_impersonate";
const PURPOSE = "impersonate";
const MAX_AGE = 60 * 60 * 8; // 8 horas

export async function setImpersonation(storeId: string, superadminId: string) {
  const token = signPayload(PURPOSE, {
    storeId,
    uid: superadminId,
    exp: Date.now() + MAX_AGE * 1000,
  });
  (await cookies()).set(COOKIE, token, cookieOptions(MAX_AGE));
}

export async function clearImpersonation() {
  (await cookies()).delete(COOKIE);
}

/** storeId impersonado por este superadmin si la cookie es válida; si no, null. */
export async function getImpersonatedStoreId(
  superadminId: string,
): Promise<string | null> {
  const data = verifyPayload<{ storeId: string; uid: string; exp: number }>(
    PURPOSE,
    (await cookies()).get(COOKIE)?.value,
  );
  if (!data?.storeId || data.uid !== superadminId) return null;
  return data.storeId;
}
