import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/guards";
import { EditStoreForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditStorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperadmin();
  const { id } = await params;
  const store = await prisma.store.findUnique({
    where: { id },
    include: { owner: { select: { email: true } } },
  });
  if (!store) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/superadmin"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">
        Configurar tienda
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        {store.name} · {store.owner.email}
      </p>

      <EditStoreForm
        store={{
          id: store.id,
          name: store.name,
          slug: store.slug,
          customDomain: store.customDomain,
          wompiPublicKey: store.wompiPublicKey,
          wompiPrivateKey: store.wompiPrivateKey,
          wompiIntegritySecret: store.wompiIntegritySecret,
          wompiEventsSecret: store.wompiEventsSecret,
        }}
      />
    </div>
  );
}
