"use client";

import { useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { markNoticeSentAction } from "@/app/admin/orders/actions";
import { sedeMarkNoticeSentAction } from "@/app/sede/actions";

// Abre WhatsApp con el aviso ya escrito y, a la vez, avanza el pedido a
// "confirmado" / "en camino" (solo hacia adelante; lo valida el servidor).
export function WhatsappNoticeButton({
  href,
  orderId,
  kind,
  panel = "admin",
  label = "WhatsApp",
  className = "flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700",
}: {
  href: string;
  orderId: string;
  kind: "confirmed" | "shipped";
  panel?: "admin" | "sede";
  label?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={pending}
      onClick={() =>
        start(() =>
          panel === "sede"
            ? sedeMarkNoticeSentAction(orderId, kind)
            : markNoticeSentAction(orderId, kind),
        )
      }
      className={className}
    >
      <MessageCircle className="h-4 w-4" /> {label}
    </a>
  );
}
