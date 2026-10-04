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
    include: {
      owner: { select: { email: true } },
      _count: { select: { locations: true } },
    },
  });
  if (!store) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <Link
        prefetch={false}
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
          type: store.type,
          currency: store.currency,
          customDomain: store.customDomain,
          domainActive: store.domainActive,
          seoCity: store.seoCity,
          seoKeywords: store.seoKeywords,
          plan: store.plan,
          maxLocations: store.maxLocations,
          sedesUsed: store._count.locations,
          // Fecha en hora de Colombia (YYYY-MM-DD): con UTC se correría un día.
          paidUntil: store.paidUntil
            ? new Intl.DateTimeFormat("en-CA", {
                timeZone: "America/Bogota",
              }).format(store.paidUntil)
            : "",
          onlinePaymentEnabled: store.onlinePaymentEnabled,
          codEnabled: store.codEnabled,
          transferEnabled: store.transferEnabled,
          wompiPublicKey: store.wompiPublicKey,
          wompiPrivateKey: store.wompiPrivateKey,
          wompiIntegritySecret: store.wompiIntegritySecret,
          wompiEventsSecret: store.wompiEventsSecret,
        }}
      />
    </div>
  );
}
