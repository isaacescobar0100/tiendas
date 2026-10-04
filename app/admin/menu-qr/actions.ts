"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";

export type TableState = { ok?: string; error?: string } | undefined;

const MAX_TABLES = 300; // por tienda
const MAX_BATCH = 100; // por cada "crear varias"

function cleanName(v: unknown): string {
  return String(v ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

/** Sede elegida: solo si es de esta tienda; "" = sin sede. */
async function resolveLocation(storeId: string, raw: unknown): Promise<string | null | false> {
  const id = String(raw ?? "");
  if (!id) return null;
  const loc = await prisma.storeLocation.findFirst({ where: { id, storeId }, select: { id: true } });
  return loc ? loc.id : false;
}

/** Crea varias mesas de una vez: "Mesa 1" … "Mesa N" (salta las que ya existen). */
export async function createTablesAction(_prev: TableState, formData: FormData): Promise<TableState> {
  const { store } = await requireAdminStore();
  const prefix = cleanName(formData.get("prefix")) || "Mesa";
  const from = Math.floor(Number(formData.get("from")));
  const to = Math.floor(Number(formData.get("to")));
  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < from) {
    return { error: "Revisa los números: «desde» debe ser menor o igual que «hasta»." };
  }
  if (to - from + 1 > MAX_BATCH) return { error: `Máximo ${MAX_BATCH} mesas por vez.` };
  const locationId = await resolveLocation(store.id, formData.get("locationId"));
  if (locationId === false) return { error: "Sede no válida." };

  const existing = await prisma.diningTable.findMany({
    where: { storeId: store.id, locationId },
    select: { name: true },
  });
  const taken = new Set(existing.map((t) => t.name.toLowerCase()));
  const names: string[] = [];
  for (let n = from; n <= to; n++) {
    const name = `${prefix} ${n}`.slice(0, 40);
    if (!taken.has(name.toLowerCase())) names.push(name);
  }
  if (names.length === 0) return { error: "Esas mesas ya existen en esa sede." };
  const total = await prisma.diningTable.count({ where: { storeId: store.id } });
  if (total + names.length > MAX_TABLES) {
    return { error: `Máximo ${MAX_TABLES} mesas por tienda (tienes ${total}).` };
  }
  await prisma.diningTable.createMany({
    data: names.map((name) => ({ storeId: store.id, locationId, name })),
  });
  revalidatePath("/admin/menu-qr");
  const skipped = to - from + 1 - names.length;
  return {
    ok: `${names.length === 1 ? "1 mesa creada" : `${names.length} mesas creadas`}${skipped ? ` (${skipped} ya existían)` : ""}.`,
  };
}

/**
 * Agrega un QR suelto: una mesa con nombre libre ("Barra", "Terraza 2"…) o un
 * QR general (entrada, mostrador, volantes) que no muestra número de mesa.
 */
export async function addTableAction(_prev: TableState, formData: FormData): Promise<TableState> {
  const { store } = await requireAdminStore();
  const general = formData.get("kind") === "general";
  const name = cleanName(formData.get("name")) || (general ? "Menú general" : "");
  if (!name) return { error: "Escribe el nombre de la mesa." };
  const locationId = await resolveLocation(store.id, formData.get("locationId"));
  if (locationId === false) return { error: "Sede no válida." };
  const dup = await prisma.diningTable.findFirst({
    where: { storeId: store.id, locationId, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (dup) return { error: `Ya existe «${name}» en esa sede.` };
  if ((await prisma.diningTable.count({ where: { storeId: store.id } })) >= MAX_TABLES) {
    return { error: `Máximo ${MAX_TABLES} mesas por tienda.` };
  }
  await prisma.diningTable.create({ data: { storeId: store.id, locationId, name, general } });
  revalidatePath("/admin/menu-qr");
  return { ok: `«${name}» creada.` };
}

/** Cambia el nombre (el QR impreso sigue sirviendo: lleva el id). */
export async function renameTableAction(_prev: TableState, formData: FormData): Promise<TableState> {
  const { store } = await requireAdminStore();
  const id = String(formData.get("id") ?? "");
  const name = cleanName(formData.get("name"));
  if (!name) return { error: "El nombre no puede quedar vacío." };
  const r = await prisma.diningTable.updateMany({ where: { id, storeId: store.id }, data: { name } });
  if (!r.count) return { error: "Mesa no encontrada." };
  revalidatePath("/admin/menu-qr");
  return { ok: "Nombre guardado." };
}

export async function deleteTableAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const id = String(formData.get("id") ?? "");
  await prisma.diningTable.deleteMany({ where: { id, storeId: store.id } });
  revalidatePath("/admin/menu-qr");
}
