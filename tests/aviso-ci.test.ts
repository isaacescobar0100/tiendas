import { expect, it } from "vitest";

// Falla a propósito para probar el aviso por correo del CI (se revierte enseguida).
it("prueba del aviso de CI", () => {
  expect("aviso").toBe("falla a propósito");
});
