import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { storePublicUrl } from "@/lib/site-url";

// Descarga el QR de una mesa en PNG (1024 px, para imprenta o WhatsApp).
export async function GET(request: Request) {
  const { store } = await requireAdminStore();
  const id = new URL(request.url).searchParams.get("mesa") ?? "";
  const table = await prisma.diningTable.findFirst({
    where: { id, storeId: store.id },
    select: { id: true, name: true },
  });
  if (!table) return new Response("Mesa no encontrada", { status: 404 });

  const png = await QRCode.toBuffer(`${storePublicUrl(store)}/menu?mesa=${table.id}`, {
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "M",
  });
  const file = `qr-${table.name}`.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${file || "qr-mesa"}.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
