import { defineConfig } from "vitest/config";
import path from "path";

// Pruebas de la lógica crítica (precios, stock, pagos, seguridad). No usan la
// base de datos real: lo que la necesita se simula con vi.mock.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // "server-only" corta la importación fuera de Next; en pruebas no hace falta.
      "server-only": path.resolve(__dirname, "tests/stubs/empty.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    env: { AUTH_SECRET: "secreto-de-pruebas-solo-para-vitest-123456" },
  },
});
