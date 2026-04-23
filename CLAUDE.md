# CLAUDE.md — Contexto del proyecto RepairOS / TLAMATECH

> Este archivo se carga automáticamente al iniciar Claude Code en este repositorio.
> Mantenerlo actualizado para que cualquier nueva sesión arranque ya informada.
>
> Última actualización: 2026-04-22 (cierre de sesión)

---

## Perfil del usuario

**Tlami** (tlamatema@gmail.com) es técnico en electrónica y dueño de una microempresa llamada **TLAMATECH** dedicada a la reparación de módulos y dispositivos electrónicos.

- **Rubro actual:** laptops, consolas, GPUs
- **Planes de expansión:** módulos vehiculares, dispositivos médicos, venta de productos/accesorios
- **Idioma de trabajo:** Español
- **OS / Shell:** Windows, usa **CMD** (no PowerShell) para Node/Git
- **Ruta local (desktop):** `C:\Users\iFrogsMX\Documents\Proyectos Claude\PWA TlamaTech\repair-shop`
- **GitHub:** https://github.com/Tlamatinicast/repair-shop
- **Trabaja desde dos máquinas** (desktop + laptop) — el repo en GitHub siempre está actualizado; siempre hacer `git pull` al inicio de cada sesión antes de tocar cualquier archivo.

### Estilo de colaboración

- Prefiere **preguntas aclaratorias antes de implementar** en vez de que Claude asuma.
- Prefiere ver **contenido/textos propuestos** antes de codificarlos (ej. mensajes de WhatsApp).
- Respuestas en español, tono directo, sin exceso de formalismo.
- Workflow Git estándar: `git add .` → `git commit -m "descripción"` → `git push`.
- Siempre tener en cuenta **diseño mobile-first** — la app se usa como PWA en celular.

---

## Stack y arquitectura

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14.2.35 (App Router) + TypeScript + Tailwind CSS |
| Backend | Next.js API Routes (REST) |
| DB producción | **PostgreSQL** en Railway vía Prisma 5 |
| Auth | NextAuth.js + bcryptjs |
| PWA | next-pwa |
| Fotos | **Cloudinary** (cloud_name: dpd8cifms) |
| Extras | jspdf, qrcode, sharp |
| Hosting | **Railway** — https://repair-shop-production-c450.up.railway.app |

Dos roles: **Admin** y **Technician**. Flujo de estados de reparación:
`RECEIVED → DIAGNOSING → WAITING_PARTS → IN_REPAIR → READY → DELIVERED (o CANCELLED)`.

Estados de pago (`paymentStatus`): `PENDING → PARTIAL → PAID` (aplica tanto a `Repair` como a `Sale`).

### Estructura del repo

```
prisma/
  schema.prisma           # Modelos: Customer, Repair, InventoryItem, RepairPart,
                          #   RepairPhoto, RepairNote, RepairPayment, Sale, SaleItem,
                          #   SalePayment, RepairStatusLog, User, Setting
  migrations/             # Migraciones PostgreSQL
  seed.ts, seed.users.ts
src/
  app/
    api/                  # REST endpoints — todos requieren sesión
      repairs/[id]/       # route.ts, notes/, parts/, photos/,
                          #   payment/ (legacy — solo paymentStatus),
                          #   payments/ (POST nuevo + DELETE [paymentId] admin)
      sales/              # route.ts, [id]/(route.ts, payments/), stats/
      inventory/          # route.ts, [id]/, import/ (POST admin), export/ (GET admin)
      cash-close/         # export/ (GET admin) — corte de caja a Excel
      customers/, stats/, users/[id]/, auth/[...nextauth]/
      settings/           # GET (público) y PUT (admin) — clave/valor del negocio
    repairs/, customers/, inventory/, sales/, reports/, settings/, login/,
    corte-de-caja/        # vista admin con filtro de periodo + conciliación efectivo
  components/             # Sidebar, BottomNav, MobileHeader, BusinessSettingsContext,
                          #   InventoryImportButton, InventoryCategorySelect, ui/
  lib/                    # prisma.ts, auth.ts, authOptions.ts, cloudinary.ts, utils.ts,
                          #   businessSettings.ts (React.cache),
                          #   inventoryImport.ts (parser + CATEGORY_NORMALIZATION),
                          #   cashClose.ts (helpers timezone MX + agregaciones)
  types/
```

