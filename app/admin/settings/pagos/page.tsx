import { requireAdminStore } from "@/lib/guards";
import { isWompiConfigured, resolveWompiKeys } from "@/lib/wompi";
import { parseTransferAccounts } from "@/lib/payment-methods";
import { PaymentsForm } from "../payments-form";

export const dynamic = "force-dynamic";

// Ajustes › Pagos (métodos de pago y cuentas para transferencia)
export default async function SettingsPagosPage() {
  const { store } = await requireAdminStore();
  return (
    <PaymentsForm
      data={{
        wompiReady: isWompiConfigured(resolveWompiKeys(store)),
        onlinePaymentEnabled: store.onlinePaymentEnabled,
        codEnabled: store.codEnabled,
        transferEnabled: store.transferEnabled,
        transferAccounts: parseTransferAccounts(store.transferAccountsJson),
      }}
    />
  );
}
