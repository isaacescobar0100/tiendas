"use client";

import { useActionState, useState } from "react";
import { Heart, Lock, Mail, PackageSearch, User, Zap } from "lucide-react";
import { loginAction, registerAction, type AccountState } from "./actions";
import { useStoreHref } from "@/components/store-base";
import { Field, Notice, PasswordField, SubmitButton } from "@/components/auth/fields";

// Acceso del cliente de la tienda: a la izquierda para qué sirve la cuenta, a
// la derecha iniciar sesión o crearla. Todo con el tema de la tienda.
export function AccountForms({ storeSlug, storeName }: { storeSlug: string; storeName: string }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const perks = [
    { icon: PackageSearch, title: "Sigue tus pedidos", text: "Mira el estado de cada pedido en un solo lugar." },
    { icon: Heart, title: "Guarda tus favoritos", text: "Tenlos a mano en cualquier dispositivo." },
    { icon: Zap, title: "Compra más rápido", text: "Tus datos listos para el próximo pedido." },
  ];

  return (
    <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-line md:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-brand p-10 text-brand-ink md:block">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-ink/10 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.25em]">Mi cuenta</p>
        <h2 className="relative mt-3 text-3xl font-extrabold leading-tight tracking-tight">
          Tu cuenta en {storeName}
        </h2>
        <ul className="relative mt-8 space-y-5">
          {perks.map((p) => (
            <li key={p.title} className="flex gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-ink/15 ring-1 ring-brand-ink/20">
                <p.icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-semibold">{p.title}</span>
                <span className="block text-sm leading-relaxed">{p.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>

      <div className="p-6 sm:p-10">
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink">
          {mode === "login" ? "Hola de nuevo" : "Crea tu cuenta"}
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-3">
          {mode === "login"
            ? "Inicia sesión para ver tus pedidos."
            : "Te enviamos un enlace al correo para crear tu contraseña."}
        </p>

        {/* Pestañas */}
        <div role="tablist" className="mt-6 grid grid-cols-2 rounded-xl bg-surface-3 p-1 text-sm font-semibold">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-lg py-2.5 transition ${mode === m ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"}`}
            >
              {m === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {mode === "login" ? <LoginForm storeSlug={storeSlug} /> : <RegisterForm storeSlug={storeSlug} />}
        </div>
      </div>
    </div>
  );
}

function LoginForm({ storeSlug }: { storeSlug: string }) {
  const sh = useStoreHref();
  const [state, formAction, pending] = useActionState<AccountState, FormData>(loginAction, undefined);
  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <Field id="email" name="email" type="email" label="Correo" icon={Mail} required autoComplete="email" inputMode="email" placeholder="tu@correo.com" />
      <PasswordField
        id="password"
        name="password"
        label="Contraseña"
        icon={Lock}
        required
        autoComplete="current-password"
        placeholder="Tu contraseña"
        aside={
          <a href={sh(`/cuenta/recuperar`)} className="text-sm font-medium text-brand-text hover:underline">
            ¿La olvidaste?
          </a>
        }
      />
      {state?.error && <Notice kind="error">{state.error}</Notice>}
      <SubmitButton pending={pending} pendingText="Entrando…">
        Iniciar sesión
      </SubmitButton>
    </form>
  );
}

function RegisterForm({ storeSlug }: { storeSlug: string }) {
  const [state, formAction, pending] = useActionState<AccountState, FormData>(registerAction, undefined);
  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <Field id="name" name="name" label="Nombre" icon={User} required autoComplete="name" placeholder="Tu nombre" />
      <Field id="reg-email" name="email" type="email" label="Correo" icon={Mail} required autoComplete="email" inputMode="email" placeholder="tu@correo.com" />
      {state?.error && <Notice kind="error">{state.error}</Notice>}
      {state?.ok ? (
        <Notice kind="success">
          Listo. Te enviamos un correo con un enlace para crear tu contraseña y activar tu cuenta.
          Revisa también la carpeta de spam.
        </Notice>
      ) : (
        <SubmitButton pending={pending} pendingText="Enviando…">
          Crear cuenta
        </SubmitButton>
      )}
    </form>
  );
}
