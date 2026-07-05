import { isWompiConfigured } from "@/lib/wompi";
import CheckoutForm from "./checkout-form";

// Server component: decide si el pago online (Wompi) está activo y se lo pasa
// al formulario (cliente) para ajustar textos y el flujo de redirección.
export default function CheckoutPage() {
  return <CheckoutForm paymentsEnabled={isWompiConfigured()} />;
}
