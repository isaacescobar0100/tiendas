import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RecoverForm } from "./recover-form";

export const dynamic = "force-dynamic"; // la marca depende del dominio
export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false } };

export default function RecoverPage() {
  return (
    <AuthShell variant="recover">
      <RecoverForm />
    </AuthShell>
  );
}
