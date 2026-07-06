import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Clock, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice, variantLabel } from "@/lib/utils";
import { getTransaction } from "@/lib/wompi";
import { markOrderPaid } from "@/lib/orders";
import ClearCart from "./clear-cart";

export const dynamic = "force-dynamic";

// Estado de pago que mostramos al cliente al volver del checkout.
type Payment = "approved" | "pending" | "failed" | "registered";

export default async function OrderSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  // Wompi añade `id` (id de la transacción) y `env` al volver.
  searchParams: Promise<{ order?: string; id?: string }>;
}) {
  const { storeSlug } = await params;
  const { order: orderId, id: txId } = await searchParams;

  if (!orderId) notFound();

  const order = await prisma.order.findFirst({
    where: { id: orderId, store: { slug: storeSlug } },
    include: { items: true },
  });
  if (!order) notFound();

  // Determina el estado del pago.
  let payment: Payment;
  if (txId) {
    const tx = await getTransaction(txId);
    if (tx && tx.reference === order.id && tx.status === "APPROVED") {
      await markOrderPaid(order.id);
      payment = "approved";
    } else if (tx && tx.reference === order.id && tx.status === "PENDING") {
      payment = "pending";
    } else if (tx && tx.reference === order.id) {
      payment = "failed"; // DECLINED / VOIDED / ERROR
    } else {
      // No pudimos verificar: si el webhook ya lo marcó pagado, respétalo.
      payment = order.status === "PAID" ? "approved" : "pending";
    }
  } else {
    // Sin transacción (contraentrega / pago manual) o ya confirmado por webhook.
    payment = order.status === "PAID" ? "approved" : "registered";
  }

  const ui = {
    approved: {
      icon: <Check className="h-8 w-8" strokeWidth={3} />,
      color: "bg-green-100 text-green-600",
      title: "¡Pago confirmado!",
      subtitle: "Hemos recibido tu pago. Prepararemos tu pedido enseguida.",
    },
    registered: {
      icon: <Check className="h-8 w-8" strokeWidth={3} />,
      color: "bg-green-100 text-green-600",
      title: "¡Pedido confirmado!",
      subtitle: "Hemos recibido tu pedido.",
    },
    pending: {
      icon: <Clock className="h-8 w-8" strokeWidth={3} />,
      color: "bg-amber-100 text-amber-600",
      title: "Pago en proceso",
      subtitle:
        "Tu pago se está procesando. Te avisaremos por email cuando se confirme.",
    },
    failed: {
      icon: <X className="h-8 w-8" strokeWidth={3} />,
      color: "bg-red-100 text-red-600",
      title: "El pago no se completó",
      subtitle: "No pudimos confirmar el pago. Puedes intentarlo de nuevo.",
    },
  }[payment];

  // Vacía el carrito salvo que el pago haya fallado (para poder reintentar).
  const shouldClearCart = payment !== "failed";

  return (
    <div className="mx-auto max-w-lg text-center">
      {shouldClearCart && <ClearCart />}

      <div
        className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${ui.color}`}
      >
        {ui.icon}
      </div>
      <h1 className="text-2xl font-bold text-gray-900">{ui.title}</h1>
      <p className="mt-2 text-gray-500">
        {order.customerName.split(" ")[0]}, {ui.subtitle}
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
        {payment !== "failed" && (
          <p className="mt-4 text-xs text-gray-400">
            Enviaremos una confirmación a {order.customerEmail}.
          </p>
        )}
      </div>

      {payment === "failed" ? (
        <Link
          href={`/${storeSlug}/checkout`}
          className="mt-8 inline-block rounded-lg bg-[var(--brand)] px-6 py-3 text-sm font-medium text-white hover:brightness-110"
        >
          Intentar el pago de nuevo
        </Link>
      ) : (
        <Link
          href={`/${storeSlug}`}
          className="mt-8 inline-block rounded-lg bg-[var(--brand)] px-6 py-3 text-sm font-medium text-white hover:brightness-110"
        >
          Seguir comprando
        </Link>
      )}
    </div>
  );
}
