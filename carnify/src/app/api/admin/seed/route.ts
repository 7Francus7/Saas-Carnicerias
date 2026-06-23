import { NextResponse } from "next/server";

// ⚠️ NEUTRALIZADO INTENCIONALMENTE — NO RESTAURAR LA LÓGICA DE SEED.
//
// Este endpoint hacía `TRUNCATE` de TODAS las tablas (datos reales de clientes).
// La base de Neon es producción única; un único GET con el secret filtrado
// borraba todo. Ya hubo un incidente cercano con scripts/seed-admin.ts.
//
// Se eliminó por completo el path de borrado: este handler ya no importa prisma,
// no tiene acceso a la DB y no puede truncar ni escribir nada bajo ningún escenario.
// Si en el futuro se necesita poblar datos demo, hacerlo con un script local
// apuntado a un tenant/branch descartable — NUNCA contra la DB de producción.

export async function GET() {
  return NextResponse.json(
    { error: "Endpoint deshabilitado permanentemente." },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Endpoint deshabilitado permanentemente." },
    { status: 410 }
  );
}
