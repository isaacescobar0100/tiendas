import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice, variantLabel } from "@/lib/utils";
import {
  PAYMENT_LABEL,
  PAYMENT_BADGE,
  FULFILLMENT_LABEL,
  FULFILLMENT_BADGE,
} from "@/lib/order-status";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("es", {
  dateStyle: "long",
  timeStyle: "short",
});

export default async function TrackOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ n?: string; email?: string }>;
}) {
  const { storeSlug } = await params;
  const { n, email } = await searchParams;

  const store = await prisma.store.findFirst({
    where: { slug: storeSlug, active: true },
    select: { name: true },
  });
  if (!store) notFound();

  // Busca el pedido por nº (últimos caracteres del id) + email (privacidad).
  const searched = Boolean(n && email);
  const order =
    n && email
      ? await prisma.order.findFirst({
          where: {
            store: { slug: storeSlug },
            customerEmail: { equals: email.trim(), mode: "insensitive" },
            id: { endsWith: n.trim().toLowerCase() },
          },
          include: { items: true },
        })
      : null;

  const inputCls =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900";

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900">Rastrear pedido</h1>
      <p className="mt-1 text-sm text-gray-500">
        Escribe tu número de pedido y tu email para ver el estado.
      </p>

      <form method="get" className="mt-6 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Número de pedido
          </label>
          <input
            name="n"
            defaultValue={n ?? ""}
            required
            placeholder="Ej. a1b2c3d4"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            name="email"
            type="email"
            defaultValue={email ?? ""}
            required
            placeholder="El correo con el que compraste"
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
        >
          <Search className="h-4 w-4" /> Buscar mi pedido
        </button>
      </form>

      {searched && !order && (
        <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          No encontramos ningún pedido con ese número y ese email. Revisa que
          estén correctos.
        </p>
      )}

      {order && (
        <div className="mt-6 rounded-2xl border border-gray-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900">
                Pedido #{order.id.slice(-8)}
              </p>
              <p className="text-xs text-gray-400">
                {dateFmt.format(order.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${PAYMENT_BADGE[order.status]}`}
              >
                {PAYMENT_LABEL[order.status]}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${FULFILLMENT_BADGE[order.fulfillment]}`}
              >
                {FULFILLMENT_LABEL[order.fulfillment]}
              </span>
            </div>
          </div>

          <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between text-sm">
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
                  {formatPrice(i.priceCents * i.quantity, order.currency)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-gray-100 pt-3">
            <span className="font-medium text-gray-900">Total</span>
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(order.totalCents, order.currency)}
            </span>
          </div>
          <p className="mt-4 text-center text-xs text-gray-400">
            El estado se actualiza cuando la tienda lo cambia. Vuelve a buscar
            para ver lo más reciente.
          </p>
        </div>
      )}
    </div>
  );
}
