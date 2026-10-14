import { notFound } from "next/navigation";
import { CUSTOMER_ACCOUNTS } from "@/lib/store-features";

// Con las cuentas de clientes apagadas, /cuenta y sus páginas (recuperar,
// restablecer) no existen.
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  if (!CUSTOMER_ACCOUNTS) notFound();
  return children;
}
