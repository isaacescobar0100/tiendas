import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isWompiConfigured } from "@/lib/wompi";
import CheckoutForm from "./checkout-form";

// Server component: decide qué métodos de pago ofrecer según los ajustes de la
// tienda (los controla el superadmin) y si Wompi está configurado.
export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = await prisma.store.findFirst({
    where: { slug: storeSlug, active: true },
    select: { onlinePaymentEnabled: true, codEnabled: true },
  });
  if (!store) notFound();

  // El pago en línea requiere que la tienda lo permita Y que haya llaves Wompi.
  const onlineEnabled = store.onlinePaymentEnabled && isWompiConfigured();
  const codEnabled = store.codEnabled;

  return <CheckoutForm onlineEnabled={onlineEnabled} codEnabled={codEnabled} />;
}
