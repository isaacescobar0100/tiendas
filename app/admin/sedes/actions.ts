"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { parseCoords } from "@/lib/seo";

const MAPS_LINK = /^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl\/|goo\.gl\/maps)/i;

/**
 * Ubicación de la sede desde lo que pegue el admin: enlace de Google Maps
 * (también el corto maps.app.goo.gl, que se resuelve leyendo su redirección)
 * o "lat, lng". Vacío = sin ubicación.
 */
async function readMaps(formData: FormData) {
  const raw = String(formData.get("maps") ?? "").trim().slice(0, 600);
  if (!raw) return { lat: null, lng: null, mapsUrl: null };
  const mapsUrl = MAPS_LINK.test(raw) ? raw : null;
  let c = parseCoords(raw);
  // Enlace corto: solo se consulta Google (nada de otros sitios).
  if (!c && mapsUrl && /^https:\/\/(maps\.app\.goo\.gl|goo\.gl)\//i.test(mapsUrl)) {
    try {
      const r = await fetch(mapsUrl, { redirect: "manual", signal: AbortSignal.timeout(4000) });
      const to = r.headers.get("location");
      if (to) c = parseCoords(decodeURIComponent(to));
    } catch {}
  }
  return { lat: c?.lat ?? null, lng: c?.lng ?? null, mapsUrl };
}

function read(formData: FormData) {
  const str = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v.length > 0 ? v : null;
  };
  return {
    name: str("name"),
    address: str("address"),
    whatsapp: str("whatsapp"),
    sortOrder: Math.floor(Number(formData.get("sortOrder")) || 0),
  };
}

// Contraseña mínima de una sede (tiene acceso a datos de clientes y pagos).
const SEDE_MIN_PASSWORD = 8;

function readEmail(formData: FormData): string | null {
  const v = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  return v.length > 0 ? v : null;
}

export async function createLocationAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const d = read(formData);
  if (!d.name) return; // el nombre es obligatorio
  const geo = await readMaps(formData);

  let email = readEmail(formData);
  if (email && (await prisma.storeLocation.findFirst({ where: { email } }))) {
    email = null; // ya en uso: no lo asignamos
  }
  const password = String(formData.get("password") ?? "");
  const passwordHash =
    password.length >= SEDE_MIN_PASSWORD ? await bcrypt.hash(password, 10) : null;

  // Cupo del plan: se cuenta y se crea bajo un bloqueo de la fila de la tienda,
  // así dos envíos a la vez no pasan del tope.
  await prisma.$transaction(async (tx) => {
    const [row] = await tx.$queryRaw<{ maxLocations: number }[]>`
      SELECT "maxLocations" FROM "Store" WHERE id = ${store.id} FOR UPDATE`;
    const used = await tx.storeLocation.count({ where: { storeId: store.id } });
    if (!row || used >= row.maxLocations) return;
    await tx.storeLocation.create({
      data: {
        storeId: store.id,
        name: d.name!,
        address: d.address,
        whatsapp: d.whatsapp,
        ...geo,
        sortOrder: d.sortOrder,
        email,
        passwordHash,
      },
    });
  });
  revalidatePath("/admin/sedes");
  revalidatePath(`/${store.slug}`);
}

export async function updateLocationAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const id = String(formData.get("id") ?? "");
  const d = read(formData);
  if (!d.name) return;

  const data: {
    name: string;
    address: string | null;
    whatsapp: string | null;
    lat: number | null;
    lng: number | null;
    mapsUrl: string | null;
    sortOrder: number;
    email?: string | null;
    passwordHash?: string;
    sessionVersion?: { increment: number };
  } = {
    name: d.name,
    address: d.address,
    whatsapp: d.whatsapp,
    ...(await readMaps(formData)),
    sortOrder: d.sortOrder,
  };

  // Email: si está libre (o vacío) se aplica; si está en uso por otra sede, no.
  const email = readEmail(formData);
  if (!email) {
    data.email = null;
  } else {
    const dup = await prisma.storeLocation.findFirst({
      where: { email, id: { not: id } },
    });
    if (!dup) data.email = email;
  }

  // Contraseña: solo se cambia si escriben una nueva.
  const password = String(formData.get("password") ?? "");
  if (password.length >= SEDE_MIN_PASSWORD) {
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  // Si cambia el acceso (correo o contraseña), se cierran las sesiones abiertas
  // de esa sede.
  const current = await prisma.storeLocation.findFirst({
    where: { id, storeId: store.id },
    select: { email: true },
  });
  if (!current) return;
  const emailChanged = "email" in data && data.email !== current.email;
  if (emailChanged || data.passwordHash) {
    data.sessionVersion = { increment: 1 };
  }

  await prisma.storeLocation.updateMany({
    where: { id, storeId: store.id },
    data,
  });
  revalidatePath("/admin/sedes");
  revalidatePath(`/${store.slug}`);
}

export async function deleteLocationAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const id = String(formData.get("id") ?? "");
  await prisma.storeLocation.deleteMany({ where: { id, storeId: store.id } });
  revalidatePath("/admin/sedes");
  revalidatePath(`/${store.slug}`);
}
