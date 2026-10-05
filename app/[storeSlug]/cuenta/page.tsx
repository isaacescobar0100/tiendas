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
import { OrderProgress } from "@/components/order-progress";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { AccountForms } from "./account-forms";
import { VerifyEmailNotice } from "./verify-email-notice";
import { logoutAction } from "./actions";
import { storeBasePath, joinStorePath } from "@/lib/store-path";
import { TZ } from "@/lib/dates";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("es", { timeZone: TZ, dateStyle: "medium" });

export default async function AccountPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  // Rutas de la tienda: sin el slug si se visita por su subdominio/dominio.
  const storeBase = await storeBasePath(storeSlug);
  const sh = (p = "") => joinStorePath(storeBase, p);
  const store = await prisma.store.findFirst({
    where: { slug: storeSlug, active: true },
    select: { id: true, slug: true, name: true },
  });
  if (!store) notFound();

  const customer = await getCurrentCustomer(store.id);

  // Sin sesión → formularios de login / registro.
  if (!customer) {
    return <AccountForms storeSlug={store.slug} storeName={store.name} />;
  }

  // Historial: pedidos hechos con el email de la cuenta en esta tienda. Solo si
  // el cliente probó que el correo es suyo (si no, cualquiera que se registre
  // con un correo ajeno vería los pedidos de otra persona).
  const verified = !!customer.emailVerifiedAt;
  const orders = verified
    ? await prisma.order.findMany({
        where: {
          storeId: store.id,
          // Exacto (ambos en minúsculas): "insensitive" usaría ILIKE con comodines.
          customerEmail: customer.email.toLowerCase(),
        },
        orderBy: { createdAt: "desc" },
        include: { items: true },
      })
    : [];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Hola, {customer.name}</h1>
          <p className="text-sm text-ink-3">{customer.email}</p>
        </div>
        <form action={logoutAction}>
          <input type="hidden" name="storeSlug" value={store.slug} />
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-line-2 px-3 py-2 text-sm text-ink-2 hover:bg-surface-2">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </form>
      </div>

      <h2 className="mt-8 text-lg font-bold text-ink">Mis pedidos</h2>

      {!verified ? (
        <VerifyEmailNotice storeSlug={store.slug} email={customer.email} />
      ) : orders.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-line-2 p-10 text-center">
          <PackageSearch className="mx-auto h-9 w-9 text-ink-4" />
          <p className="mt-3 text-ink-3">Todavía no tienes pedidos.</p>
          <Link
            href={sh()}
            className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink hover:brightness-110"
          >
            Ir a comprar
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-line p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">
                    Pedido #{o.id.slice(-8)}
                  </p>
                  <p className="text-xs text-ink-3">
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

              <OrderProgress fulfillment={o.fulfillment} status={o.status} />

              <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
                {o.items.map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <span className="text-ink-2">
                      {i.name}
                      {variantLabel(i.color, i.size) && (
                        <span className="text-ink-3">
                          {" "}
                          ({variantLabel(i.color, i.size)})
                        </span>
                      )}{" "}
                      <span className="text-ink-3">×{i.quantity}</span>
                    </span>
                    <span className="text-ink">
                      {formatPrice(i.priceCents * i.quantity, o.currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-between border-t border-line pt-2">
                <span className="font-medium text-ink">Total</span>
                <span className="font-bold text-ink">
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
