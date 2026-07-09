"use client";

import { useActionState, useState } from "react";
import { loginAction, registerAction, type AccountState } from "./actions";

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900";
const labelCls = "mb-1 block text-sm font-medium text-gray-700";
const btnCls =
  "w-full rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60";

export function AccountForms({ storeSlug }: { storeSlug: string }) {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-gray-900">Mi cuenta</h1>
      <p className="mt-1 text-sm text-gray-500">
        {mode === "login"
          ? "Inicia sesión para ver tus pedidos."
          : "Crea una cuenta para seguir tus pedidos."}
      </p>

      {/* Pestañas */}
      <div className="mt-6 flex rounded-lg bg-gray-100 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-md py-2 ${mode === "login" ? "bg-white shadow" : "text-gray-500"}`}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 rounded-md py-2 ${mode === "register" ? "bg-white shadow" : "text-gray-500"}`}
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
          href={`/${storeSlug}/cuenta/recuperar`}
          className="text-gray-500 hover:text-gray-900"
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
      <div>
        <label className={labelCls}>Contraseña</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className={inputCls}
        />
        <p className="mt-1 text-xs text-gray-400">Mínimo 6 caracteres.</p>
      </div>
      {state?.error && <Err>{state.error}</Err>}
      <button type="submit" disabled={pending} className={btnCls}>
        {pending ? "Creando…" : "Crear cuenta"}
      </button>
    </form>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
      {children}
    </p>
  );
}
