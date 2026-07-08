import Link from "next/link";
import { notFound } from "next/navigation";
import { LogOut, PackageSearch } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice, variantLabel } from "@/lib/utils";
import {
  PAYMENT_LABEL,
  PAYMENT_BADGE,
  FULFILLMENT_LABEL,
  FULFILLMENT_BADGE,
} from "@/lib/order-status";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { AccountForms } from "./account-forms";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("es", { dateStyle: "medium" });

export default async function AccountPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = await prisma.store.findFirst({
    where: { slug: storeSlug, active: true },
    select: { id: true, slug: true },
  });
  if (!store) notFound();

  const customer = await getCurrentCustomer(store.id);

  // Sin sesión → formularios de login / registro.
  if (!customer) {
    return <AccountForms storeSlug={store.slug} />;
  }

  // Historial: pedidos hechos con el email de la cuenta en esta tienda.
  const orders = await prisma.order.findMany({
    where: {
      storeId: store.id,
      customerEmail: { equals: customer.email, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hola, {customer.name}</h1>
          <p className="text-sm text-gray-500">{customer.email}</p>
        </div>
        <form action={logoutAction}>
          <input type="hidden" name="storeSlug" value={store.slug} />
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </form>
      </div>

      <h2 className="mt-8 text-lg font-bold text-gray-900">Mis pedidos</h2>

      {orders.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <PackageSearch className="mx-auto h-9 w-9 text-gray-300" />
          <p className="mt-3 text-gray-500">Todavía no tienes pedidos.</p>
          <Link
            href={`/${store.slug}`}
            className="mt-4 inline-block rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:brightness-110"
          >
            Ir a comprar
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-gray-200 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">
                    Pedido #{o.id.slice(-8)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {dateFmt.format(o.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${PAYMENT_BADGE[o.status]}`}
                  >
                    {PAYMENT_LABEL[o.status]}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${FULFILLMENT_BADGE[o.fulfillment]}`}
                  >
                    {FULFILLMENT_LABEL[o.fulfillment]}
                  </span>
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
              <div className="mt-2 flex justify-between border-t border-gray-100 pt-2">
                <span className="font-medium text-gray-900">Total</span>
                <span className="font-bold text-gray-900">
                  {formatPrice(o.totalCents, o.currency)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
