"use client";

import { useActionState, useState } from "react";
import { loginAction, registerAction, type AccountState } from "./actions";
import { useStoreHref } from "@/components/store-base";

const inputCls =
  "w-full rounded-lg border border-line-2 px-3 py-2 text-sm outline-none focus:border-ink focus:ring-1 focus:ring-ink";
const labelCls = "mb-1 block text-sm font-medium text-ink-2";
const btnCls =
  "w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-ink transition hover:brightness-110 disabled:opacity-60";

export function AccountForms({ storeSlug }: { storeSlug: string }) {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-ink">Mi cuenta</h1>
      <p className="mt-1 text-sm text-ink-3">
        {mode === "login"
          ? "Inicia sesión para ver tus pedidos."
          : "Crea una cuenta para seguir tus pedidos."}
      </p>

      {/* Pestañas */}
      <div className="mt-6 flex rounded-lg bg-surface-3 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-md py-2 ${mode === "login" ? "bg-surface shadow" : "text-ink-3"}`}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 rounded-md py-2 ${mode === "register" ? "bg-surface shadow" : "text-ink-3"}`}
        >
          Crear cuenta
        </button>
      </div>

      <div className="mt-5">
        {mode === "login" ? (
          <LoginForm storeSlug={storeSlug} />
        ) : (
          <RegisterForm storeSlug={storeSlug} />
        )}
      </div>
    </div>
  );
}

function LoginForm({ storeSlug }: { storeSlug: string }) {
  const sh = useStoreHref();
  const [state, formAction, pending] = useActionState<AccountState, FormData>(
    loginAction,
    undefined,
  );
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <div>
        <label className={labelCls}>Email</label>
        <input name="email" type="email" required autoComplete="email" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Contraseña</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputCls}
        />
      </div>
      {state?.error && <Err>{state.error}</Err>}
      <button type="submit" disabled={pending} className={btnCls}>
        {pending ? "Entrando…" : "Iniciar sesión"}
      </button>
      <p className="text-center text-sm">
        <a
          href={sh(`/cuenta/recuperar`)}
          className="text-ink-3 hover:text-ink"
        >
          ¿Olvidaste tu contraseña?
        </a>
      </p>
    </form>
  );
}

function RegisterForm({ storeSlug }: { storeSlug: string }) {
  const [state, formAction, pending] = useActionState<AccountState, FormData>(
    registerAction,
    undefined,
  );
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <div>
        <label className={labelCls}>Nombre</label>
        <input name="name" required className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Email</label>
        <input name="email" type="email" required autoComplete="email" className={inputCls} />
      </div>
      {state?.error && <Err>{state.error}</Err>}
      {state?.ok ? (
        <p className="rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok-ink">
          Listo. Te enviamos un correo con un enlace para crear tu contraseña y
          activar tu cuenta. Revisa también la carpeta de spam.
        </p>
      ) : (
        <>
          <p className="text-xs text-ink-3">
            Te enviaremos un enlace a tu correo para crear tu contraseña. Así
            confirmamos que el correo es tuyo.
          </p>
          <button type="submit" disabled={pending} className={btnCls}>
            {pending ? "Enviando…" : "Crear cuenta"}
          </button>
        </>
      )}
    </form>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad-ink">
      {children}
    </p>
  );
}
