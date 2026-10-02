import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Check,
  Clock,
  X,
  Search,
  QrCode,
  ExternalLink,
  MessageCircle,
  Camera,
  Paperclip,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice, variantLabel } from "@/lib/utils";
import { normalizeWhatsapp } from "@/lib/whatsapp";
import { getTransaction, resolveWompiKeys } from "@/lib/wompi";
import { markOrderPaid } from "@/lib/orders";
import { getCurrentCustomer } from "@/lib/customer-auth";
import {
  parseTransferAccounts,
  paymentMethodLabel,
  TRANSFER_KIND_LABEL,
} from "@/lib/payment-methods";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import ClearCart from "./clear-cart";
import CopyButton from "./copy-button";
import { PostOrderAccount } from "../post-order-account";

export const dynamic = "force-dynamic";

// Estado de pago que mostramos al cliente al volver del checkout.
// "awaiting" = pedido por transferencia aún sin pagar.
type Payment = "approved" | "pending" | "failed" | "registered" | "awaiting";

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
    include: {
      items: true,
      store: {
        select: {
          name: true,
          whatsapp: true,
          transferAccountsJson: true,
          wompiPublicKey: true,
          wompiPrivateKey: true,
          wompiIntegritySecret: true,
          wompiEventsSecret: true,
        },
      },
    },
  });
  if (!order) notFound();

  // Determina el estado del pago.
  let payment: Payment;
  if (txId) {
    // Cada consulta usa la llave privada de la tienda contra Wompi: límite por
    // IP para que no se pueda usar esta página para saturar ese servicio.
    const rl = await rateLimit(`wompi-lookup:${await clientIp()}`, 30, 10 * 60 * 1000);
    const tx = rl.ok
      ? await getTransaction(txId, resolveWompiKeys(order.store))
      : null;
    if (tx && tx.reference === order.id && tx.status === "APPROVED") {
      // markOrderPaid comprueba monto, moneda y método; solo decimos "pagado"
      // si el pedido quedó realmente PAGADO (por esta llamada o el webhook).
      await markOrderPaid(order.id, tx);
      const fresh = await prisma.order.findUnique({
        where: { id: order.id },
        select: { status: true },
      });
      payment = fresh?.status === "PAID" ? "approved" : "failed";
    } else if (tx && tx.reference === order.id && tx.status === "PENDING") {
      payment = "pending";
    } else if (tx && tx.reference === order.id) {
      payment = "failed"; // DECLINED / VOIDED / ERROR
    } else {
      // No pudimos verificar: si el webhook ya lo marcó pagado, respétalo.
      payment = order.status === "PAID" ? "approved" : "pending";
    }
  } else if (order.paymentMethod === "TRANSFER" && order.status === "PENDING") {
    // Transferencia: el pedido existe pero falta que el cliente pague.
    payment = "awaiting";
  } else {
    // Sin transacción (contraentrega / pago manual) o ya confirmado por webhook.
    payment = order.status === "PAID" ? "approved" : "registered";
  }

  // Cuentas/QR de la tienda para pagar por transferencia.
  const transferAccounts =
    payment === "awaiting"
      ? parseTransferAccounts(order.store.transferAccountsJson)
      : [];

  const ui = {
    approved: {
      icon: <Check className="h-8 w-8" strokeWidth={3} />,
      color: "bg-green-100 text-green-600",
      title: "¡Pago confirmado!",
      subtitle: "Hemos recibido tu pago. Prepararemos tu pedido enseguida.",
    },
    awaiting: {
      icon: <QrCode className="h-8 w-8" strokeWidth={2.5} />,
      color: "bg-amber-100 text-amber-600",
      title: "¡Pedido recibido! Falta el pago",
      subtitle:
        "paga con alguna de las opciones de abajo y envíanos el comprobante.",
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

  // Sin sesión → invitar a crear cuenta, o a iniciar sesión si ese correo ya
  // tiene una. Si ya hay sesión, no mostramos nada.
  const loggedIn = await getCurrentCustomer(order.storeId);
  const accountExists = !!(await prisma.customer.findUnique({
    where: {
      storeId_email: {
        storeId: order.storeId,
        email: order.customerEmail.toLowerCase(),
      },
    },
  }));
  const accountCta: "create" | "login" | null =
    payment === "failed" || loggedIn ? null : accountExists ? "login" : "create";

  // Envío del pedido por WhatsApp (el negocio atiende por ahí: el pedido es
  // oficial cuando les llega). Va a la sede elegida o, si no tiene número, al
  // WhatsApp de la tienda. En transferencia es también donde va el comprobante.
  let sedeWaHref: string | null = null;
  const awaiting = payment === "awaiting";
  if (payment !== "failed") {
    const sede = order.locationName
      ? await prisma.storeLocation.findFirst({
          where: { storeId: order.storeId, name: order.locationName },
          select: { whatsapp: true },
        })
      : null;
    const number = normalizeWhatsapp(sede?.whatsapp || order.store.whatsapp);
    const greeting = order.locationName ?? order.store.name;
    if (number.length >= 10) {
      const lines = order.items
        .map((i) => {
          const v = variantLabel(i.color, i.size);
          const mods = i.modifiers ? `\n   (${i.modifiers})` : "";
          return `• ${i.name}${v ? ` (${v})` : ""} x${i.quantity}${mods}`;
        })
        .join("\n");
      const msg =
        `Hola ${greeting}, este es mi pedido #${order.id.slice(-8)}:\n${lines}\n\n` +
        `Total: ${formatPrice(order.totalCents, order.currency)}\n` +
        (order.paymentMethod
          ? `Pago: ${paymentMethodLabel(order.paymentMethod)}\n`
          : "") +
        `Nombre: ${order.customerName}\n` +
        `Tel: ${order.customerPhone ?? ""}\n` +
        `Envío a: ${order.address}` +
        (awaiting ? `\n\nTe adjunto la captura del comprobante de pago.` : "");
      sedeWaHref = `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
    }
  }

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

      {awaiting && (
        <div className="mt-6 rounded-2xl border border-gray-200 p-5 text-left">
          <p className="text-sm font-semibold text-gray-900">
            1. Paga {formatPrice(order.totalCents, order.currency)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Desde la app de tu banco o billetera. Usa la opción que prefieras:
          </p>
          {transferAccounts.length === 0 ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              La tienda te enviará los datos de pago por WhatsApp.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {transferAccounts.map((a) => (
                <li
                  key={a.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                >
                  <p className="text-sm font-medium text-gray-900">
                    {TRANSFER_KIND_LABEL[a.kind]}
                    {a.holder && (
                      <span className="font-normal text-gray-500">
                        {" "}
                        · {a.holder}
                      </span>
                    )}
                  </p>
                  {a.qrUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.qrUrl}
                      alt={`QR de pago ${TRANSFER_KIND_LABEL[a.kind]}`}
                      className="mx-auto mt-2 w-full max-w-[220px] rounded-lg border border-gray-200 bg-white"
                    />
                  )}
                  {a.value && a.kind === "LINK" ? (
                    <a
                      href={a.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white hover:brightness-110"
                    >
                      <ExternalLink className="h-4 w-4" /> Abrir link de pago
                    </a>
                  ) : a.value ? (
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
                      <span className="break-all font-mono text-sm text-gray-900">
                        {a.value}
                      </span>
                      <CopyButton text={a.value} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {sedeWaHref && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
          <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-900">
            <MessageCircle className="h-4 w-4 text-green-600" />
            {awaiting ? "2. Envía el comprobante" : "Un último paso"}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Tu pedido es <strong>oficial</strong> cuando lo envías a{" "}
            <strong>{order.locationName ?? order.store.name}</strong> por
            WhatsApp.
          </p>
          {awaiting && (
            <ol className="mx-auto mt-3 max-w-xs space-y-2 text-left text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <Camera className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                <span>
                  Toma una <strong>captura</strong> del pago en la app de tu
                  banco.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                <span>Toca el botón verde: se abre el chat con tu pedido escrito.</span>
              </li>
              <li className="flex items-start gap-2">
                <Paperclip className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                <span>
                  <strong>Adjunta la captura</strong> y envía.
                </span>
              </li>
            </ol>
          )}
          <a
            href={sedeWaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-6 py-3 text-sm font-semibold text-white hover:brightness-105"
          >
            <MessageCircle className="h-4 w-4" />
            {awaiting
              ? "Enviar pedido y comprobante"
              : "Enviar mi pedido por WhatsApp"}
          </a>
          {awaiting && (
            <p className="mt-2 text-xs text-gray-500">
              Preparamos tu pedido en cuanto confirmemos el pago.
            </p>
          )}
        </div>
      )}

      {payment !== "failed" && (
        <Link
          href={`/${storeSlug}/rastrear?n=${order.id.slice(-8)}&email=${encodeURIComponent(order.customerEmail)}`}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <Search className="h-4 w-4" />
          Rastrear mi pedido
        </Link>
      )}

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
                {i.modifiers && (
                  <span className="block text-xs text-gray-400">
                    {i.modifiers}
                  </span>
                )}
              </span>
              <span className="text-gray-900">
                {formatPrice(i.priceCents * i.quantity, order.currency)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t border-gray-100 pt-4 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>
              {formatPrice(order.totalCents - order.shippingCents, order.currency)}
            </span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Envío</span>
            <span>
              {order.shippingCents > 0
                ? formatPrice(order.shippingCents, order.currency)
                : "Gratis"}
            </span>
          </div>
        </div>
        <div className="mt-2 flex justify-between border-t border-gray-100 pt-3">
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

      {accountCta === "create" && (
        <PostOrderAccount
          storeSlug={storeSlug}
          name={order.customerName}
          email={order.customerEmail}
        />
      )}

      {accountCta === "login" && (
        <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-left">
          <p className="font-semibold text-gray-900">
            Ya tienes una cuenta con este correo
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Inicia sesión para ver el estado de este y tus demás pedidos.
          </p>
          <Link
            href={`/${storeSlug}/cuenta`}
            className="mt-3 inline-block rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white hover:brightness-110"
          >
            Iniciar sesión
          </Link>
        </div>
      )}

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
