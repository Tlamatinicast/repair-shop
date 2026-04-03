# RepairOS 🔧

Sistema de gestión para talleres de reparación de dispositivos electrónicos. PWA construida con Next.js 14, Prisma y SQLite.

## Stack tecnológico

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes (REST)
- **Base de datos**: SQLite vía Prisma ORM
- **PWA**: next-pwa (instalable en iOS/Android/Desktop)

## Módulos incluidos

| Módulo | Descripción |
|---|---|
| Dashboard | Estadísticas en tiempo real, órdenes recientes, acciones rápidas |
| Reparaciones | CRUD completo de órdenes, filtros por estado, detalle con piezas |
| Clientes | Perfiles, historial de reparaciones, métricas por cliente |
| Inventario | Control de stock, alertas de stock bajo, categorías |
| Reportes | Ingresos, top dispositivos, métricas generales |

## Instalación rápida

```bash
# 1. Instalar dependencias
npm install

# 2. Crear la base de datos y las tablas
npm run db:push

# 3. Cargar datos de demo (opcional)
npm run db:seed

# 4. Iniciar el servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Estructura del proyecto

```
src/
├── app/
│   ├── api/                  # API REST
│   │   ├── repairs/          # GET/POST /api/repairs
│   │   ├── customers/        # GET/POST /api/customers
│   │   ├── inventory/        # GET/POST /api/inventory
│   │   └── stats/            # GET /api/stats
│   ├── repairs/              # Páginas de reparaciones
│   ├── customers/            # Páginas de clientes
│   ├── inventory/            # Páginas de inventario
│   ├── reports/              # Reportes
│   ├── layout.tsx            # Layout raíz con sidebar
│   └── page.tsx              # Dashboard
├── components/
│   ├── Sidebar.tsx
│   └── ui/StatusBadge.tsx
└── lib/
    ├── prisma.ts             # Cliente Prisma
    └── utils.ts              # Constantes y utilidades
prisma/
├── schema.prisma             # Modelos de BD
└── seed.ts                   # Datos de demo
```

## Estados de reparación

```
RECEIVED → DIAGNOSING → WAITING_PARTS → IN_REPAIR → READY → DELIVERED
                                                           ↘ CANCELLED
```

## Próximas funciones planeadas

- [ ] Subida de fotos/evidencias en órdenes
- [ ] Notificaciones push al cliente por WhatsApp/SMS
- [ ] Generación de tickets PDF para imprimir
- [ ] Módulo de ventas de productos/accesorios
- [ ] Gestión de empleados y roles
- [ ] Módulo de garantías
- [ ] Soporte para módulos vehiculares y dispositivos médicos
- [ ] Reportes avanzados con gráficas
- [ ] Exportación a CSV/Excel
