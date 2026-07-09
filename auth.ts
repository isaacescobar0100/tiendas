import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { rateLimit, clientIp } from "@/lib/rate-limit";

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
        const rl = rateLimit(`admin-login:${ip}`, 8, 5 * 60 * 1000);
        if (!rl.ok) return null;

        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { store: { select: { id: true, slug: true } } },
        });
        if (!user) return null;

        // Bloqueo por intentos fallidos (3 → bloqueo 15 min).
        const now = Date.now();
        if (user.lockedUntil && user.lockedUntil.getTime() > now) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          const attempts = (user.lockedUntil ? 0 : user.failedAttempts) + 1;
          await prisma.user.update({
            where: { id: user.id },
            data:
              attempts >= 3
                ? { failedAttempts: 0, lockedUntil: new Date(now + 15 * 60000) }
                : { failedAttempts: attempts, lockedUntil: null },
          });
          return null;
        }

        // Éxito: limpia el conteo.
        if (user.failedAttempts !== 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedAttempts: 0, lockedUntil: null },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          storeId: user.store?.id ?? null,
          storeSlug: user.store?.slug ?? null,
        };
      },
    }),
  ],
});
