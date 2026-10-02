import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import {
  isLocked,
  registerFailure,
  clearFailures,
  DUMMY_HASH,
} from "@/lib/lockout";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(raw) {
        // Límite de intentos por IP (anti fuerza bruta). Falla-abierto si no se
        // puede leer la IP, para no bloquear un login legítimo por un fallo.
        let ip = "desconocida";
        try {
          ip = await clientIp();
        } catch {
          // sin IP: seguimos sin limitar
        }
        const rl = await rateLimit(`admin-login:${ip}`, 8, 5 * 60 * 1000);
        if (!rl.ok) return null;

        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { store: { select: { id: true, slug: true } } },
        });
        if (!user) {
          // Misma espera que con un usuario real (no revela si existe).
          await bcrypt.compare(password, DUMMY_HASH);
          return null;
        }

        // Bloqueo por intentos fallidos (3 → bloqueo 15 min), atómico.
        if (await isLocked("user", user.id)) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          await registerFailure("user", user.id);
          return null;
        }
        // Un bloqueo puesto por intentos simultáneos también frena este acierto.
        if (await isLocked("user", user.id)) return null;
        await clearFailures("user", user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          storeId: user.store?.id ?? null,
          storeSlug: user.store?.slug ?? null,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
});
