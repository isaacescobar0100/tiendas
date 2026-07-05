import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSuperadmin } from "@/lib/guards";
import { ChangePasswordForm } from "./change-password-form";

export const dynamic = "force-dynamic";

export default async function SuperadminAccountPage() {
  const user = await requireSuperadmin();

  return (
    <div className="mx-auto max-w-md">
      <Link
        href="/superadmin"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Mi cuenta</h1>
      <p className="mb-6 text-sm text-gray-500">
        Sesión: <span className="font-medium text-gray-700">{user.email}</span>
      </p>
      <ChangePasswordForm />
    </div>
  );
}