---

## Módulos completados (funcionando)

- **Dashboard** con estadísticas en tiempo real
- **Órdenes de reparación** — CRUD, filtros por estado, detalle con piezas, fotos y timeline
- **Clientes** — perfiles con historial y métricas
- **Inventario** — stock, alertas, categorías, cantidad reservada (`reservedQty`)
- **Auth** Admin / Technician — `id`, `role` y `name` en la sesión JWT
- **UI mobile-responsive** con bottom navigation
- **Tickets PDF** — ticket de entrada A4, ticket de entrega A4, etiqueta interna con QR
- **Fotos de evidencia** con compresión Sharp → Cloudinary
- **Timeline cronológico** con notas y múltiples fotos por nota (`photoUrls` JSON)
- **RepairWorkspace** — resumen de costos + estado de pago reactivo
- **Módulo de ventas / POS** — carrito, descuento, cancelación, historial de pagos (`SalePayment`)
- **Ventas ligadas a reparaciones** — se incluyen en el totalCost
- **Piezas reservadas** — se apartan del inventario sin descontar hasta confirmar uso
- **Crear cliente desde nueva venta o nueva orden** — tabs "Buscar / Nuevo"
- **Tiempos de servicio** — `queueDate`, `dueDate`, `partsEta`
- **RepairStatusLog** — duración automática por etapa
- **Seguridad** — todos los endpoints requieren sesión; DELETE requiere Admin
- **Gestión de usuarios** desde `/settings` — agregar, editar, desactivar y eliminar
- **Notificaciones WhatsApp** — botón en detalle de reparación, mensaje prellenado por estado
- **Configuración del negocio** (`/settings`) — nombre, teléfono y página/Facebook editables desde UI, guardados en tabla `Setting`. Se propagan a: tickets PDF, recibos de venta, sidebar, header móvil y login
- **Módulo de garantías** — selector por orden (No aplica / 30 días / 60 días naturales), badge de estado vigente/vencida/anulada, registro de regreso en garantía (agrega entrada al timeline con días usados/restantes y mueve status a IN_REPAIR), anulación por equipo alterado. Garantía en ticket de salida (inicio + vencimiento); eliminada del ticket de entrada.
- **Importador + exportador de inventario Excel** — UI inline en /inventory ("Exportar vista" respeta filtros activos `?q=&category=`). Backup completo + restauración viven en `/settings → Backup y restauración` (`src/app/settings/BackupSection.tsx`, con placeholders para Clientes/Reparaciones/Ventas). Importador soporta modos `create` (default) y `upsert` (sobrescribe existentes — para restaurar backup). Normalización hardcoded de categorías en `src/lib/inventoryImport.ts → CATEGORY_NORMALIZATION`. `INVENTORY_CATEGORIES` en `src/lib/utils.ts` ya tiene las 24 categorías reales. Default global de `minQuantity` ahora es `2`.
- **Pagos de reparaciones por evento (`RepairPayment`)** — espejo de `SalePayment`. Cada pago tiene amount + paymentMethod (CASH/CARD/TRANSFER/OTHER/UNKNOWN) + notes + createdAt. UI en `RepairWorkspace.tsx` reemplazó la edición directa del anticipo por: lista de pagos + botón "Agregar pago" (radios de método) + "Cobrar saldo" (precarga restante) + botón anular admin. `Repair.advancePayment` queda como total denormalizado.
- **Corte de caja** (`/corte-de-caja`, admin only) — presets Hoy/Ayer/Esta semana/Este mes + rango custom. Cards: Total recaudado, Ventas POS, Cobros reparaciones, # transacciones. Desglose por método con barras. Lista cronológica de movimientos (union SalePayment + RepairPayment). Helper de conciliación de efectivo (input físico vs registrado, no persiste). Export a .xlsx con dos hojas (Resumen + Movimientos) vía `GET /api/cash-close/export`. Item nuevo en Sidebar y BottomNav (admin only).

