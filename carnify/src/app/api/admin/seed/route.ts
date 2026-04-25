import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No disponible en producción" }, { status: 404 });
  }

  const seedSecret = process.env.ADMIN_SEED_SECRET;
  const adminEmail = process.env.ADMIN_SEED_EMAIL;
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  const adminName = process.env.ADMIN_SEED_NAME ?? "Carnify Admin";

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

    await auth.api.signUpEmail({
      body: { name: adminName, email: adminEmail, password: adminPassword },
    });

    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: "admin" },
    });

    return NextResponse.json({
      ok: true,
      message: "Base de datos limpia. Cuenta admin creada.",
      email: adminEmail,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
