import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SedeLoginForm } from "./sede-login-form";

export const dynamic = "force-dynamic"; // la marca depende del dominio
export const metadata: Metadata = { title: "Acceso de sede", robots: { index: false } };

export default function SedeLoginPage() {
  return (
    <AuthShell variant="sede">
      <SedeLoginForm />
    </AuthShell>
  );
}
