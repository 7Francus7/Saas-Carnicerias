import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

const DEFAULT_PRODUCTS = [
  { plu: "001", name: "Carne Molida", category: "carne", emoji: "🥩", price: 2500, unit: "kg" as const },
  { plu: "002", name: "Bife Ancho", category: "carne", emoji: "🥩", price: 3200, unit: "kg" as const },
  { plu: "003", name: "Costilla", category: "carne", emoji: "🥩", price: 1800, unit: "kg" as const },
  { plu: "004", name: "Chorizo", category: "embutidos", emoji: "🌭", price: 2200, unit: "kg" as const },
  { plu: "005", name: "Morcilla", category: "embutidos", emoji: "🌭", price: 1900, unit: "kg" as const },
  { plu: "006", name: "Salchicha", category: "embutidos", emoji: "🌭", price: 1500, unit: "kg" as const },
  { plu: "007", name: "Pollo Entero", category: "pollo", emoji: "🍗", price: 1400, unit: "kg" as const },
  { plu: "008", name: "Pechuga", category: "pollo", emoji: "🍗", price: 1800, unit: "kg" as const },
  { plu: "009", name: "Alas", category: "pollo", emoji: "🍗", price: 900, unit: "kg" as const },
  { plu: "010", name: "Patas", category: "pollo", emoji: "🍗", price: 600, unit: "kg" as const },
  { plu: "011", name: "Hueso", category: "pollo", emoji: "🍗", price: 400, unit: "kg" as const },
];

export async function POST(req: NextRequest) {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    if (!session?.session?.activeOrganizationId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const orgId = session.session.activeOrganizationId;
    await prisma.product.createMany({
      data: DEFAULT_PRODUCTS.map((p) => ({ ...p, organizationId: orgId })),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}