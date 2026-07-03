import { signOutAction } from "@/lib/session-actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="text-sm text-gray-500 transition hover:text-gray-900"
      >
        Cerrar sesión
      </button>
    </form>
  );
}
