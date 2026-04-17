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
- Siempre tener en cuenta **diseño mobile-first** — la app se usa como PWA en celular.

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

Estados de pago (`paymentStatus`): `PENDING → PARTIAL → PAID` (aplica tanto a `Repair` como a `Sale`).

### Estructura del repo

```
prisma/
  schema.prisma           # Modelos (Customer, Repair, InventoryItem, RepairPart,
                          #          RepairPhoto, RepairNote, Sale, SaleItem,
                          #          SalePayment, User)
  seed.ts, seed.users.ts
  dev.db                  # SQLite local
src/
  app/
    api/                  # REST endpoints
      repairs/[id]/       # route.ts, notes/, parts/, payment/, photos/
      sales/              # route.ts, [id]/(route.ts, payments/), stats/
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
  - Lista ordenada por `id desc` (más nueva primero)
  - Badge de estado de pago (`Liquidado / Anticipo / Pendiente`) en cada fila
- **Clientes** — perfiles con historial y métricas, protección de edición/borrado
- **Inventario** — stock, alertas de stock bajo, categorías, **cantidad reservada** (`reservedQty`)
- **Auth** Admin / Technician
- **UI mobile-responsive** con bottom navigation
- **Tickets PDF** — A4 para cliente + etiqueta interna con QR
- **Fotos de evidencia** con compresión Sharp
- **Timeline cronológico** con notas y múltiples fotos por nota (`photoUrls` JSON)
- **Resumen de costos + estado de pago** fusionado en un panel reactivo (`RepairWorkspace`)
- **Módulo de ventas / POS** — `/sales` con filtro por día, carrito, descuento, cancelación que restaura stock
  - Soporte de **pago total o anticipo** al crear la venta (monto inicial requerido ≥ $0.01)
  - **Historial de pagos** por venta (`SalePayment`) con monto, método y fecha
  - Endpoint `POST /api/sales/[id]/payments` para registrar abonos posteriores
  - Badge de estado de pago en detalle de venta
- **Ventas ligadas a reparaciones** — se incluyen en el totalCost de la orden
- **Piezas reservadas** — se apartan del inventario sin descontar hasta confirmar uso
- **Crear cliente desde nueva venta** — tab "Buscar / Nuevo" en sección Cliente del POS

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
10. **`paymentMethod` vive en `SalePayment`, NO en `Sale`** — al migrar se eliminó el campo directo. Para mostrar método en listas usar `payments[0].paymentMethod`. El `groupBy` de stats debe hacerse sobre `prisma.salePayment`, no `prisma.sale`.
11. **Reiniciar dev server tras `db push`** en Windows — el cliente Prisma regenerado no puede sobrescribir el `.dll` bloqueado por el proceso activo. Ctrl+C + `npm run dev` resuelve el `EPERM`.
12. **Orden de listas:** usar `orderBy: { id: 'desc' }` en lugar de `createdAt` cuando hay datos de seed (mismos timestamps causan orden inconsistente).

---

## Estado actual al 2026-04-16

**Último commit en `main`:** `e760a53 Eliminar componentes duplicados en repairs/[id]`

Todo el trabajo de la sesión está **pendiente de commitear**:
- Pagos parciales / anticipo en ventas (`SalePayment`, `amountPaid`, `paymentStatus`)
- Crear cliente desde nueva venta (tabs Buscar / Nuevo)
- Badge de estado de pago en lista de órdenes
- Orden de lista de órdenes por `id desc`
- Fix badge de roles en `/settings` (mobile)
- Schema sincronizado con `db push`

### Schema actual (modelos clave)

- `Repair`: `advancePayment`, `paymentStatus` (PENDING/PARTIAL/PAID), relación `sales`
- `Sale`: `amountPaid`, `paymentStatus` (PENDING/PARTIAL/PAID), relación `payments: SalePayment[]`
- `SalePayment`: `saleId`, `amount`, `paymentMethod`, `notes`, `createdAt`
- `InventoryItem`: `reservedQty`, relación `saleItems`
- `RepairPart`: `reserved: Boolean`
- `RepairNote`: `photoUrls: String?` (JSON array; `photoUrl` legacy)

---

## Convenciones de código y UI

- **Paleta:** fondo negro (`#000–#111`), acentos en `amber-400/500`, textos en escalas de gris (`#ccc`, `#888`, `#555`).
- **Componentes base:** clases utilitarias `card`, `btn-primary`, `btn-secondary`, `btn-ghost`, `section-title`, `input`, `select`, `label`, `badge`.
- **Iconos:** `lucide-react` (tamaños comunes: 12–15).
- **Moneda:** MXN vía `formatCurrency()` de `@/lib/utils`.
- **Fechas:** vía `formatDate()` de `@/lib/utils`.
- **Layout:** `MobileHeader` + `BottomNav` en mobile; sidebar fijo en desktop.
- **Tabs de alternancia:** patrón `bg-[#0a0a0a] rounded-lg p-1` con botones internos `bg-[#1a1a1a] text-amber-400` para el activo.

---

## Próximos pasos sugeridos

- [ ] Notificaciones al cliente (WhatsApp / SMS) al cambiar de estado de reparación
- [ ] Módulo de garantías — folio con fecha de vencimiento al entregar equipo
- [ ] Expansión de `deviceType` para módulos vehiculares y dispositivos médicos
- [ ] Reportes avanzados con gráficas (ingresos por semana/mes, por tipo de dispositivo)
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
