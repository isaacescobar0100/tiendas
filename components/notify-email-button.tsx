"use client";

import { useActionState } from "react";
import { Mail, Check } from "lucide-react";
import { notifyByEmailAction, type NotifyState } from "@/app/admin/orders/actions";

// Botón que envía al cliente el correo de estado (confirmado / va en camino).
export function NotifyEmailButton({
  orderId,
  kind,
}: {
  orderId: string;
  kind: "confirmed" | "shipped";
}) {
  const [state, action, pending] = useActionState<NotifyState, FormData>(
    notifyByEmailAction,
    undefined,
  );

  return (
    <form action={action} className="flex-1">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="kind" value={kind} />
      <button
        type="submit"
        disabled={pending || state?.ok}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line-2 px-3 py-2 text-sm font-medium text-ink-2 transition hover:bg-surface-2 disabled:opacity-60"
      >
        {state?.ok ? (
          <>
            <Check className="h-4 w-4 text-ok-ink" /> Enviado
          </>
        ) : pending ? (
          "Enviando…"
        ) : (
          <>
            <Mail className="h-4 w-4" /> Email
          </>
        )}
      </button>
      {state?.error && (
        <p className="mt-1 text-xs text-bad-ink">{state.error}</p>
      )}
    </form>
  );
}
