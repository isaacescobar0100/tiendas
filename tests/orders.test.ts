import { beforeEach, describe, expect, it, vi } from "vitest";

// Base de datos simulada: se registra cada operación para comprobarla.
const db = vi.hoisted(() => {
  const tx = {
    productVariant: { updateMany: vi.fn() },
    product: { updateMany: vi.fn() },
    orderItem: { update: vi.fn() },
    $queryRaw: vi.fn(),
  };
  const prisma = {
    order: { findFirst: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  return { tx, prisma };
});

vi.mock("@/lib/prisma", () => ({ prisma: db.prisma }));
vi.mock("@/lib/email", () => ({ sendOrderEmails: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn(async () => ({ ok: true })) }));

import { markOrderPaid, setOrderPaymentStatus } from "@/lib/orders";
import type { WompiTransaction } from "@/lib/wompi";

const item = (o: Partial<{ id: string; variantId: string | null; productId: string | null; quantity: number; stockTaken: number | null }>) => ({
  id: "i1",
  variantId: "v1",
  productId: "p1",
  quantity: 3,
  stockTaken: null,
  ...o,
});
const order = (o: Record<string, unknown>) => ({
  id: "o1",
  status: "PENDING",
  paymentMethod: "COD",
  wompiTransactionId: null,
  store: { type: "FASHION" },
  items: [item({})],
  ...o,
});
const scope = { id: "o1", storeId: "s1" };
const restocked = () => db.tx.productVariant.updateMany.mock.calls.map((c) => c[0].data.stock.increment);

beforeEach(() => {
  vi.clearAllMocks();
  db.prisma.order.updateMany.mockResolvedValue({ count: 1 });
});

describe("stock al cambiar el pago", () => {
  it("al cancelar devuelve solo lo que se descontó (no la cantidad completa)", async () => {
    db.prisma.order.findFirst.mockResolvedValue(order({ items: [item({ quantity: 3, stockTaken: 1 })] }));
    expect(await setOrderPaymentStatus(scope, "CANCELLED")).toEqual({ ok: true });
    expect(restocked()).toEqual([1]);
    expect(db.tx.orderItem.update).toHaveBeenCalledWith({ where: { id: "i1" }, data: { stockTaken: 0 } });
  });

  it("pedido antiguo (sin registro) contra entrega: devuelve la cantidad completa", async () => {
    db.prisma.order.findFirst.mockResolvedValue(order({}));
    await setOrderPaymentStatus(scope, "CANCELLED");
    expect(restocked()).toEqual([3]);
  });

  it("pedido antiguo sin método de pago se trata como en línea", async () => {
    db.prisma.order.findFirst.mockResolvedValue(order({ status: "PAID", paymentMethod: null }));
    await setOrderPaymentStatus(scope, "CANCELLED");
    expect(restocked()).toEqual([3]);
  });

  it("en línea marcado pagado a mano descuenta y anota lo descontado", async () => {
    db.prisma.order.findFirst.mockResolvedValue(order({ paymentMethod: "ONLINE" }));
    db.tx.$queryRaw.mockResolvedValue([{ taken: 2 }]);
    await setOrderPaymentStatus(scope, "PAID");
    expect(db.tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(db.tx.orderItem.update).toHaveBeenCalledWith({ where: { id: "i1" }, data: { stockTaken: 2 } });
  });

  it("la comida no toca el stock", async () => {
    db.prisma.order.findFirst.mockResolvedValue(order({ store: { type: "FOOD" } }));
    await setOrderPaymentStatus(scope, "CANCELLED");
    expect(db.prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("reglas del estado de pago", () => {
  it("un pedido cancelado no se reabre", async () => {
    db.prisma.order.findFirst.mockResolvedValue(order({ status: "CANCELLED" }));
    expect(await setOrderPaymentStatus(scope, "PENDING")).toMatchObject({ ok: false });
  });

  it("un pago confirmado por Wompi no vuelve a pendiente", async () => {
    db.prisma.order.findFirst.mockResolvedValue(order({ status: "PAID", paymentMethod: "ONLINE", wompiTransactionId: "t1" }));
    expect(await setOrderPaymentStatus(scope, "PENDING")).toMatchObject({ ok: false });
    expect(db.prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it("si el pedido cambió entre tanto, no aplica nada", async () => {
    db.prisma.order.findFirst.mockResolvedValue(order({}));
    db.prisma.order.updateMany.mockResolvedValue({ count: 0 });
    expect(await setOrderPaymentStatus(scope, "CANCELLED")).toMatchObject({ ok: false });
    expect(db.prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("pago confirmado por Wompi", () => {
  const tx: WompiTransaction = { id: "t1", status: "APPROVED", reference: "o1", amount_in_cents: 1850000, currency: "COP" };

  it("exige monto, moneda, método y que no estuviera pagado", async () => {
    db.prisma.order.updateMany.mockResolvedValue({ count: 0 });
    await markOrderPaid("o1", tx);
    const where = db.prisma.order.updateMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ id: "o1", status: "PENDING", totalCents: 1850000, currency: "COP", wompiTransactionId: null });
  });

  it("ignora transacciones no aprobadas o de otro pedido", async () => {
    expect(await markOrderPaid("o1", { ...tx, status: "DECLINED" })).toBe(false);
    expect(await markOrderPaid("o1", { ...tx, reference: "otro" })).toBe(false);
    expect(db.prisma.order.updateMany).not.toHaveBeenCalled();
  });
});
