# CLAUDE.md — Contexto del proyecto RepairOS / TLAMATECH

> Este archivo se carga automáticamente al iniciar Claude Code en este repositorio.
> Mantenerlo actualizado para que cualquier nueva sesión arranque ya informada.
>
> Última actualización: 2026-04-16

---

## Perfil del usuario

**Tlami** (tlamatema@gmail.com) es técnico en electrónica y dueño de una microempresa llamada **TLAMATECH** dedicada a la reparación de módulos y dispositivos electrónicos.

- **Rubro actual:** laptops, consolas, GPUs
- **Planes de expansión:** módulos vehiculares, dispositivos médicos, venta de productos/accesorios
- **Idioma de trabajo:** Español
- **OS / Shell:** Windows, usa **CMD** (no PowerShell) para Node/Git
- **Ruta local:** `C:\Users\iFrogsMX\Documents\Proyectos Claude\PWA TlamaTech\repair-shop` (la ruta contiene espacios — en terminal siempre encerrarla entre comillas dobles)
- **GitHub:** https://github.com/Tlamatinicast/repair-shop

### Estilo de colaboración

- Prefiere **preguntas aclaratorias antes de implementar** en vez de que Claude asuma.
- Prefiere recibir **ZIPs de archivos modificados** en vez de copiar código manualmente cuando los cambios son extensos.
- Respuestas en español, tono directo, sin exceso de formalismo.
- Workflow Git estándar: `git add .` → `git commit -m "descripción"` → `git push`.

---

## Stack y arquitectura

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Backend | Next.js API Routes (REST) |
| DB | SQLite vía **Prisma 5** (Prisma 7 rompe el schema actual) |
| Auth | NextAuth.js + bcryptjs |
| PWA | next-pwa |
| Extras | jspdf, qrcode, sharp |

Dos roles: **Admin** y **Technician**. Flujo de estados de reparación:
`RECEIVED → DIAGNOSING → WAITING_PARTS → IN_REPAIR → READY → DELIVERED (o CANCELLED)`.

### Estructura del repo

```
prisma/
  schema.prisma           # Modelos (Customer, Repair, InventoryItem, RepairPart,
                          #          RepairPhoto, RepairNote, Sale, SaleItem, User)
  seed.ts, seed.users.ts
  dev.db                  # SQLite local
src/
  app/
    api/                  # REST endpoints
      repairs/[id]/       # route.ts, notes/, parts/, payment/, photos/
      sales/              # route.ts, [id]/, stats/
      customers/, inventory/, stats/, users/, auth/[...nextauth]/
    repairs/, customers/, inventory/, sales/, reports/, settings/, login/
  components/             # Sidebar, BottomNav, MobileHeader, ui/
  lib/                    # prisma.ts, auth.ts, utils.ts
  types/
```

---

## Módulos completados (funcionando)

- **Dashboard** con estadísticas en tiempo real
- **Órdenes de reparación** — CRUD, filtros por estado, detalle con piezas, fotos y timeline
- **Clientes** — perfiles con historial y métricas, protección de edición/borrado
- **Inventario** — stock, alertas de stock bajo, categorías, **cantidad reservada** (`reservedQty`)
- **Auth** Admin / Technician
- **UI mobile-responsive** con bottom navigation
- **Tickets PDF** — A4 para cliente + etiqueta interna con QR
- **Fotos de evidencia** con compresión Sharp
- **Timeline cronológico** con notas y múltiples fotos por nota (`photoUrls` JSON)
- **Resumen de costos + estado de pago** fusionado en un panel reactivo (`RepairWorkspace`)
- **Módulo de ventas / POS** — `/sales` con filtro por día, carrito, descuento, métodos de pago, cancelación que restaura stock
- **Ventas ligadas a reparaciones** — se incluyen en el totalCost de la orden
- **Piezas reservadas** — se apartan del inventario sin descontar hasta confirmar uso

---

## Lecciones técnicas a preservar

1. **PowerShell bloquea npx** por execution policy — siempre usar **CMD**, o ajustar la política explícitamente.
2. **Prisma 5 obligatorio:** `npm install prisma@5 @prisma/client@5`. Prisma 7 es incompatible con el schema actual.
3. **Comando de recuperación de dependencias:**
   ```
   npm install next-auth bcryptjs jspdf qrcode sharp
   npm install -D @types/bcryptjs @types/qrcode
   ```
4. **Git + node_modules:** el `.gitignore` debe incluir `node_modules/`, `.next/`, `*.db`, `.env`, `public/uploads/` **antes** del primer commit. Si se olvidó, borrar `.git`, crear `.gitignore` y reinicializar.
5. **Totales reactivos:** NO usar `router.refresh()` para refrescar totales — se implementa con Client Components que calculan localmente a partir del estado (`partsTotal + salesTotal + laborCost`) y hacen fetch directo al actualizar.
6. **Seed en Windows:** usar `tsconfig.seed.json` dedicado y correr `npx ts-node --project tsconfig.seed.json prisma/seed.ts` (evita problemas de comillas en JSON dentro de CMD).
7. **Nunca `npm audit fix --force`** — rompe la compatibilidad de paquetes.
8. **Evitar edits tipo `sed`** en Windows — pueden corromper imports. Preferir reescritura completa del archivo.
9. **Transacciones en Prisma:** las mutaciones que tocan stock (agregar pieza, confirmar reserva, borrar pieza, crear venta, cancelar venta) están envueltas en `prisma.$transaction(...)` para mantener consistencia entre `RepairPart`, `InventoryItem.quantity`, `InventoryItem.reservedQty` y `Repair.totalCost`.