---

## Lecciones técnicas a preservar

1. **PowerShell bloquea npx** por execution policy — siempre usar **CMD**.
2. **Prisma 5 obligatorio:** `npm install prisma@5 @prisma/client@5`. Prisma 7 es incompatible.
3. **Comando de recuperación de dependencias:**
   ```
   npm install next-auth bcryptjs jspdf qrcode sharp
   npm install -D @types/bcryptjs @types/qrcode
   ```
4. **Dev local no tiene PostgreSQL activo** — `prisma db push` falla localmente. Para actualizar tipos después de cambiar el schema: `npx prisma generate`. Para migraciones de producción: crear SQL manualmente en `prisma/migrations/` y Railway lo aplica en el deploy con `prisma migrate deploy`.
5. **Todas las API routes que usan Prisma o sesión deben tener `export const dynamic = 'force-dynamic'`** — sin esto Next.js intenta pre-renderizarlas en el build y falla al no poder conectar con la DB.
6. **Totales reactivos:** NO usar `router.refresh()` para refrescar totales — Client Components calculan localmente y hacen fetch directo.
7. **Seed en Windows:** usar `tsconfig.seed.json` y `npx ts-node --project tsconfig.seed.json prisma/seed.ts`.
8. **Nunca `npm audit fix --force`** — rompe la compatibilidad de paquetes.
9. **Transacciones en Prisma:** mutaciones que tocan stock usan `prisma.$transaction(...)`.
10. **`paymentMethod` vive en `SalePayment`, NO en `Sale`** — usar `payments[0].paymentMethod` para mostrarlo.
11. **Reiniciar dev server tras `db push`** en Windows (EPERM por .dll bloqueado).
12. **`authOptions` NO puede exportarse desde `route.ts`** — vive en `src/lib/authOptions.ts`.
13. **`businessSettings.ts`** usa `React.cache()` para deduplicar queries por request — no llamar `prisma.setting.findMany` directamente en los componentes, siempre usar `getBusinessSettings()`.
14. **`LayoutShell.tsx`** es un componente legacy que aún existe — si se modifica `Sidebar`, recordar actualizar también `LayoutShell` (actualmente pasa `businessName=""`).
15. **Script de start en producción:** `prisma migrate deploy && next start`.
16. **Fotos:** Cloudinary (cloud: dpd8cifms). NO usar filesystem local en producción.
17. **Pagos como evento, no como total editable:** tanto `SalePayment` como `RepairPayment` son inmutables (insert + delete, no update). `amountPaid`/`advancePayment` son denormalizados (suma de pagos). Refunds/correcciones se hacen anulando el pago vía DELETE y registrando uno nuevo. NO recrear UI de "editar monto directo" — rompe el corte de caja.
18. **Timezone para corte de caja:** todo el cálculo de fechas en `src/lib/cashClose.ts` usa **America/Mexico_City (UTC-6 fijo)** porque MX ya no usa horario de verano desde 2022. Usar `rangeForPreset()` y `parseDateOrNull()` — no `new Date()` directo.
19. **xlsx + NextResponse:** `XLSX.write(wb, { type: 'buffer' })` devuelve `Buffer`, que TS no acepta como BodyInit. Envolver en `new Uint8Array(buffer)` antes de pasar a `NextResponse`.
20. **`exportHref` con filtros activos:** patrón ya usado en /inventory — construir `URLSearchParams` desde los `searchParams` de la página y pasarlo a un `<a href>` plano (no `<Link>`, para que el browser descargue sin interceptar).

---

## Estado actual al 2026-04-22 (cierre de sesión)

**Último commit en `main`:** `b9b4960 Corte de caja v1 + RepairPayment con metodo`

**Sesión cerró con:** importador + exportador de inventario funcionando en producción, RepairPayment migrado con backfill, UI de pagos de reparación rediseñada, módulo Corte de caja v1 desplegado, item nuevo en sidebar/bottom-nav. Tlami validó cada pieza en producción.

