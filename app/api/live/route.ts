import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminStoreId } from "@/lib/guards";
import { getCurrentSede } from "@/lib/sede-auth";

export const dynamic = "force-dynamic";

/**
 * Pulso de "tiempo real": dice si algo cambió, sin mandar datos. Las pantallas
 * lo consultan cada pocos segundos y, si cambió, se actualizan solas.
 *  - scope=admin  → pedidos de la tienda del admin (sesión).
 *  - scope=sede   → pedidos de la sede (sesión de sede).
 *  - scope=order&id=… → un pedido (el cliente que lo hizo tiene su id).
 * Respuesta: { v: firma del estado, newest: fecha del pedido más reciente }.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");
  const noStore = { headers: { "Cache-Control": "no-store" } };

  if (scope === "order") {
    const id = url.searchParams.get("id") ?? "";
    if (!id || id.length > 40) return NextResponse.json({ error: "id" }, { status: 400 });
    const o = await prisma.order.findUnique({
      where: { id },
      select: { status: true, fulfillment: true, updatedAt: true },
    });
    if (!o) return NextResponse.json({ error: "no" }, { status: 404 });
    return NextResponse.json({ v: `${o.status}:${o.fulfillment}:${o.updatedAt.getTime()}`, newest: null }, noStore);
  }

  let where: { storeId: string; locationName?: string } | null = null;
  if (scope === "admin") {
    const storeId = await getAdminStoreId();
    if (storeId) where = { storeId };
  } else if (scope === "sede") {
    const sede = await getCurrentSede();
    if (sede) where = { storeId: sede.storeId, locationName: sede.name };
  }
  if (!where) return NextResponse.json({ error: "auth" }, { status: 401 });

  const agg = await prisma.order.aggregate({
    where,
    _count: { _all: true },
    _max: { updatedAt: true, createdAt: true },
  });
  return NextResponse.json(
    {
      v: `${agg._count._all}:${agg._max.updatedAt?.getTime() ?? 0}`,
      newest: agg._max.createdAt?.toISOString() ?? null,
    },
    noStore,
  );
}
