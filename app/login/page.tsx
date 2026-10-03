import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic"; // la marca depende del dominio
export const metadata: Metadata = { title: "Iniciar sesión", robots: { index: false } };

export default function LoginPage() {
  return (
    <AuthShell variant="admin">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
