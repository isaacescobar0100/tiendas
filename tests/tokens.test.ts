import { createHash } from "crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }) }));

import { openPayload, sealPayload, signPayload, verifyPayload } from "@/lib/signed-cookie";
import { orderIdFromLiveToken, orderLiveSrc } from "@/lib/order-live";
import { verifyEvent, type WompiTransaction } from "@/lib/wompi";

describe("tokens cifrados", () => {
  it("abren con el mismo propósito y no con otro", () => {
    const t = sealPayload("a", { id: "x1", exp: Date.now() + 60_000 });
    expect(openPayload<{ id: string; exp: number }>("a", t)?.id).toBe("x1");
    expect(openPayload("b", t)).toBeNull();
  });

  it("rechazan un token alterado o vencido", () => {
    const t = sealPayload("a", { id: "x1", exp: Date.now() + 60_000 });
    expect(openPayload("a", t.slice(0, -2) + (t.endsWith("A") ? "BB" : "AA"))).toBeNull();
    expect(openPayload("a", sealPayload("a", { id: "x1", exp: Date.now() - 1 }))).toBeNull();
  });

  it("el pulso en vivo no lleva el id del pedido a la vista", () => {
    const id = "cmabc123def456ghi789jkl00";
    const src = orderLiveSrc(id);
    expect(src).not.toContain(id);
    expect(orderIdFromLiveToken(new URL(src, "https://x").searchParams.get("t"))).toBe(id);
  });

  it("las cookies firmadas detectan cambios", () => {
    const t = signPayload("c", { u: 1, exp: Date.now() + 60_000 });
    expect(verifyPayload<{ u: number; exp: number }>("c", t)?.u).toBe(1);
    const [payload, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ u: 2, exp: Date.now() + 60_000 })).toString("base64url");
    expect(verifyPayload("c", `${forged}.${sig}`)).toBeNull();
    expect(verifyPayload("c", `${payload}.x${sig.slice(1)}`)).toBeNull();
  });
});

describe("webhook de Wompi", () => {
  const tx: WompiTransaction = { id: "t1", status: "APPROVED", reference: "ord1", amount_in_cents: 1850000, currency: "COP" };
  const props = ["transaction.id", "transaction.status", "transaction.amount_in_cents"];
  const sign = (secret: string, ts: number) =>
    createHash("sha256").update(`t1APPROVED1850000${ts}${secret}`).digest("hex");

  it("acepta solo la firma del secreto de la tienda", () => {
    const ev = (checksum: string) => ({
      event: "transaction.updated",
      data: { transaction: tx },
      timestamp: 1700000000,
      signature: { checksum, properties: props },
    });
    expect(verifyEvent(ev(sign("secreto", 1700000000)), "secreto")?.id).toBe("t1");
    expect(verifyEvent(ev(sign("otro", 1700000000)), "secreto")).toBeNull();
    expect(verifyEvent(ev(sign("secreto", 1700000000)), "")).toBeNull();
  });
});
