"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, Truck } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { formatPrice, variantLabel } from "@/lib/utils";
import { computeShipping } from "@/lib/shipping";
import { placeOrderAction, type CheckoutState } from "./actions";

type Method = "online" | "cod";

export default function CheckoutForm({
  onlineEnabled,
  codEnabled,
  shipping,
}: {
  onlineEnabled: boolean;
  codEnabled: boolean;
  shipping: { shippingCents: number; freeShippingOverCents: number };
}) {
  const { items, totalCents, currency, storeSlug, clear, ready } = useCart();
  // totalCents = subtotal (productos). Sumamos el envío para el total final.
  const shippingCents = computeShipping(totalCents, shipping);
  const grandTotal = totalCents + shippingCents;
  const router = useRouter();
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(
    placeOrderAction,
    undefined,
  );

  const bothEnabled = onlineEnabled && codEnabled;
  const noMethod = !onlineEnabled && !codEnabled;
  // Método seleccionado (por defecto: en línea si está disponible).
  const [method, setMethod] = useState<Method>(
    onlineEnabled ? "online" : "cod",
  );

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
      router.replace(`/${storeSlug}/checkout/success?order=${state.orderId}`);
    }
  }, [state?.checkoutUrl, state?.orderId, clear, router, storeSlug]);

  if (state?.orderId || state?.checkoutUrl) {
    return (
      <p className="text-sm text-gray-500">
        {state?.checkoutUrl
          ? "Redirigiendo a la pasarela de pago…"
          : "Procesando tu pedido…"}
      </p>
    );
  }

  if (!ready) {
    return <p className="text-sm text-gray-400">Cargando…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-500">Tu carrito está vacío.</p>
        <Link
          href={`/${storeSlug}`}
          className="mt-4 inline-block rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:brightness-110"
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
    })),
  );

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/${storeSlug}/cart`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al carrito
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Finalizar compra</h1>

      <div className="grid gap-8 md:grid-cols-[1fr_360px]">
        {/* Formulario de datos */}
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <input type="hidden" name="items" value={itemsPayload} />

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

          <div className="border-t border-gray-100 pt-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
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
                placeholder="El Poblado"
                required
              />
              <Field
                label="Ciudad"
                name="city"
                placeholder="Medellín"
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
          <div className="border-t border-gray-100 pt-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              Método de pago
            </h2>
            <input type="hidden" name="paymentMethod" value={method} />

            {noMethod ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                El pago no está disponible en este momento. Vuelve a intentarlo
                más tarde.
              </p>
            ) : bothEnabled ? (
              <div className="space-y-2">
                <MethodOption
                  icon={<CreditCard className="h-5 w-5" />}
                  title="Pagar en línea"
                  desc="Tarjeta, PSE, Nequi… Pago seguro con Wompi."
                  checked={method === "online"}
                  onSelect={() => setMethod("online")}
                />
                <MethodOption
                  icon={<Truck className="h-5 w-5" />}
                  title="Pago contra entrega"
                  desc="Pagas en efectivo al recibir tu pedido."
                  checked={method === "cod"}
                  onSelect={() => setMethod("cod")}
                />
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                {onlineEnabled
                  ? "Pago en línea seguro con Wompi (tarjeta, PSE, Nequi…)."
                  : "Pago contra entrega: pagas en efectivo al recibir tu pedido."}
              </p>
            )}
          </div>

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || noMethod}
            className="w-full rounded-lg bg-[var(--brand)] px-6 py-3 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {pending
              ? method === "online"
                ? "Redirigiendo al pago…"
                : "Realizando pedido…"
              : method === "online"
                ? "Ir a pagar"
                : "Confirmar pedido"}
          </button>
          {!noMethod && (
            <p className="text-center text-xs text-gray-400">
              {method === "online"
                ? "Te llevamos a Wompi para completar el pago de forma segura."
                : "Pagarás en efectivo cuando recibas tu pedido."}
            </p>
          )}
        </form>

        {/* Resumen */}
        <div className="h-fit rounded-2xl border border-gray-200 p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            Resumen del pedido
          </h2>
          <ul className="space-y-3">
            {items.map((i) => (
              <li key={i.key} className="flex justify-between text-sm">
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
                  {formatPrice(i.priceCents * i.quantity, currency)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-gray-100 pt-4 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatPrice(totalCents, currency)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Envío</span>
              <span>
                {shippingCents > 0 ? (
                  formatPrice(shippingCents, currency)
                ) : (
                  <span className="font-medium text-green-600">Gratis</span>
                )}
              </span>
            </div>
          </div>
          <div className="mt-2 flex justify-between border-t border-gray-100 pt-3">
            <span className="font-medium text-gray-900">Total</span>
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(grandTotal, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

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
          ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <span className="mt-0.5 text-gray-700">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-medium text-gray-900">{title}</span>
        <span className="block text-xs text-gray-500">{desc}</span>
      </span>
      <span
        className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${
          checked ? "border-gray-900 bg-gray-900" : "border-gray-300"
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
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input {...props} className={inputCls} />
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900";
