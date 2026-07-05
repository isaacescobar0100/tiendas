import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const pass = await bcrypt.hash("password123", 10);

  // 1) Superadmin de la plataforma
  await prisma.user.upsert({
    where: { email: "super@mitienda.com" },
    update: {},
    create: {
      email: "super@mitienda.com",
      name: "Super Admin",
      passwordHash: pass,
      role: "SUPERADMIN",
    },
  });

  // 2) Tienda de ejemplo con su admin, categorías y productos
  const store = await prisma.store.upsert({
    where: { slug: "moda-central" },
    update: {},
    create: {
      name: "Moda Central",
      slug: "moda-central",
      description: "Ropa y accesorios para todos los días.",
      currency: "COP",
      owner: {
        create: {
          email: "admin@modacentral.com",
          name: "Ana Pérez",
          passwordHash: pass,
          role: "ADMIN",
        },
      },
      categories: {
        create: [
          { name: "Camisetas", slug: "camisetas" },
          { name: "Calzado", slug: "calzado" },
          { name: "Accesorios", slug: "accesorios" },
        ],
      },
    },
    include: { categories: true },
  });

  const cat = (slug: string) =>
    store.categories.find((c) => c.slug === slug)?.id ?? null;

  const demoProducts = [
    {
      name: "Camiseta básica blanca",
      slug: "camiseta-basica-blanca",
      priceCents: 1999000, // COP $19.990
      stock: 40,
      categoryId: cat("camisetas"),
      imageUrl: "https://picsum.photos/seed/tee1/500",
      images: [
        "https://picsum.photos/seed/tee1b/500",
        "https://picsum.photos/seed/tee1c/500",
      ],
      description: "Algodón 100%, corte regular.",
      variants: [
        { color: "Blanco", size: "S", stock: 10 },
        { color: "Blanco", size: "M", stock: 15 },
        { color: "Blanco", size: "L", stock: 8 },
        { color: "Negro", size: "S", stock: 5 },
        { color: "Negro", size: "M", stock: 0 },
        { color: "Negro", size: "L", stock: 4 },
      ],
    },
    {
      name: "Camiseta gráfica negra",
      slug: "camiseta-grafica-negra",
      priceCents: 2499000, // COP $24.990
      stock: 25,
      categoryId: cat("camisetas"),
      imageUrl: "https://picsum.photos/seed/tee2/500",
      images: [
        "https://picsum.photos/seed/tee2b/500",
        "https://picsum.photos/seed/tee2c/500",
      ],
      description: "Estampado exclusivo edición limitada.",
      variants: [
        { color: "Negro", size: "S", stock: 6 },
        { color: "Negro", size: "M", stock: 9 },
        { color: "Negro", size: "L", stock: 4 },
      ],
    },
    {
      name: "Zapatillas urbanas",
      slug: "zapatillas-urbanas",
      priceCents: 5999000, // COP $59.990
      stock: 12,
      categoryId: cat("calzado"),
      imageUrl: "https://picsum.photos/seed/shoe1/500",
      images: [
        "https://picsum.photos/seed/shoe1b/500",
        "https://picsum.photos/seed/shoe1c/500",
        "https://picsum.photos/seed/shoe1d/500",
      ],
      description: "Cómodas y ligeras para el día a día.",
      variants: [
        { color: "Blanco", size: "40", stock: 3 },
        { color: "Blanco", size: "41", stock: 5 },
        { color: "Blanco", size: "42", stock: 2 },
        { color: "Negro", size: "41", stock: 4 },
        { color: "Negro", size: "42", stock: 0 },
        { color: "Negro", size: "43", stock: 6 },
      ],
    },
    {
      name: "Gorra clásica",
      slug: "gorra-clasica",
      priceCents: 1499000, // COP $14.990
      stock: 0,
      categoryId: cat("accesorios"),
      imageUrl: "https://picsum.photos/seed/cap1/500",
      images: ["https://picsum.photos/seed/cap1b/500"],
      description: "Ajustable, talla única.",
      variants: [] as { color: string; size: string; stock: number }[],
    },
  ];

  for (const { variants, ...p } of demoProducts) {
    const product = await prisma.product.upsert({
      where: { storeId_slug: { storeId: store.id, slug: p.slug } },
      update: {},
      create: { ...p, storeId: store.id },
      include: { variants: true },
    });
    if (variants.length > 0 && product.variants.length === 0) {
      await prisma.productVariant.createMany({
        data: variants.map((v) => ({ ...v, productId: product.id })),
      });
    }
  }

  // 3) Pedidos de ejemplo (solo si la tienda aún no tiene ninguno)
  const existingOrders = await prisma.order.count({
    where: { storeId: store.id },
  });
  if (existingOrders === 0) {
    const products = await prisma.product.findMany({
      where: { storeId: store.id },
    });
    const p = (slug: string) => products.find((x) => x.slug === slug)!;

    const sampleOrders = [
      {
        customerName: "Lucía Gómez",
        customerEmail: "lucia@example.com",
        customerPhone: "+34 600 111 222",
        street: "Calle Mayor",
        streetNumber: "10",
        city: "Madrid",
        postalCode: "28013",
        country: "España",
        status: "PENDING" as const,
        lines: [
          { product: p("camiseta-basica-blanca"), qty: 2 },
          { product: p("gorra-clasica"), qty: 1 },
        ],
      },
      {
        customerName: "Carlos Ruiz",
        customerEmail: "carlos@example.com",
        street: "Av. Diagonal",
        streetNumber: "200",
        city: "Barcelona",
        postalCode: "08018",
        country: "España",
        status: "SHIPPED" as const,
        lines: [{ product: p("zapatillas-urbanas"), qty: 1 }],
      },
    ];

    for (const o of sampleOrders) {
      const total = o.lines.reduce(
        (n, l) => n + l.product.priceCents * l.qty,
        0,
      );
      const address = `${o.street} ${o.streetNumber}, ${o.postalCode} ${o.city}, ${o.country}`;
      await prisma.order.create({
        data: {
          storeId: store.id,
          customerName: o.customerName,
          customerEmail: o.customerEmail,
          customerPhone: o.customerPhone ?? null,
          street: o.street,
          streetNumber: o.streetNumber,
          city: o.city,
          postalCode: o.postalCode,
          country: o.country,
          address,
          totalCents: total,
          currency: store.currency,
          status: o.status,
          items: {
            create: o.lines.map((l) => ({
              productId: l.product.id,
              name: l.product.name,
              priceCents: l.product.priceCents,
              quantity: l.qty,
            })),
          },
        },
      });
    }
    console.log("   + 2 pedidos de ejemplo creados.");
  }

  console.log("✅ Seed completado.");
  console.log("   Superadmin:  super@mitienda.com / password123");
  console.log("   Admin tienda: admin@modacentral.com / password123");
  console.log("   Tienda pública: /moda-central");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
