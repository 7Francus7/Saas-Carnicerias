import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { auth } from '../src/lib/auth';

async function seed() {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "user", "session", "verification", "account" RESTART IDENTITY CASCADE`);

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