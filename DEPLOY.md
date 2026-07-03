# 🚀 Desplegar en Vercel

La app ya está lista para producción. La base de datos (Neon) ya está en la nube
y las imágenes usan **Vercel Blob** automáticamente cuando se despliega.

## Variables de entorno que necesita Vercel

| Variable | Valor | Obligatoria |
|---|---|---|
| `DATABASE_URL` | Tu connection string de Neon (la del `.env`) | ✅ Sí |
| `AUTH_SECRET` | El secreto del `.env` (o genera otro con `openssl rand -base64 32`) | ✅ Sí |
| `BLOB_READ_WRITE_TOKEN` | Se crea sola al conectar un Blob Store (paso 4) | ✅ Sí (para subir imágenes) |
| `RESEND_API_KEY` | API key de Resend | ⬜ Opcional (emails) |
| `EMAIL_FROM` | Remitente de los emails | ⬜ Opcional |

---

## Opción A — Con la CLI de Vercel (más rápida, solo cuenta de Vercel)

```bash
npm i -g vercel      # instala la CLI
vercel login         # abre el navegador para iniciar sesión
vercel               # sigue las preguntas (crea el proyecto)
```

Luego, en el **dashboard de Vercel** del proyecto:
1. **Settings → Environment Variables**: añade `DATABASE_URL` y `AUTH_SECRET`.
2. **Storage → Create → Blob**: conéctalo al proyecto (crea `BLOB_READ_WRITE_TOKEN` solo).
3. Vuelve a desplegar: `vercel --prod`

## Opción B — Con GitHub (recomendada para auto-deploys)

1. Crea un repositorio en [github.com/new](https://github.com/new) (ej. `tienda`).
2. Sube el código:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/tienda.git
   git branch -M main
   git push -u origin main
   ```
3. En [vercel.com/new](https://vercel.com/new): **Import** ese repositorio.
4. Antes de "Deploy", en **Environment Variables** añade `DATABASE_URL` y `AUTH_SECRET`.
5. Pulsa **Deploy**.
6. Cuando termine: **Storage → Create → Blob** y conéctalo al proyecto.
7. Haz **Redeploy** (para que tome el `BLOB_READ_WRITE_TOKEN`).

Con GitHub, cada `git push` vuelve a desplegar solo.

---

## Notas importantes

- **La base de datos ya tiene los datos** (misma Neon que usas en local), así que la
  tienda de ejemplo y los usuarios ya estarán ahí. Login:
  - Superadmin: `super@mitienda.com` / `password123`
  - Admin: `admin@modacentral.com` / `password123`
  > ⚠️ Cambia estas contraseñas antes de usarlo en serio.
- El build de Vercel ejecuta `prisma generate && next build` automáticamente. **No**
  corre migraciones: si cambias el esquema, ejecuta `npm run db:push` desde tu PC
  (o añade una migración) — apunta a la misma base de datos.
- Las imágenes que subas en producción se guardan en Vercel Blob; las que ya
  existen (por URL, tipo picsum) siguen funcionando.
