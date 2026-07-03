"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";
import { formatPrice, variantLabel } from "@/lib/utils";
import { placeOrderAction, type CheckoutState } from "./actions";

export default function CheckoutPage() {
  const { items, totalCents, currency, storeSlug, clear, ready } = useCart();
  const router = useRouter();
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(
    placeOrderAction,
    undefined,
  );

  // Al confirmarse el pedido: vacía el carrito y va a la confirmación
  useEffect(() => {
    if (state?.orderId) {
      clear();
      router.replace(`/${storeSlug}/checkout/success?order=${state.orderId}`);
    }
  }, [state?.orderId, clear, router, storeSlug]);

  if (state?.orderId) {
    return <p className="text-sm text-gray-500">Procesando tu pedido…</p>;
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
          className="mt-4 inline-block rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
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
        className="mb-6 inline-block text-sm text-gray-500 hover:text-gray-900"
      >
        ← Volver al carrito
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
            label="Teléfono (opcional)"
            name="customerPhone"
            type="tel"
          />

          <div className="border-t border-gray-100 pt-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              Dirección de envío
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Field
                  label="Calle / Carrera"
                  name="street"
                  placeholder="Cra 23D"
                  required
                />
              </div>
              <Field
                label="Número"
                name="streetNumber"
                placeholder="45-12"
                required
              />
              <Field
                label="Ciudad"
                name="city"
                placeholder="Bogotá"
                required
              />
              <Field
                label="Código postal"
                name="postalCode"
                placeholder="110111"
                required
              />
              <Field
                label="País"
                name="country"
                placeholder="Colombia"
                required
              />
            </div>
          </div>

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
          >
            {pending ? "Realizando pedido…" : "Confirmar pedido"}
          </button>
          <p className="text-center text-xs text-gray-400">
            El pago con tarjeta llega en la siguiente fase. Por ahora el pedido
            queda registrado.
          </p>
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
          <div className="mt-4 flex justify-between border-t border-gray-100 pt-4">
            <span className="font-medium text-gray-900">Total</span>
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(totalCents, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
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