**En producción:** https://repair-shop-production-c450.up.railway.app  
**Credenciales demo:** admin@repaiross.com / admin123 · tecnico@repaiross.com / tecnico123

---

## 🔜 Próximo trabajo acordado — Backup de Clientes (sesión 2026-04-23)

**Objetivo:** replicar el patrón de export/import de Inventario al módulo de Clientes. Es el más simple porque la tabla `Customer` es plana (sin relaciones internas que importen para round-trip).

### Plan

1. **`GET /api/customers/export` (admin)** — .xlsx round-trip respetando query params del filtro (si los hay en /customers). Columnas mínimas: `Name | Phone | Email | Address | Notes` + cualquier otro campo del modelo `Customer`. Filename: `clientes-{businessSlug}-{YYYY-MM-DD}.xlsx`.
2. **`POST /api/customers/import` (admin, multipart, dryRun + transacción)** — modos `create` y `upsert`. ¿Por qué columna se hace el upsert? Probablemente `phone` (es lo más cercano a un identificador natural). Confirmar con Tlami antes.
3. **Activar fila "Clientes" en `src/app/settings/BackupSection.tsx`** — cambiar `exportHref: null` por la URL real y `importControl: null` por un componente análogo a `InventoryImportButton`.
4. **Decisión pendiente:** ¿el botón "Exportar" inline también va en `/customers` o solo el backup completo en /settings? Aplicar la regla: si hay un caso de uso real de "exportar lo que estoy filtrando", va inline. Si no, solo backup.

### Decisión ya tomada — NO hacer round-trip Excel para Reparaciones / Ventas

Para "backup real" de Reparaciones y Ventas, depender de los **snapshots automáticos de Postgres en Railway** (esos son el verdadero backup, ya nativos). Razón: estos modelos tienen tablas relacionadas (RepairPart, RepairPhoto, RepairNote, SaleItem, RepairPayment, SalePayment) que no caben en una hoja plana sin perder datos, y el restore desde multi-hoja es propenso a bugs por re-mapeo de FK.

Para reportes, el **Corte de caja** ya cubre el ángulo financiero. Si más adelante hace falta export operativo (lista de reparaciones del mes para el contador, ventas por técnico, etc.), agregar **export-only** en cada página correspondiente. Marcar las filas de Reparaciones/Ventas en `BackupSection.tsx` con texto que aclare que NO son backups completos sino reportes.

### Otros pendientes futuros

- **Reset de DB demo** — diferido. Se ejecutará cuando Tlami "lance" la página para uso definitivo. Falta decidir si conservar usuarios Admin/Technician o borrar todo.
- **6 items en BottomNav para admin** — vigilar si en el celular de Tlami se ve apretado tras agregar Corte de caja; si sí, considerar mover Corte solo a sidebar+settings y dejar bottom-nav solo con los 5 operativos.
- **Pagos históricos con método UNKNOWN** — los anticipos previos al 2026-04-22 quedaron como "No especificado" en el corte de caja porque el backfill no podía saber el método original. Es ruido aceptable; con el tiempo se diluye conforme entran pagos nuevos con método registrado.

### Decisiones de infraestructura tomadas (contexto, no urgentes)

- **Hosting:** quedarse en Railway. Los planes de Hostinger compartido (Single/Premium/Business/Cloud Startup) **no sirven** para Next.js/Prisma — son para WordPress. Hostinger VPS sería peor que Railway.
- **Dominio propio:** cuando Tlami quiera, comprar en **Cloudflare** (~MX$200/año) y apuntar a Railway. Sin urgencia.
- **Correo con dominio propio:** empezar con **Cloudflare Email Routing** gratis (reenvío a Gmail personal); migrar a Google Workspace solo cuando haya 2-3 empleados con buzones separados.
- **Impresión térmica (roadmap futuro):** Tlami ya tiene impresora térmica **80mm genérica con autocorte** + impresora normal tamaño carta. Quiere tickets de entrada y salida imprimibles en ambas. Para stickers con QR aún no tiene impresora de etiquetas; decisión de compra pendiente.

