import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "./reset-form";

export const dynamic = "force-dynamic"; // la marca depende del dominio
export const metadata: Metadata = { title: "Nueva contraseña", robots: { index: false } };

export default function ResetPage() {
  return (
    <AuthShell variant="reset">
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
