"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, Truck, Clock, QrCode } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { formatPrice, variantLabel } from "@/lib/utils";
import { computeShipping } from "@/lib/shipping";
import { placeOrderAction, type CheckoutState } from "./actions";
import { useStoreHref } from "@/components/store-base";
import { keepFormSubmit } from "@/components/keep-form";

type Method = "online" | "cod" | "transfer";

export default function CheckoutForm({
  onlineEnabled,
  codEnabled,
  transferEnabled = false,
  locations = [],
  closed = false,
  closedMessage = null,
  shipping,
}: {
  onlineEnabled: boolean;
  codEnabled: boolean;
  transferEnabled?: boolean;
  locations?: { name: string; address: string | null }[];
  closed?: boolean;
  closedMessage?: string | null;
  shipping: { shippingCents: number; freeShippingOverCents: number };
}) {
  const sh = useStoreHref();
  const { items, totalCents, currency, storeSlug, clear, ready } = useCart();
  // totalCents = subtotal (productos). Sumamos el envío para el total final.
  const shippingCents = computeShipping(totalCents, shipping);
  const grandTotal = totalCents + shippingCents;
  const router = useRouter();
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(
    placeOrderAction,
    undefined,
  );

  // Métodos disponibles, en el orden en que se muestran. Primero la
  // transferencia (sin comisión para la tienda).
  const methods = (
    [
      transferEnabled && "transfer",
      onlineEnabled && "online",
      codEnabled && "cod",
    ] as const
  ).filter((m): m is Method => !!m);
  const noMethod = methods.length === 0;

  // Fuera de horario solo se puede pedir el merch: si el carrito tiene algún
  // producto que NO es merch, no se puede completar el pedido ahora.
  const blockedItems = closed ? items.filter((i) => !i.alwaysAvailable) : [];
  const hoursBlocked = blockedItems.length > 0;
  // Método seleccionado (por defecto: el primero disponible).
  const [method, setMethod] = useState<Method>(methods[0] ?? "cod");

  // Resultado del pedido:
  // - checkoutUrl → hay pasarela: redirige a pagar (el carrito se vacía al volver ya pagado)
  // - solo orderId → sin pasarela: pedido registrado, vacía carrito y ve a confirmación
  useEffect(() => {
    if (state?.checkoutUrl) {
      window.location.href = state.checkoutUrl;
      return;
    }
    if (state?.orderId) {
      clear();
      router.replace(sh(`/checkout/success?order=${state.orderId}`));
    }
  }, [state?.checkoutUrl, state?.orderId, clear, router, sh]);

  if (state?.orderId || state?.checkoutUrl) {
    return (
      <p className="text-sm text-ink-3">
        {state?.checkoutUrl
          ? "Redirigiendo a la pasarela de pago…"
          : "Procesando tu pedido…"}
      </p>
    );
  }

  if (!ready) {
    return <p className="text-sm text-ink-3">Cargando…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-line-2 p-12 text-center">
        <p className="text-ink-3">Tu carrito está vacío.</p>
        <Link
          href={sh()}
          className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink hover:brightness-110"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  const itemsPayload = JSON.stringify(
    items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId ?? null,
      quantity: i.quantity,
      modifierOptionIds: (i.modifiers ?? []).map((m) => m.optionId),
    })),
  );

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={sh(`/cart`)}
        className="mb-6 inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al carrito
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-ink">Finalizar compra</h1>

      <div className="grid gap-8 md:grid-cols-[1fr_360px]">
        {/* Formulario de datos */}
        <form onSubmit={keepFormSubmit(formAction)} className="space-y-5">
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <input type="hidden" name="items" value={itemsPayload} />

          {locations.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-2">
                ¿En qué sede quieres tu pedido?
              </label>
              <select
                name="locationName"
                required
                defaultValue=""
                className={inputCls}
              >
                <option value="" disabled>
                  Elige una sede…
                </option>
                {locations.map((l) => (
                  <option key={l.name} value={l.name}>
                    {l.name}
                    {l.address ? ` — ${l.address}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Field label="Nombre completo" name="customerName" required />
          <Field
            label="Email"
            name="customerEmail"
            type="email"
            required
          />
          <Field
            label="WhatsApp / Teléfono"
            name="customerPhone"
            type="tel"
            placeholder="300 123 4567"
            required
          />

          <div className="border-t border-line pt-5">
            <h2 className="mb-3 text-sm font-semibold text-ink">
              Dirección de envío
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  label="Dirección completa"
                  name="street"
                  placeholder="Cra 23D # 45-12, Apto 301"
                  required
                />
              </div>
              <Field
                label="Barrio"
                name="neighborhood"
                placeholder="Tu barrio"
                required
              />
              <Field
                label="Ciudad"
                name="city"
                placeholder="Tu ciudad"
                required
              />
              <div className="sm:col-span-2">
                <Field
                  label="Referencia / cómo llegar (opcional)"
                  name="reference"
                  placeholder="Casa blanca de dos pisos, portón negro, al lado de la tienda"
                />
              </div>
              <Field
                label="Código postal (opcional)"
                name="postalCode"
                placeholder="050021"
              />
              <Field
                label="País"
                name="country"
                placeholder="Colombia"
                defaultValue="Colombia"
                required
              />
            </div>
          </div>

          {/* Método de pago */}
          <div className="border-t border-line pt-5">
            <h2 className="mb-3 text-sm font-semibold text-ink">
              Método de pago
            </h2>
            <input type="hidden" name="paymentMethod" value={method} />

            {noMethod ? (
              <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn-ink">
                El pago no está disponible en este momento. Vuelve a intentarlo
                más tarde.
              </p>
            ) : methods.length > 1 ? (
              <div className="space-y-2">
                {methods.map((m) => (
                  <MethodOption
                    key={m}
                    icon={METHOD_INFO[m].icon}
                    title={METHOD_INFO[m].title}
                    desc={METHOD_INFO[m].desc}
                    checked={method === m}
                    onSelect={() => setMethod(m)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-3">
                {METHOD_INFO[method].title}: {METHOD_INFO[method].desc}
              </p>
            )}
          </div>

          {hoursBlocked && (
            <div className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn-ink">
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Estamos cerrados en este momento
                  {closedMessage ? `. ${closedMessage}` : ""}. Solo el merch se
                  puede pedir ahora. Quita del carrito para continuar:
                </span>
              </div>
              <ul className="mt-1.5 list-disc pl-9">
                {blockedItems.map((i) => (
                  <li key={i.key}>{i.name}</li>
                ))}
              </ul>
            </div>
          )}

          {state?.error && (
            <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad-ink">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || noMethod || hoursBlocked}
            className="w-full rounded-lg bg-brand px-6 py-3 text-sm font-medium text-brand-ink transition hover:brightness-110 disabled:opacity-60"
          >
            {hoursBlocked
              ? "Cerrado ahora"
              : pending
                ? method === "online"
                  ? "Redirigiendo al pago…"
                  : "Realizando pedido…"
                : method === "online"
                  ? "Ir a pagar"
                  : "Confirmar pedido"}
          </button>
          {!noMethod && (
            <p className="text-center text-xs text-ink-3">
              {METHOD_INFO[method].hint}
            </p>
          )}
        </form>

        {/* Resumen */}
        <div className="h-fit rounded-2xl border border-line p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">
            Resumen del pedido
          </h2>
          <ul className="space-y-3">
            {items.map((i) => (
              <li key={i.key} className="flex justify-between text-sm">
                <span className="text-ink-2">
                  {i.name}
                  {variantLabel(i.color, i.size) && (
                    <span className="text-ink-3">
                      {" "}
                      ({variantLabel(i.color, i.size)})
                    </span>
                  )}{" "}
                  <span className="text-ink-3">×{i.quantity}</span>
                  {i.modifiers && i.modifiers.length > 0 && (
                    <span className="block text-xs text-ink-3">
                      {i.modifiers.map((m) => m.optionName).join(" · ")}
                    </span>
                  )}
                </span>
                <span className="text-ink">
                  {formatPrice(i.priceCents * i.quantity, currency)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-ink-2">
              <span>Subtotal</span>
              <span>{formatPrice(totalCents, currency)}</span>
            </div>
            <div className="flex justify-between text-ink-2">
              <span>Envío</span>
              <span>
                {shippingCents > 0 ? (
                  formatPrice(shippingCents, currency)
                ) : (
                  <span className="font-medium text-ok-ink">Gratis</span>
                )}
              </span>
            </div>
          </div>
          <div className="mt-2 flex justify-between border-t border-line pt-3">
            <span className="font-medium text-ink">Total</span>
            <span className="text-lg font-bold text-ink">
              {formatPrice(grandTotal, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const METHOD_INFO: Record<
  Method,
  { icon: React.ReactNode; title: string; desc: string; hint: string }
> = {
  transfer: {
    icon: <QrCode className="h-5 w-5" />,
    title: "Transferencia / QR",
    desc: "Bre-B, Nequi, Daviplata o cuenta bancaria. Te mostramos cómo pagar al confirmar.",
    hint: "Al confirmar verás el QR y los datos para transferir.",
  },
  online: {
    icon: <CreditCard className="h-5 w-5" />,
    title: "Pagar en línea",
    desc: "Tarjeta, PSE, Nequi… Pago seguro con Wompi.",
    hint: "Te llevamos a Wompi para completar el pago de forma segura.",
  },
  cod: {
    icon: <Truck className="h-5 w-5" />,
    title: "Pago contra entrega",
    desc: "Pagas en efectivo al recibir tu pedido.",
    hint: "Pagarás en efectivo cuando recibas tu pedido.",
  },
};

// Tarjeta seleccionable de método de pago.
function MethodOption({
  icon,
  title,
  desc,
  checked,
  onSelect,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
        checked
          ? "border-ink bg-surface-2 ring-1 ring-ink"
          : "border-line hover:border-line-2"
      }`}
    >
      <span className="mt-0.5 text-ink-2">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="block text-xs text-ink-3">{desc}</span>
      </span>
      <span
        className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${
          checked ? "border-ink bg-ink" : "border-line-2"
        }`}
      />
    </button>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink-2">
        {label}
      </label>
      <input {...props} className={inputCls} />
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-line-2 px-3 py-2 text-sm outline-none focus:border-ink focus:ring-1 focus:ring-ink";