---

## Estado actual al 2026-04-16

**Último commit en `main`:** `0dc67e4 Historial de actividad con notas y fotos en órdenes`.

Hay **cambios pendientes de commitear** correspondientes al módulo de ventas, pagos y reservas (hechos en sesiones anteriores de Cowork). Aproximadamente 1,127 líneas añadidas y 735 borradas.

### Archivos modificados sin commit

```
next-env.d.ts
prisma/schema.prisma
src/app/api/repairs/[id]/notes/route.ts
src/app/api/repairs/[id]/route.ts
src/app/api/repairs/route.ts
src/app/repairs/[id]/RepairTimeline.tsx
src/app/repairs/[id]/TicketButtons.tsx
src/app/repairs/[id]/UpdateStatusForm.tsx
src/app/repairs/[id]/edit/page.tsx
src/app/repairs/[id]/page.tsx
src/app/repairs/new/page.tsx
src/components/BottomNav.tsx
src/components/Sidebar.tsx
```

### Archivos nuevos sin trackear

```
src/app/api/repairs/[id]/parts/route.ts
src/app/api/repairs/[id]/payment/route.ts
src/app/api/sales/route.ts
src/app/api/sales/[id]/route.ts
src/app/api/sales/stats/route.ts
src/app/repairs/[id]/CostSummary.tsx      ← posible duplicado, revisar
src/app/repairs/[id]/PaymentStatus.tsx    ← posible duplicado, revisar
src/app/repairs/[id]/RepairPanel.tsx      ← duplicado de RepairWorkspace, revisar
src/app/repairs/[id]/RepairParts.tsx      ← posible duplicado, revisar
src/app/repairs/[id]/RepairSales.tsx      ← posible duplicado, revisar
src/app/repairs/[id]/RepairWorkspace.tsx  ← ESTE es el que se usa en page.tsx
src/app/sales/page.tsx
src/app/sales/new/page.tsx
src/app/sales/DateFilter.tsx
src/app/sales/[id]/page.tsx
src/app/sales/[id]/CancelSaleButton.tsx
src/app/sales/[id]/SaleReceiptButton.tsx
```

### Cambios de schema (vs el último commit)

- `Repair` ganó `advancePayment: Float` y `paymentStatus: String` (default "PENDING"), y relación `sales: Sale[]`.
- `Customer` ganó relación `sales: Sale[]`.
- `InventoryItem` ganó `reservedQty: Int` y relación `saleItems: SaleItem[]`.
- `RepairPart` ganó `reserved: Boolean` (piezas apartadas).
- `RepairNote` ganó `photoUrls: String?` (JSON array para múltiples fotos; `photoUrl` queda como legacy).
- **Nuevos modelos:** `Sale` (saleNumber, customerId?, repairId?, items, subtotal, discount, total, paymentMethod, notes) y `SaleItem`.

La DB local `prisma/dev.db` ya tiene datos reales de prueba y está sincronizada (ya corriste `npm run db:push`).

---

## Convenciones de código y UI

- **Paleta:** fondo negro (`#000–#111`), acentos en `amber-400/500`, textos en escalas de gris (`#ccc`, `#888`, `#555`).
- **Componentes base:** clases utilitarias `card`, `btn-primary`, `btn-secondary`, `btn-ghost`, `section-title`, `input`, `select`, `label`, `badge`.
- **Iconos:** `lucide-react` (tamaños comunes: 12–15).
- **Moneda:** MXN vía `formatCurrency()` de `@/lib/utils`.
- **Fechas:** vía `formatDate()` de `@/lib/utils`.
- **Layout:** `MobileHeader` + `BottomNav` en mobile; sidebar fijo en desktop.

---

## Próximos pasos sugeridos (del README + análisis)

- [ ] Commitear el trabajo pendiente del módulo de ventas, pagos y reservas
- [ ] Limpiar componentes duplicados en `src/app/repairs/[id]/` (dejar solo `RepairWorkspace.tsx`)
- [ ] Notificaciones al cliente (WhatsApp / SMS) al cambiar de estado
- [ ] Módulo de garantías
- [ ] Expansión de `deviceType` para módulos vehiculares y dispositivos médicos
- [ ] Reportes avanzados con gráficas
- [ ] Exportación a CSV / Excel
- [ ] Gestión de empleados y roles más granular

---

## Comandos útiles

```cmd
REM Entrar al proyecto (¡comillas por los espacios!)
cd "C:\Users\iFrogsMX\Documents\Proyectos Claude\PWA TlamaTech\repair-shop"

REM Iniciar dev server
npm run dev

REM Sincronizar schema a la DB
npm run db:push

REM Cargar datos demo
npm run db:seed

REM Abrir Prisma Studio
npm run db:studio

REM Build de producción
npm run build
```
