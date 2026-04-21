import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const SEED_SECRET = "carnify-reset-2026";
const ADMIN_EMAIL = "dellorsif@gmail.com";
const ADMIN_PASSWORD = "Admin1234!";
const ADMIN_NAME = "Franco (Admin)";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== SEED_SECRET) {
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

    // 2. Create admin user via Better Auth
    const result = await auth.api.signUpEmail({
      body: { name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });

    // 3. Promote to admin role
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { role: "admin" },
    });

    return NextResponse.json({
      ok: true,
      message: "Base de datos limpia. Cuenta admin creada.",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
