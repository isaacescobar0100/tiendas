import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice, variantLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrderSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { storeSlug } = await params;
  const { order: orderId } = await searchParams;

  if (!orderId) notFound();

  const order = await prisma.order.findFirst({
    where: { id: orderId, store: { slug: storeSlug } },
    include: { items: true },
  });
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
        ✓
      </div>
      <h1 className="text-2xl font-bold text-gray-900">¡Pedido confirmado!</h1>
      <p className="mt-2 text-gray-500">
        Gracias, {order.customerName.split(" ")[0]}. Hemos recibido tu pedido.
      </p>
      <p className="mt-1 text-sm text-gray-400">
        Nº de pedido: <span className="font-mono">{order.id.slice(-8)}</span>
      </p>

      <div className="mt-8 rounded-2xl border border-gray-200 p-5 text-left">
        <ul className="space-y-3">
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
        <div className="mt-4 flex justify-between border-t border-gray-100 pt-4">
          <span className="font-medium text-gray-900">Total</span>
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(order.totalCents, order.currency)}
          </span>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Enviaremos una confirmación a {order.customerEmail}.
        </p>
      </div>

      <Link
        href={`/${storeSlug}`}
        className="mt-8 inline-block rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
      >
        Seguir comprando
      </Link>
    </div>
  );
}
