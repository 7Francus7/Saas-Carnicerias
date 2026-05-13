import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

const DEFAULT_PRODUCTS = [
  { plu: "001", name: "Carne molida",        category: "vacuno",    emoji: "🥩", price: 7500,  unit: "kg" as const },
  { plu: "002", name: "Vacío",               category: "vacuno",    emoji: "🥩", price: 9500,  unit: "kg" as const },
  { plu: "003", name: "Asado",               category: "vacuno",    emoji: "🥩", price: 8500,  unit: "kg" as const },
  { plu: "004", name: "Paleta",              category: "vacuno",    emoji: "🥩", price: 6800,  unit: "kg" as const },
  { plu: "005", name: "Chorizo parrillero",  category: "embutidos", emoji: "🌭", price: 5800,  unit: "kg" as const },
  { plu: "006", name: "Morcilla",            category: "embutidos", emoji: "🌭", price: 4200,  unit: "kg" as const },
  { plu: "007", name: "Salchicha",           category: "embutidos", emoji: "🌭", price: 3900,  unit: "kg" as const },
  { plu: "008", name: "Pollo entero",        category: "pollo",     emoji: "🍗", price: 3200,  unit: "kg" as const },
  { plu: "009", name: "Muslos de pollo",     category: "pollo",     emoji: "🍗", price: 3800,  unit: "kg" as const },
  { plu: "010", name: "Hamburguesas x4",     category: "elaborados",emoji: "🍔", price: 4500,  unit: "un" as const },
  { plu: "011", name: "Milanesa de cerdo",   category: "elaborados",emoji: "🍖", price: 8900,  unit: "kg" as const },
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