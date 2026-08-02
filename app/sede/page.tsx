import { redirect } from "next/navigation";
import { LogOut, Store, PackageSearch } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice, variantLabel } from "@/lib/utils";
import { PAYMENT_LABEL, PAYMENT_BADGE } from "@/lib/order-status";
import { getCurrentSede } from "@/lib/sede-auth";
import { SedeFulfillmentSelect } from "@/components/sede-fulfillment-select";
import { sedeLogoutAction } from "./actions";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("es", {
  dateStyle: "short",
  timeStyle: "short",
});

export default async function SedePanel() {
  const sede = await getCurrentSede();
  if (!sede) redirect("/sede/login");

  const orders = await prisma.order.findMany({
    where: { storeId: sede.storeId, locationName: sede.name },
    orderBy: { createdAt: "desc" },
    include: { items: true },
    take: 100,
  });

  const pending = orders.filter((o) => o.fulfillment !== "DELIVERED").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Store className="h-5 w-5 shrink-0 text-gray-700" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900">
                {sede.name}
              </p>
              <p className="truncate text-xs text-gray-400">
                {sede.store.name}
              </p>
            </div>
          </div>
          <form action={sedeLogoutAction}>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              <LogOut className="h-4 w-4" /> Salir
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Pedidos de tu sede
          </h1>
          <p className="text-sm text-gray-500">
            {orders.length} pedido{orders.length === 1 ? "" : "s"} ·{" "}
            {pending} por atender.
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <PackageSearch className="mx-auto h-9 w-9 text-gray-300" />
            <p className="mt-3 text-gray-500">
              Aún no hay pedidos para esta sede.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div
                key={o.id}
                className="rounded-2xl border border-gray-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      #{o.id.slice(-8)} · {o.customerName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {dateFmt.format(o.createdAt)}
                      {o.customerPhone ? ` · ${o.customerPhone}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${PAYMENT_BADGE[o.status]}`}
                    >
                      {PAYMENT_LABEL[o.status]}
                    </span>
                    <SedeFulfillmentSelect
                      orderId={o.id}
                      current={o.fulfillment}
                    />
                  </div>
                </div>

                <ul className="mt-3 space-y-1.5 border-t border-gray-100 pt-3 text-sm">
                  {o.items.map((i) => (
                    <li key={i.id} className="flex justify-between">
                      <span className="text-gray-600">
                        {i.name}
                        {variantLabel(i.color, i.size) && (
                          <span className="text-gray-400">
                            {" "}
                            ({variantLabel(i.color, i.size)})
                          </span>
                        )}{" "}
                        <span className="text-gray-400">×{i.quantity}</span>
                      </span>
                      <span className="text-gray-900">
                        {formatPrice(i.priceCents * i.quantity, o.currency)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                  <span className="text-xs text-gray-400">
                    Entrega: {o.address}
                  </span>
                  <span className="font-bold text-gray-900">
                    {formatPrice(o.totalCents, o.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
