import { prisma } from "../src/lib/db";

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "seed-org" },
    update: {},
    create: {
      id: "seed-org",
      name: "Carnicería Demo",
      slug: "demo",
      createdAt: new Date(),
    },
  });

  // Products
  const vacio = await prisma.product.upsert({
    where: { id: "seed-vacio" },
    update: {},
    create: {
      id: "seed-vacio", organizationId: org.id, plu: "00001",
      name: "Vacío", category: "vacuno", emoji: "🥩", price: 9500, unit: "kg",
    },
  });
  const chorizo = await prisma.product.upsert({
    where: { id: "seed-chorizo" },
    update: {},
    create: {
      id: "seed-chorizo", organizationId: org.id, plu: "00030",
      name: "Chorizo parrillero", category: "embutidos", emoji: "🌭",
      price: 4500, unit: "kg", productType: "processed",
    },
  });
  const hamburguesa = await prisma.product.upsert({
    where: { id: "seed-hamburguesa" },
    update: {},
    create: {
      id: "seed-hamburguesa", organizationId: org.id, plu: "00040",
      name: "Hamburguesas x4", category: "elaborados", emoji: "🍔",
      price: 3200, unit: "un", productType: "processed",
    },
  });

  // Recipe (BOM) — hamburguesa necesita chorizo como insumo
  await prisma.recipeItem.upsert({
    where: { id: "seed-recipe-1" },
    update: {},
    create: {
      id: "seed-recipe-1", organizationId: org.id,
      outputId: hamburguesa.id, inputId: chorizo.id,
      quantity: 0.5, unit: "kg", yieldFactor: 1,
    },
  });

  // Supplier
  const supplier = await prisma.supplier.upsert({
    where: { id: "seed-supplier" },
    update: {},
    create: {
      id: "seed-supplier", organizationId: org.id,
      name: "Frigorífico Norte", contactName: "Carlos", phone: "341 555-1234",
    },
  });

  // Purchase
  await prisma.purchase.upsert({
    where: { id: "seed-purchase" },
    update: {},
    create: {
      id: "seed-purchase", organizationId: org.id,
      supplierId: supplier.id, total: 285000,
      paymentMethod: "transfer", status: "completed",
      items: {
        create: [
          { productId: vacio.id, quantity: 20, unit: "kg", unitCost: 6500, totalCost: 130000 },
          { productId: chorizo.id, quantity: 30, unit: "kg", unitCost: 3200, totalCost: 96000 },
        ],
      },
    },
  });

  // Inventory
  await prisma.inventoryItem.upsert({
    where: { productId: vacio.id },
    update: {},
    create: { organizationId: org.id, productId: vacio.id, quantity: 15, unit: "kg" },
  });
  await prisma.inventoryItem.upsert({
    where: { productId: chorizo.id },
    update: {},
    create: { organizationId: org.id, productId: chorizo.id, quantity: 25, unit: "kg" },
  });

  // Costos
  await prisma.productCost.upsert({
    where: { productId: vacio.id },
    update: {},
    create: { productId: vacio.id, organizationId: org.id, cost: 6500 },
  });
  await prisma.productCost.upsert({
    where: { productId: chorizo.id },
    update: {},
    create: { productId: chorizo.id, organizationId: org.id, cost: 3200 },
  });

  // Stock movement (con trazabilidad)
  await prisma.stockMovement.create({
    data: {
      organizationId: org.id, type: "entry",
      productId: vacio.id, productName: "Vacío",
      quantity: 15, unit: "kg",
      supplier: "Frigorífico Norte", batch: "L-2025-001", origin: "Argentina",
      note: "Compra seed",
    },
  });

  console.log("✅ Seed completado");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
