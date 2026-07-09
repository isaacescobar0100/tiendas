import { redirect } from "next/navigation";

// La raíz no es pública: no hay catálogo de "todas las tiendas". Cada tienda se
// visita por su propia URL (/su-slug) y el acceso al panel es por /login.
export default function Home() {
  redirect("/login");
}
