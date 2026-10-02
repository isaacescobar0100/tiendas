import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isWompiConfigured, resolveWompiKeys } from "@/lib/wompi";
import { getStoreOpenState } from "@/lib/store-hours";
import { parseTransferAccounts } from "@/lib/payment-methods";
import CheckoutForm from "./checkout-form";

// Server component: decide qué métodos de pago ofrecer según los ajustes de la
// tienda (los activa la tienda o el superadmin) y si Wompi está configurado.
export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = await prisma.store.findFirst({
    where: { slug: storeSlug, active: true },
    select: {
      id: true,
      onlinePaymentEnabled: true,
      codEnabled: true,
      transferEnabled: true,
      transferAccountsJson: true,
      shippingCents: true,
      freeShippingOverCents: true,
      wompiPublicKey: true,
      wompiPrivateKey: true,
      wompiIntegritySecret: true,
      wompiEventsSecret: true,
      hoursJson: true,
    },
  });
  if (!store) notFound();

  const openState = getStoreOpenState(store.hoursJson);
  const closed = openState.enforced && !openState.isOpen;

  const locations = await prisma.storeLocation.findMany({
    where: { storeId: store.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { name: true, address: true },
  });

  // El pago en línea requiere que la tienda lo permita Y que haya llaves Wompi.
  const onlineEnabled =
    store.onlinePaymentEnabled && isWompiConfigured(resolveWompiKeys(store));
  const codEnabled = store.codEnabled;
  // Transferencia: solo si la tienda tiene al menos una cuenta o QR cargado.
  const transferEnabled =
    store.transferEnabled &&
    parseTransferAccounts(store.transferAccountsJson).length > 0;

  return (
    <CheckoutForm
      onlineEnabled={onlineEnabled}
      codEnabled={codEnabled}
      transferEnabled={transferEnabled}
      locations={locations}
      closed={closed}
      closedMessage={closed ? openState.message : null}
      shipping={{
        shippingCents: store.shippingCents,
        freeShippingOverCents: store.freeShippingOverCents,
      }}
    />
  );
}
