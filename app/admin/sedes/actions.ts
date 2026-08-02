"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";

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

export async function createLocationAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const d = read(formData);
  if (!d.name) return; // el nombre es obligatorio
  await prisma.storeLocation.create({
    data: {
      storeId: store.id,
      name: d.name,
      address: d.address,
      whatsapp: d.whatsapp,
      sortOrder: d.sortOrder,
    },
  });
  revalidatePath("/admin/sedes");
  revalidatePath(`/${store.slug}`);
}

export async function updateLocationAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const id = String(formData.get("id") ?? "");
  const d = read(formData);
  if (!d.name) return;
  await prisma.storeLocation.updateMany({
    where: { id, storeId: store.id },
    data: {
      name: d.name,
      address: d.address,
      whatsapp: d.whatsapp,
      sortOrder: d.sortOrder,
    },
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
