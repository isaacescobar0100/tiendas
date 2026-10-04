"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BellRing, Volume2, X } from "lucide-react";

type Pulse = { v: string; newest: string | null };

/**
 * Tiempo real sin recargar: consulta el pulso (/api/live) cada pocos segundos
 * y, si algo cambió, actualiza la pantalla (router.refresh conserva lo que se
 * está escribiendo). Con `alertNew`, un pedido nuevo además suena, muestra una
 * notificación del navegador, hace parpadear la pestaña y un aviso en pantalla.
 *
 * Los navegadores no dejan sonar nada hasta que la persona toca la página:
 * por eso el sonido se "despierta" con el primer toque (o con el botón).
 */
export function LiveRefresh({
  src,
  interval = 4000,
  alertNew = false,
  ordersHref,
  refreshPattern,
  floating = true,
}: {
  src: string;
  interval?: number;
  alertNew?: boolean;
  ordersHref?: string;
  // Solo se actualiza la pantalla en las rutas que cumplan este patrón
  // (en el resto solo suena el aviso). Sin patrón: siempre.
  refreshPattern?: string;
  // false = la etiqueta "En vivo" va en su lugar (páginas del cliente), no flotando.
  floating?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const last = useRef<Pulse | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [toast, setToast] = useState(0); // cuántos pedidos nuevos sin ver
  const shouldRefresh = useRef(true);

  useEffect(() => {
    shouldRefresh.current = !refreshPattern || new RegExp(refreshPattern).test(pathname);
  }, [pathname, refreshPattern]);

  // El sonido se despierta con el primer toque en cualquier parte de la página.
  useEffect(() => {
    if (!alertNew) return;
    const unlock = () => {
      void enableSound(false);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [alertNew]);

  async function enableSound(askNotifications: boolean) {
    try {
      audio.current ??= new AudioContext();
      await audio.current.resume();
      setSoundOn(audio.current.state === "running");
    } catch {}
    if (askNotifications && "Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {}
    }
  }

  // "Ding-ding" corto con el sintetizador del navegador (sin archivos).
  function ding() {
    const ctx = audio.current;
    if (!ctx || ctx.state !== "running") return;
    const now = ctx.currentTime;
    [0, 0.22, 0.6, 0.82].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = i % 2 === 0 ? 880 : 1320;
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.exponentialRampToValueAtTime(0.35, now + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(now + t);
      o.stop(now + t + 0.22);
    });
  }

  // Pulso
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const r = await fetch(src, { cache: "no-store" });
        if (r.ok) {
          const p = (await r.json()) as Pulse;
          const prev = last.current;
          last.current = p;
          if (prev && p.v !== prev.v) {
            if (shouldRefresh.current) router.refresh();
            if (alertNew && p.newest && (!prev.newest || p.newest > prev.newest)) {
              setToast((n) => n + 1);
              ding();
              if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
                try {
                  new Notification("Nuevo pedido", { body: "Entró un pedido nuevo. Ábrelo para confirmarlo.", tag: "nuevo-pedido" });
                } catch {}
              }
            }
          }
        }
      } catch {}
      if (!stop) timer = setTimeout(tick, interval);
    };
    void tick();
    // Al volver a la pestaña, revisar enseguida.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, interval, alertNew]);

  // Pestaña que parpadea mientras haya pedidos nuevos sin ver.
  useEffect(() => {
    if (!toast) return;
    const base = document.title.replace(/^\(\d+\) 🔔 /, "");
    let on = false;
    const t = setInterval(() => {
      on = !on;
      document.title = on ? `(${toast}) 🔔 Nuevo pedido` : base;
    }, 1000);
    return () => {
      clearInterval(t);
      document.title = base;
    };
  }, [toast]);

  return (
    <>
      <span
        className={`pointer-events-none inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-ink-3 ring-1 ring-line print:hidden ${
          floating ? "fixed bottom-3 left-3 z-40 shadow backdrop-blur" : ""
        }`}
        aria-hidden
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
        </span>
        En vivo
      </span>

      {alertNew && !soundOn && (
        <button
          type="button"
          onClick={() => void enableSound(true)}
          className="fixed bottom-3 right-3 z-40 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-brand-ink shadow-lg ring-1 ring-black/10 print:hidden"
        >
          <Volume2 className="h-4 w-4" />
          Activar sonido de pedidos
        </button>
      )}

      {toast > 0 && (
        <div
          role="alert"
          className="fixed inset-x-3 top-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-brand px-4 py-3 text-brand-ink shadow-2xl ring-1 ring-black/10 print:hidden"
        >
          <BellRing className="h-6 w-6 shrink-0 animate-bounce" />
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">{toast === 1 ? "¡Nuevo pedido!" : `¡${toast} pedidos nuevos!`}</p>
            <p className="text-sm opacity-90">Ya está en la lista. Confírmalo al cliente.</p>
          </div>
          {ordersHref && (
            <Link
              href={ordersHref}
              onClick={() => setToast(0)}
              className="shrink-0 rounded-full bg-brand-ink px-3 py-1.5 text-sm font-bold text-brand"
            >
              Ver
            </Link>
          )}
          <button type="button" onClick={() => setToast(0)} aria-label="Cerrar aviso" className="shrink-0 rounded-full p-1 hover:bg-black/10">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}
