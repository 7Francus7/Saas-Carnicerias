import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { auth } from '../src/lib/auth';

async function seed() {
  // GUARDA: este script BORRA todas las cuentas (user/session/account/verification).
  // Solo corre el TRUNCATE si se pide explícito con --reset o SEED_RESET=1, para
  // evitar wipes accidentales sobre una DB con cuentas reales.
  const wantsReset = process.argv.includes('--reset') || process.env.SEED_RESET === '1';
  if (wantsReset) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "user", "session", "verification", "account" RESTART IDENTITY CASCADE`);
    console.warn('⚠️  TRUNCATE ejecutado: todas las cuentas fueron borradas.');
  } else {
    const existing = await prisma.user.findFirst({ where: { email: 'dellorsif@gmail.com' } });
    if (existing) {
      console.log('Admin ya existe, nada que hacer. (Usá --reset para recrear desde cero — BORRA cuentas)');
      return;
    }
  }

  const result = await auth.api.signUpEmail({
    body: { name: 'Francesco (Admin)', email: 'dellorsif@gmail.com', password: 'Admin1234!' },
  });

  await prisma.user.update({
    where: { email: 'dellorsif@gmail.com' },
    data: { role: 'admin' },
  });

  console.log('Admin created:', result.user?.email);
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });