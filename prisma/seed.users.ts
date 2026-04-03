import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@repaiross.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@repaiross.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  // Create demo technician
  const techPassword = await bcrypt.hash('tecnico123', 12);
  await prisma.user.upsert({
    where: { email: 'tecnico@repaiross.com' },
    update: {},
    create: {
      name: 'Técnico Demo',
      email: 'tecnico@repaiross.com',
      password: techPassword,
      role: 'TECHNICIAN',
    },
  });

  console.log('Usuarios creados:');
  console.log('  Admin:   admin@repaiross.com   / admin123');
  console.log('  Tecnico: tecnico@repaiross.com / tecnico123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
