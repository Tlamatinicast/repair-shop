import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.repairPart.deleteMany();
  await prisma.repair.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  await prisma.user.create({
    data: { name: 'Administrador', email: 'admin@taller.com', password: adminPassword, role: 'ADMIN' },
  });

  const techPassword = await bcrypt.hash('tecnico123', 12);
  await prisma.user.create({
    data: { name: 'Técnico Demo', email: 'tecnico@taller.com', password: techPassword, role: 'TECHNICIAN' },
  });

  // Customers
  const customers = await Promise.all([
    prisma.customer.create({ data: { name: 'Carlos Mendoza', email: 'carlos@gmail.com', phone: '9991234567', address: 'Calle 20 #150, Mérida' } }),
    prisma.customer.create({ data: { name: 'Sofía Ramírez', email: 'sofia.r@hotmail.com', phone: '9997654321' } }),
    prisma.customer.create({ data: { name: 'Juan Pablo Torres', phone: '9994561234', address: 'Col. García Ginerés' } }),
    prisma.customer.create({ data: { name: 'Valeria Castillo', email: 'vale.castillo@gmail.com', phone: '9998765432' } }),
  ]);

  // Inventory
  const items = await Promise.all([
    prisma.inventoryItem.create({ data: { name: 'Pantalla LCD MacBook Pro 13"', sku: 'SCR-MBP13-LCD', quantity: 3, minQuantity: 1, costPrice: 1800, salePrice: 2800, category: 'Pantallas', location: 'Cajón A1' } }),
    prisma.inventoryItem.create({ data: { name: 'Batería MacBook Pro 2019', sku: 'BAT-MBP19', quantity: 5, minQuantity: 2, costPrice: 650, salePrice: 1200, category: 'Baterías', location: 'Cajón A2' } }),
    prisma.inventoryItem.create({ data: { name: 'Pasta Térmica Kryonaut 1g', sku: 'PT-KRYO-1G', quantity: 12, minQuantity: 3, costPrice: 80, salePrice: 180, category: 'Consumibles', location: 'Cajón B1' } }),
    prisma.inventoryItem.create({ data: { name: 'SSD NVMe 500GB Samsung 980', sku: 'SSD-SAM980-500', quantity: 4, minQuantity: 2, costPrice: 900, salePrice: 1400, category: 'Almacenamiento', location: 'Cajón C1' } }),
    prisma.inventoryItem.create({ data: { name: 'Ventilador PS5 Sony Original', sku: 'FAN-PS5-OEM', quantity: 2, minQuantity: 1, costPrice: 420, salePrice: 750, category: 'Consolas', location: 'Cajón D1' } }),
    prisma.inventoryItem.create({ data: { name: 'GPU RTX 3060 Condensadores', sku: 'CAP-RTX3060-SET', quantity: 8, minQuantity: 2, costPrice: 150, salePrice: 300, category: 'GPU', location: 'Cajón E1' } }),
  ]);

  const now = new Date();
  const d = (days: number) => new Date(now.getTime() - days * 86400000);

  await Promise.all([
    prisma.repair.create({ data: { ticketNumber: 'TK-0001', status: 'IN_REPAIR', customerId: customers[0].id, deviceType: 'Laptop', deviceBrand: 'Apple', deviceModel: 'MacBook Pro 13" 2020', issue: 'No enciende, daño por líquido', diagnosis: 'Corrosión en placa lógica', diagnosisFee: 800, totalCost: 1580, createdAt: d(3), parts: { create: [{ itemId: items[2].id, quantity: 1, unitPrice: 180 }, { itemId: items[1].id, quantity: 1, unitPrice: 600 }] } } }),
    prisma.repair.create({ data: { ticketNumber: 'TK-0002', status: 'READY', customerId: customers[1].id, deviceType: 'Consola', deviceBrand: 'Sony', deviceModel: 'PlayStation 5', issue: 'Sobrecalentamiento', diagnosis: 'Ventilador obstruido + pasta térmica degradada', diagnosisFee: 350, totalCost: 1280, createdAt: d(5), parts: { create: [{ itemId: items[4].id, quantity: 1, unitPrice: 750 }, { itemId: items[2].id, quantity: 1, unitPrice: 180 }] } } }),
    prisma.repair.create({ data: { ticketNumber: 'TK-0003', status: 'WAITING_PARTS', customerId: customers[2].id, deviceType: 'GPU', deviceBrand: 'NVIDIA', deviceModel: 'RTX 3060 Ti', issue: 'Artefactos en pantalla', diagnosisFee: 600, totalCost: 600, createdAt: d(1) } }),
    prisma.repair.create({ data: { ticketNumber: 'TK-0004', status: 'RECEIVED', customerId: customers[3].id, deviceType: 'Laptop', deviceBrand: 'Dell', deviceModel: 'XPS 15 9500', issue: 'Pantalla parpadeante', diagnosisFee: 0, totalCost: 0, createdAt: d(0) } }),
    prisma.repair.create({ data: { ticketNumber: 'TK-0005', status: 'DELIVERED', customerId: customers[0].id, deviceType: 'Laptop', deviceBrand: 'Lenovo', deviceModel: 'ThinkPad X1 Carbon', issue: 'Batería no carga', diagnosis: 'Batería agotada', diagnosisFee: 200, totalCost: 1400, createdAt: d(10), deliveredAt: d(7), parts: { create: [{ itemId: items[1].id, quantity: 1, unitPrice: 1200 }] } } }),
  ]);

  console.log('Seed completado.');
  console.log('Admin:   admin@taller.com / admin123');
  console.log('Tecnico: tecnico@taller.com / tecnico123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
