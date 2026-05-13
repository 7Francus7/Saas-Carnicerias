import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const ORG_ID        = "demo-org-001";
const SUP1_ID       = "sup-frigorifico-norte";
const SUP2_ID       = "sup-avicola-sur";

const P = {
  vacio:     "prod-vacio",
  asado:     "prod-asado",
  bife:      "prod-bife",
  cuadril:   "prod-cuadril",
  paleta:    "prod-paleta",
  molida:    "prod-molida",
  bondiola:  "prod-bondiola",
  costcerdo: "prod-costcerdo",
  pollo:     "prod-pollo",
  muslos:    "prod-muslos",
  chorizo:   "prod-chorizo",
  morcilla:  "prod-morcilla",
  salchicha: "prod-salchicha",
  hambur:    "prod-hambur",
  milcerdo:  "prod-milcerdo",
};

const C = {
  maria:   "client-maria",
  roberto: "client-roberto",
  ana:     "client-ana",
  jorge:   "client-jorge",
};

const SES_YESTERDAY = "session-yesterday";
const SES_TODAY     = "session-today";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No disponible en producción" }, { status: 404 });
  }

  const seedSecret   = process.env.ADMIN_SEED_SECRET;
  const adminEmail   = process.env.ADMIN_SEED_EMAIL;
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  const adminName    = process.env.ADMIN_SEED_NAME ?? "Carnify Admin";

  if (!seedSecret || !adminEmail || !adminPassword) {
    return NextResponse.json(
      { error: "Faltan variables de entorno para ejecutar el seed administrativo" },
      { status: 500 }
    );
  }

  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== seedSecret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // 1. Truncate all tables
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "business_settings",
        "stock_movement",
        "staff",
        "client_movement",
        "client_period",
        "client",
        "cash_transaction",
        "sale_item",
        "sale_payment_split",
        "sale",
        "caja_session",
        "product_cost",
        "product",
        "invitation",
        "member",
        "organization",
        "verification",
        "session",
        "account",
        "user"
      RESTART IDENTITY CASCADE
    `);

    // 2. Admin user
    await auth.api.signUpEmail({
      body: { name: adminName, email: adminEmail, password: adminPassword },
    });
    const adminUser = await prisma.user.update({
      where: { email: adminEmail },
      data: { role: "admin" },
    });

    // 3. Org + member
    await prisma.organization.create({
      data: {
        id: ORG_ID,
        name: "Carnicería El Gaucho",
        slug: "el-gaucho",
        createdAt: new Date("2026-04-01T12:00:00Z"),
      },
    });

    await prisma.member.create({
      data: {
        id: "member-admin-001",
        organizationId: ORG_ID,
        userId: adminUser.id,
        role: "owner",
        createdAt: new Date("2026-04-01T12:00:00Z"),
      },
    });

    // 4. Business settings
    await prisma.businessSettings.create({
      data: {
        organizationId: ORG_ID,
        nombre: "Carnicería El Gaucho",
        iniciales: "EG",
        direccion: "Av. San Martín 1234, Rosario",
        telefono: "0341-555-1234",
        cuit: "20-12345678-9",
        email: "elgaucho@carniceria.com",
        stockAlertThreshold: 5,
      },
    });

    // 5. Products
    await prisma.product.createMany({
      data: [
        { id: P.vacio,     organizationId: ORG_ID, plu: "001", name: "Vacío",               category: "vacuno",     emoji: "🥩", price: 9500,  unit: "kg" },
        { id: P.asado,     organizationId: ORG_ID, plu: "002", name: "Asado",               category: "vacuno",     emoji: "🥩", price: 8500,  unit: "kg" },
        { id: P.bife,      organizationId: ORG_ID, plu: "003", name: "Bife de chorizo",     category: "vacuno",     emoji: "🥩", price: 14500, unit: "kg" },
        { id: P.cuadril,   organizationId: ORG_ID, plu: "004", name: "Cuadril",             category: "vacuno",     emoji: "🥩", price: 12000, unit: "kg" },
        { id: P.paleta,    organizationId: ORG_ID, plu: "005", name: "Paleta",              category: "vacuno",     emoji: "🥩", price: 6800,  unit: "kg" },
        { id: P.molida,    organizationId: ORG_ID, plu: "006", name: "Carne molida",        category: "vacuno",     emoji: "🥩", price: 7500,  unit: "kg" },
        { id: P.bondiola,  organizationId: ORG_ID, plu: "007", name: "Bondiola",            category: "cerdo",      emoji: "🐷", price: 7200,  unit: "kg" },
        { id: P.costcerdo, organizationId: ORG_ID, plu: "008", name: "Costilla de cerdo",  category: "cerdo",      emoji: "🐷", price: 5500,  unit: "kg" },
        { id: P.pollo,     organizationId: ORG_ID, plu: "009", name: "Pollo entero",       category: "pollo",      emoji: "🍗", price: 3200,  unit: "kg" },
        { id: P.muslos,    organizationId: ORG_ID, plu: "010", name: "Muslos de pollo",    category: "pollo",      emoji: "🍗", price: 3800,  unit: "kg" },
        { id: P.chorizo,   organizationId: ORG_ID, plu: "011", name: "Chorizo parrillero", category: "embutidos",  emoji: "🌭", price: 5800,  unit: "kg" },
        { id: P.morcilla,  organizationId: ORG_ID, plu: "012", name: "Morcilla",           category: "embutidos",  emoji: "🌭", price: 4200,  unit: "kg" },
        { id: P.salchicha, organizationId: ORG_ID, plu: "013", name: "Salchicha",          category: "embutidos",  emoji: "🌭", price: 3900,  unit: "kg" },
        { id: P.hambur,    organizationId: ORG_ID, plu: "014", name: "Hamburguesas x4",    category: "elaborados", emoji: "🍔", price: 4500,  unit: "un" },
        { id: P.milcerdo,  organizationId: ORG_ID, plu: "015", name: "Milanesa de cerdo",  category: "elaborados", emoji: "🍖", price: 8900,  unit: "kg" },
      ],
    });

    // 6. Product costs
    await prisma.productCost.createMany({
      data: [
        { organizationId: ORG_ID, productId: P.vacio,     cost: 6500 },
        { organizationId: ORG_ID, productId: P.asado,     cost: 5800 },
        { organizationId: ORG_ID, productId: P.bife,      cost: 9800 },
        { organizationId: ORG_ID, productId: P.cuadril,   cost: 8200 },
        { organizationId: ORG_ID, productId: P.paleta,    cost: 4600 },
        { organizationId: ORG_ID, productId: P.molida,    cost: 5000 },
        { organizationId: ORG_ID, productId: P.bondiola,  cost: 4800 },
        { organizationId: ORG_ID, productId: P.costcerdo, cost: 3700 },
        { organizationId: ORG_ID, productId: P.pollo,     cost: 2100 },
        { organizationId: ORG_ID, productId: P.muslos,    cost: 2500 },
        { organizationId: ORG_ID, productId: P.chorizo,   cost: 3900 },
        { organizationId: ORG_ID, productId: P.morcilla,  cost: 2800 },
        { organizationId: ORG_ID, productId: P.salchicha, cost: 2600 },
        { organizationId: ORG_ID, productId: P.hambur,    cost: 2800 },
        { organizationId: ORG_ID, productId: P.milcerdo,  cost: 5900 },
      ],
    });

    // 7. Inventory (morcilla at 2.5kg — bajo stock)
    await prisma.inventoryItem.createMany({
      data: [
        { organizationId: ORG_ID, productId: P.vacio,     quantity: 18.5, unit: "kg" },
        { organizationId: ORG_ID, productId: P.asado,     quantity: 22.0, unit: "kg" },
        { organizationId: ORG_ID, productId: P.bife,      quantity: 11.0, unit: "kg" },
        { organizationId: ORG_ID, productId: P.cuadril,   quantity: 7.0,  unit: "kg" },
        { organizationId: ORG_ID, productId: P.paleta,    quantity: 14.0, unit: "kg" },
        { organizationId: ORG_ID, productId: P.molida,    quantity: 18.5, unit: "kg" },
        { organizationId: ORG_ID, productId: P.bondiola,  quantity: 8.8,  unit: "kg" },
        { organizationId: ORG_ID, productId: P.costcerdo, quantity: 12.0, unit: "kg" },
        { organizationId: ORG_ID, productId: P.pollo,     quantity: 26.5, unit: "kg" },
        { organizationId: ORG_ID, productId: P.muslos,    quantity: 17.5, unit: "kg" },
        { organizationId: ORG_ID, productId: P.chorizo,   quantity: 13.5, unit: "kg" },
        { organizationId: ORG_ID, productId: P.morcilla,  quantity: 2.5,  unit: "kg" }, // BAJO STOCK
        { organizationId: ORG_ID, productId: P.salchicha, quantity: 8.5,  unit: "kg" },
        { organizationId: ORG_ID, productId: P.hambur,    quantity: 22.0, unit: "un" },
        { organizationId: ORG_ID, productId: P.milcerdo,  quantity: 5.2,  unit: "kg" },
      ],
    });

    // 8. Suppliers
    await prisma.supplier.createMany({
      data: [
        {
          id: SUP1_ID,
          organizationId: ORG_ID,
          name: "Frigorífico Norte S.A.",
          contactName: "Carlos Méndez",
          phone: "0341-444-5678",
          email: "ventas@frigorifico-norte.com",
          address: "Ruta 34 km 12, Rosario",
          cuit: "30-98765432-1",
          status: "active",
        },
        {
          id: SUP2_ID,
          organizationId: ORG_ID,
          name: "Avícola del Sur",
          contactName: "Laura Gómez",
          phone: "0341-333-9012",
          status: "active",
        },
      ],
    });

    // 9. Purchases (semana pasada vacuno/cerdo + ayer pollo)
    await prisma.purchase.create({
      data: {
        organizationId: ORG_ID,
        supplierId: SUP1_ID,
        date: new Date("2026-05-06T14:00:00Z"),
        paymentMethod: "transfer",
        status: "received",
        notes: "Compra semanal vacuno y cerdo",
        total: 30 * 6500 + 15 * 5800 + 20 * 4800 + 15 * 3700,
        items: {
          create: [
            { productId: P.vacio,     quantity: 30, unit: "kg", unitCost: 6500, totalCost: 30 * 6500 },
            { productId: P.asado,     quantity: 15, unit: "kg", unitCost: 5800, totalCost: 15 * 5800 },
            { productId: P.bondiola,  quantity: 20, unit: "kg", unitCost: 4800, totalCost: 20 * 4800 },
            { productId: P.costcerdo, quantity: 15, unit: "kg", unitCost: 3700, totalCost: 15 * 3700 },
          ],
        },
      },
    });

    await prisma.purchase.create({
      data: {
        organizationId: ORG_ID,
        supplierId: SUP2_ID,
        date: new Date("2026-05-11T09:00:00Z"),
        paymentMethod: "cash",
        status: "received",
        notes: "Pollo fresco semanal",
        total: 40 * 2100 + 25 * 2500,
        items: {
          create: [
            { productId: P.pollo,  quantity: 40, unit: "kg", unitCost: 2100, totalCost: 40 * 2100 },
            { productId: P.muslos, quantity: 25, unit: "kg", unitCost: 2500, totalCost: 25 * 2500 },
          ],
        },
      },
    });

    // 10. Clients
    await prisma.client.createMany({
      data: [
        {
          id: C.maria,
          organizationId: ORG_ID,
          name: "María García",
          phone: "0341-611-2345",
          dni: "28456789",
          creditLimit: 30000,
          balance: 15000,         // 15000 (pre) + 11250 (hoy fiado) - pero ajustamos historia
          lastActivity: new Date("2026-05-12T14:45:00Z"),
        },
        {
          id: C.roberto,
          organizationId: ORG_ID,
          name: "Roberto Fernández",
          phone: "0341-622-3456",
          dni: "32567890",
          creditLimit: 25000,
          balance: 8500,
          lastActivity: new Date("2026-05-11T19:30:00Z"),
        },
        {
          id: C.ana,
          organizationId: ORG_ID,
          name: "Ana López",
          phone: "0341-633-4567",
          creditLimit: 20000,
          balance: 0,
          lastActivity: new Date("2026-05-10T16:00:00Z"),
        },
        {
          id: C.jorge,
          organizationId: ORG_ID,
          name: "Jorge Ruiz",
          phone: "0341-644-5678",
          dni: "19234567",
          address: "Mitre 456, Rosario",
          creditLimit: 50000,
          balance: 22000,
          lastActivity: new Date("2026-05-09T15:00:00Z"),
        },
      ],
    });

    // 11. Client movements (explican saldo actual)
    await prisma.clientMovement.createMany({
      data: [
        // María → saldo 15000: venta 26250 - pago 11250 = 15000 → +hoy fiado 0 (ajustado)
        { clientId: C.maria, date: new Date("2026-04-15T15:00:00Z"), type: "sale",    amount: 26250, balanceAfter: 26250, description: "Compra quincenal" },
        { clientId: C.maria, date: new Date("2026-04-28T10:00:00Z"), type: "payment", amount: -11250, balanceAfter: 15000, description: "Pago en efectivo", paymentMethod: "cash" },
        // hoy: venta fiado agrega encima pero el balance del cliente ya tiene 15000 + hoy se suma (se crea abajo)
        // Roberto → saldo 8500: venta ayer 28500 - pago hoy 20000 = 8500
        { clientId: C.roberto, date: new Date("2026-05-11T19:30:00Z"), type: "sale",    amount: 28500, balanceAfter: 28500, description: "Asado familiar grandes cantidades" },
        { clientId: C.roberto, date: new Date("2026-05-12T10:00:00Z"), type: "payment", amount: -20000, balanceAfter: 8500,  description: "Pago parcial", paymentMethod: "transfer" },
        // Jorge → saldo 22000: venta 35000 - pago 20000 + venta 7000 = 22000
        { clientId: C.jorge, date: new Date("2026-04-15T14:00:00Z"), type: "sale",    amount: 35000, balanceAfter: 35000, description: "Parrillada grande evento" },
        { clientId: C.jorge, date: new Date("2026-04-22T12:00:00Z"), type: "payment", amount: -20000, balanceAfter: 15000, description: "Pago efectivo", paymentMethod: "cash" },
        { clientId: C.jorge, date: new Date("2026-05-09T15:00:00Z"), type: "sale",    amount: 7000,  balanceAfter: 22000, description: "Vacío y paleta" },
        // Ana → saldo 0: venta 12000 - pago 12000 = 0
        { clientId: C.ana, date: new Date("2026-05-08T11:00:00Z"), type: "sale",    amount: 12000, balanceAfter: 12000, description: "Compra mensual" },
        { clientId: C.ana, date: new Date("2026-05-10T16:00:00Z"), type: "payment", amount: -12000, balanceAfter: 0,     description: "Pago total", paymentMethod: "cash" },
      ],
    });

    // 12. Sesión de ayer (cerrada)
    // cash total: 22750 + 6400 + 19120 + 14340 = 62610 | transfer: 15150 | fiado: 28500
    await prisma.cajaSession.create({
      data: {
        id: SES_YESTERDAY,
        organizationId: ORG_ID,
        openedAt:  new Date("2026-05-11T11:00:00Z"), // 08:00 ART
        closedAt:  new Date("2026-05-11T23:00:00Z"), // 20:00 ART
        startingCash: 5000,
        openedById: adminUser.id,
        closedById: adminUser.id,
        realAmounts:   { cash: 67800,  transfer: 15150 },
        tericoByMethod: { cash: 67610, transfer: 15150, fiado: 28500 },
        diffByMethod:   { cash: 190,   transfer: 0 },
        diffAmount: 190,
        transactions: {
          create: [
            { organizationId: ORG_ID, type: "starting_cash", amount: 5000, reason: "Apertura de caja", timestamp: new Date("2026-05-11T11:00:00Z") },
          ],
        },
        sales: {
          create: [
            {
              timestamp: new Date("2026-05-11T11:30:00Z"),
              total: 9500 * 1.5 + 8500,
              method: "cash", itemCount: 2, status: "active",
              items: { create: [
                { productId: P.vacio, name: "Vacío",  price: 9500, unitCost: 6500, quantity: 1.5, unit: "kg", emoji: "🥩" },
                { productId: P.asado, name: "Asado",  price: 8500, unitCost: 5800, quantity: 1.0, unit: "kg", emoji: "🥩" },
              ]},
            },
            {
              timestamp: new Date("2026-05-11T13:00:00Z"),
              total: 14500 * 0.5 + 5800 + 4200 * 0.5,
              method: "transfer", itemCount: 3, status: "active",
              items: { create: [
                { productId: P.bife,    name: "Bife de chorizo",    price: 14500, unitCost: 9800, quantity: 0.5, unit: "kg", emoji: "🥩" },
                { productId: P.chorizo, name: "Chorizo parrillero", price: 5800,  unitCost: 3900, quantity: 1.0, unit: "kg", emoji: "🌭" },
                { productId: P.morcilla, name: "Morcilla",          price: 4200,  unitCost: 2800, quantity: 0.5, unit: "kg", emoji: "🌭" },
              ]},
            },
            {
              timestamp: new Date("2026-05-11T14:30:00Z"),
              total: 3200 * 2,
              method: "cash", itemCount: 1, status: "active",
              items: { create: [
                { productId: P.pollo, name: "Pollo entero", price: 3200, unitCost: 2100, quantity: 2.0, unit: "kg", emoji: "🍗" },
              ]},
            },
            {
              timestamp: new Date("2026-05-11T17:00:00Z"),
              total: 12000 + 8900 * 0.8,
              method: "cash", itemCount: 2, status: "active",
              items: { create: [
                { productId: P.cuadril,  name: "Cuadril",            price: 12000, unitCost: 8200, quantity: 1.0, unit: "kg", emoji: "🥩" },
                { productId: P.milcerdo, name: "Milanesa de cerdo",  price: 8900,  unitCost: 5900, quantity: 0.8, unit: "kg", emoji: "🍖" },
              ]},
            },
            {
              timestamp: new Date("2026-05-11T19:30:00Z"),
              total: 7500 * 2 + 4500 * 3,
              method: "fiado", itemCount: 2, status: "active",
              clientId: C.roberto, clientName: "Roberto Fernández",
              items: { create: [
                { productId: P.molida, name: "Carne molida",  price: 7500, unitCost: 5000, quantity: 2.0, unit: "kg", emoji: "🥩" },
                { productId: P.hambur, name: "Hamburguesas x4", price: 4500, unitCost: 2800, quantity: 3.0, unit: "un", emoji: "🍔" },
              ]},
            },
            {
              timestamp: new Date("2026-05-11T21:00:00Z"),
              total: 7200 * 1.2 + 3800 * 1.5,
              method: "cash", itemCount: 2, status: "active",
              items: { create: [
                { productId: P.bondiola, name: "Bondiola",         price: 7200, unitCost: 4800, quantity: 1.2, unit: "kg", emoji: "🐷" },
                { productId: P.muslos,   name: "Muslos de pollo",  price: 3800, unitCost: 2500, quantity: 1.5, unit: "kg", emoji: "🍗" },
              ]},
            },
          ],
        },
      },
    });

    // 13. Sesión de hoy (abierta)
    // Venta cancelada: hambur 2un + salchicha 0.5kg = 9000 + 1950 = 10950
    // Venta fiado María: molida 1.5kg = 11250
    // Venta split: vacío 2kg + paleta 1kg = 19000 + 6800 = 25800 (cash 16000 + transfer 9800)
    await prisma.cajaSession.create({
      data: {
        id: SES_TODAY,
        organizationId: ORG_ID,
        openedAt: new Date("2026-05-12T11:00:00Z"), // 08:00 ART
        startingCash: 5000,
        openedById: adminUser.id,
        transactions: {
          create: [
            { organizationId: ORG_ID, type: "starting_cash", amount: 5000, reason: "Apertura de caja", timestamp: new Date("2026-05-12T11:00:00Z") },
          ],
        },
        sales: {
          create: [
            // 09:15 ART
            {
              timestamp: new Date("2026-05-12T12:15:00Z"),
              total: 8500 * 1.2 + 5500,
              method: "cash", itemCount: 2, status: "active",
              items: { create: [
                { productId: P.asado,     name: "Asado",            price: 8500, unitCost: 5800, quantity: 1.2, unit: "kg", emoji: "🥩" },
                { productId: P.costcerdo, name: "Costilla de cerdo", price: 5500, unitCost: 3700, quantity: 1.0, unit: "kg", emoji: "🐷" },
              ]},
            },
            // 10:30 ART
            {
              timestamp: new Date("2026-05-12T13:30:00Z"),
              total: 14500 * 0.3 + 5800 * 1.5,
              method: "transfer", itemCount: 2, status: "active",
              items: { create: [
                { productId: P.bife,    name: "Bife de chorizo",    price: 14500, unitCost: 9800, quantity: 0.3, unit: "kg", emoji: "🥩" },
                { productId: P.chorizo, name: "Chorizo parrillero", price: 5800,  unitCost: 3900, quantity: 1.5, unit: "kg", emoji: "🌭" },
              ]},
            },
            // 11:00 ART
            {
              timestamp: new Date("2026-05-12T14:00:00Z"),
              total: 3200 * 1.5,
              method: "cash", itemCount: 1, status: "active",
              items: { create: [
                { productId: P.pollo, name: "Pollo entero", price: 3200, unitCost: 2100, quantity: 1.5, unit: "kg", emoji: "🍗" },
              ]},
            },
            // 11:45 ART — fiado María García
            {
              timestamp: new Date("2026-05-12T14:45:00Z"),
              total: 7500 * 1.5,
              method: "fiado", itemCount: 1, status: "active",
              clientId: C.maria, clientName: "María García",
              items: { create: [
                { productId: P.molida, name: "Carne molida", price: 7500, unitCost: 5000, quantity: 1.5, unit: "kg", emoji: "🥩" },
              ]},
            },
            // 12:00 ART — CANCELADA
            {
              timestamp: new Date("2026-05-12T15:00:00Z"),
              total: 4500 * 2 + 3900 * 0.5,
              method: "cash", itemCount: 2,
              status: "cancelled",
              cancelledAt: new Date("2026-05-12T15:05:00Z"),
              cancelledById: adminUser.id,
              cancelReason: "Cliente cambió de opinión",
              items: { create: [
                { productId: P.hambur,   name: "Hamburguesas x4", price: 4500, unitCost: 2800, quantity: 2.0, unit: "un", emoji: "🍔" },
                { productId: P.salchicha, name: "Salchicha",      price: 3900, unitCost: 2600, quantity: 0.5, unit: "kg", emoji: "🌭" },
              ]},
            },
            // 14:00 ART — split
            {
              timestamp: new Date("2026-05-12T17:00:00Z"),
              total: 9500 * 2 + 6800,
              method: "split", itemCount: 2, status: "active",
              splits: { create: [
                { method: "cash",     amount: 16000 },
                { method: "transfer", amount: 9800  },
              ]},
              items: { create: [
                { productId: P.vacio,  name: "Vacío",  price: 9500, unitCost: 6500, quantity: 2.0, unit: "kg", emoji: "🥩" },
                { productId: P.paleta, name: "Paleta", price: 6800, unitCost: 4600, quantity: 1.0, unit: "kg", emoji: "🥩" },
              ]},
            },
          ],
        },
      },
    });

    // 14. ClientMovement para venta fiado de hoy (María García)
    // balance antes: 15000 (después de movimientos de abril)
    // + hoy 11250 → nuevo balance: 26250
    // Actualizamos también el campo balance del cliente
    await prisma.clientMovement.create({
      data: {
        clientId: C.maria,
        date: new Date("2026-05-12T14:45:00Z"),
        type: "sale",
        amount: 7500 * 1.5,
        balanceAfter: 15000 + 7500 * 1.5,
        description: "Carne molida 1.5kg (fiado)",
      },
    });
    await prisma.client.update({
      where: { id: C.maria },
      data: { balance: 15000 + 7500 * 1.5 },
    });

    // 15. Stock movements (compras + cancelación de hoy)
    await prisma.stockMovement.createMany({
      data: [
        { organizationId: ORG_ID, date: new Date("2026-05-06T14:00:00Z"), type: "purchase",     productId: P.vacio,     productName: "Vacío",              quantity: 30,  unit: "kg", supplier: "Frigorífico Norte S.A.", batch: "LT-050601" },
        { organizationId: ORG_ID, date: new Date("2026-05-06T14:00:00Z"), type: "purchase",     productId: P.asado,     productName: "Asado",              quantity: 15,  unit: "kg", supplier: "Frigorífico Norte S.A.", batch: "LT-050601" },
        { organizationId: ORG_ID, date: new Date("2026-05-06T14:00:00Z"), type: "purchase",     productId: P.bondiola,  productName: "Bondiola",           quantity: 20,  unit: "kg", supplier: "Frigorífico Norte S.A.", batch: "LT-050601" },
        { organizationId: ORG_ID, date: new Date("2026-05-06T14:00:00Z"), type: "purchase",     productId: P.costcerdo, productName: "Costilla de cerdo",  quantity: 15,  unit: "kg", supplier: "Frigorífico Norte S.A.", batch: "LT-050601" },
        { organizationId: ORG_ID, date: new Date("2026-05-11T09:00:00Z"), type: "purchase",     productId: P.pollo,     productName: "Pollo entero",       quantity: 40,  unit: "kg", supplier: "Avícola del Sur",        batch: "AV-051101" },
        { organizationId: ORG_ID, date: new Date("2026-05-11T09:00:00Z"), type: "purchase",     productId: P.muslos,    productName: "Muslos de pollo",    quantity: 25,  unit: "kg", supplier: "Avícola del Sur",        batch: "AV-051101" },
        { organizationId: ORG_ID, date: new Date("2026-05-12T15:05:00Z"), type: "cancellation", productId: P.hambur,    productName: "Hamburguesas x4",    quantity: 2,   unit: "un", note: "Cancelación de venta" },
        { organizationId: ORG_ID, date: new Date("2026-05-12T15:05:00Z"), type: "cancellation", productId: P.salchicha, productName: "Salchicha",          quantity: 0.5, unit: "kg", note: "Cancelación de venta" },
      ],
    });

    return NextResponse.json({
      ok: true,
      message: "Seed demo completado — Carnicería El Gaucho lista para demo comercial.",
      data: {
        email: adminEmail,
        orgId: ORG_ID,
        products: 15,
        clients: 4,
        suppliers: 2,
        purchases: 2,
        sessions: 2,
        salesYesterday: 6,
        salesToday: "6 (1 cancelada, 1 fiado, 1 split)",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