### Schema actual — modelo Setting

```prisma
model Setting {
  key   String @id
  value String
}
```

Keys usadas: `businessName`, `businessPhone`, `businessDomain`

### Demás modelos clave

- `Repair`: `advancePayment`, `paymentStatus`, `queueDate`, `dueDate`, `partsEta`, `isDefinedService`, `accessories`, `physicalCondition`, `clientSignature`, `warrantyType`, `warrantyVoided`, `warrantyVoidReason`, relaciones `sales`, `statusLogs`
- `User`: `id`, `name`, `email`, `password`, `role`, `active` — el `id` y `role` se incluyen en el JWT de sesión
- `Sale`: `amountPaid`, `paymentStatus`, relación `payments: SalePayment[]`
- `RepairNote`: `photoUrls: String?` (JSON array de URLs Cloudinary)

---

## Convenciones de código y UI

- **Paleta:** fondo negro (`#000–#111`), acentos en `amber-400/500`, textos en escalas de gris.
- **Componentes base:** `card`, `btn-primary`, `btn-secondary`, `btn-ghost`, `section-title`, `input`, `select`, `label`, `badge`.
- **Iconos:** `lucide-react` (tamaños 12–15).
- **Moneda:** `formatCurrency()` · **Fechas:** `formatDate()` — ambos en `@/lib/utils`.
- **Layout:** `MobileHeader` + `BottomNav` en mobile; `Sidebar` fijo en desktop.
- **Nombre del negocio en componentes cliente:** leer del contexto `useBusinessSettings()` de `@/components/BusinessSettingsContext`. En server components: usar `getBusinessSettings()` de `@/lib/businessSettings`.

---

## Roadmap — funciones pendientes

### De Samii
- [x] Módulo de garantías — folio con fecha de vencimiento al entregar
- [ ] Checklist de revisión/diagnóstico personalizable por orden
- [ ] Statuses de reparación personalizables (no fijos en código)
- [ ] Módulo de proveedores
- [ ] Control de gastos fijos y variables (renta, luz, sueldos, etc.)
- [ ] Órdenes de compra de inventario
- [ ] Impresión térmica y stickers
- [ ] Módulo de finanzas (balance general)

### De SpotsPOS
- [ ] Roles más granulares (Gerente, Contable, Empleado)
- [ ] Gestor de empleados (checadas, horarios, desempeño)
- [ ] Multi-sucursal
- [ ] Análisis de horas pico y reportes avanzados con gráficas

### Independientes (propias de TLAMATECH)
- [x] Importación de inventario desde Excel — funcionando con 96 refacciones reales
- [x] Exportación a Excel para inventario — round-trip completo, respeta filtros
- [x] Sección de backup centralizada en /settings (placeholders para módulos restantes)
- [x] Pagos de reparación con método (RepairPayment + UI rediseñada)
- [x] Corte de caja v1 (vista en vivo con desglose por método y conciliación)
- [ ] Backup de Clientes (siguiente — 2026-04-23)
- [ ] Export-only para reportes operativos de Reparaciones/Ventas (pendiente, decidir cuándo se necesite)
- [ ] DB limpia sin datos demo para producción
- [ ] Expansión de `deviceType` para módulos vehiculares y dispositivos médicos
- [ ] Cierre de caja persistente (Corte de caja v2: registros históricos `CashClose` con snapshot de totales y conteo físico — diferido hasta validar v1 con uso real)

---

## Comandos útiles

```cmd
REM Entrar al proyecto (¡comillas por los espacios!)
cd "C:\Users\iFrogsMX\Documents\Proyectos Claude\PWA TlamaTech\repair-shop"

REM Actualizar desde GitHub (hacer SIEMPRE al inicio de sesión)
git pull origin main

REM Iniciar dev server
npm run dev

REM Regenerar cliente Prisma tras cambiar schema
npx prisma generate

REM Cargar datos demo
npm run db:seed

REM Build de producción
npm run build
```
