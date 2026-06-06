# CLAUDE.md — Contexto del proyecto RepairOS / TLAMATECH

> Este archivo se carga automáticamente al iniciar Claude Code en este repositorio.
> Mantenerlo actualizado para que cualquier nueva sesión arranque ya informada.
>
> Última actualización: 2026-06-05

---

## Perfil del usuario

**Tlami** (tlamatema@gmail.com) es técnico en electrónica y dueño de una microempresa llamada **TLAMATECH** dedicada a la reparación de módulos y dispositivos electrónicos.

- **Rubro actual:** laptops, consolas, GPUs
- **Planes de expansión:** módulos vehiculares, dispositivos médicos, venta de productos/accesorios
- **Idioma de trabajo:** Español
- **OS / Shell:** Windows, usa **CMD** (no PowerShell) para Node/Git
- **Ruta local (desktop):** `C:\Users\iFrogsMX\Documents\Proyectos Claude\PWA TlamaTech\repair-shop`
- **GitHub:** https://github.com/Tlamatinicast/repair-shop
- **Trabaja desde desktop únicamente** — siempre hacer `git pull` al inicio de cada sesión antes de tocar cualquier archivo.

### Estilo de colaboración

- Prefiere **preguntas aclaratorias antes de implementar** en vez de que Claude asuma.
- Prefiere ver **contenido/textos propuestos** antes de codificarlos (ej. mensajes de WhatsApp).
- Respuestas en español, tono directo, sin exceso de formalismo.
- Workflow Git estándar: `git add <archivos>` → `git commit -m "descripción"` → `git push`.
- Siempre tener en cuenta **diseño mobile-first** — la app se usa como PWA en celular.
- **Saltar pruebas locales** — después de que TypeScript compile limpio, commit+push directo. Debuggear desde logs de Railway. No pedir "prueba local primero" salvo que el cambio sea particularmente riesgoso (migración destructiva, borrado masivo).

### Principio UX: operativo vs mantenimiento

- **Operativo** (uso diario, contextual): export filtrado por vista actual, agregar pieza, etc. → vive **inline** en la página del módulo.
- **Mantenimiento** (raro, destructivo o admin-only): import/restore, backup completo, reset de DB → vive en **`/settings`** dentro de `BackupSection.tsx`.
- Criterio: ¿se usa una vez al mes o menos? ¿es destructivo? ¿usuario normal jamás lo toca? → si sí a cualquiera, va a settings.

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
| Extras | jspdf, qrcode, sharp, xlsx, html5-qrcode |
| Hosting | **Railway** — https://repair-shop-production-c450.up.railway.app |

Dos roles: **Admin** y **Technician**. Flujo de estados de reparación:
`RECEIVED → DIAGNOSING → WAITING_PARTS → IN_REPAIR → READY → DELIVERED (o CANCELLED)`.

Estados de pago (`paymentStatus`): `PENDING → PARTIAL → PAID` (aplica a `Repair` y `Sale`).

### Estructura del repo

```
prisma/
  schema.prisma           # Modelos: Customer, Repair, InventoryItem, RepairPart,
                          #   RepairPhoto, RepairNote, RepairPayment, Sale, SaleItem,
                          #   SalePayment, RepairStatusLog, User, Setting,
                          #   Quote, QuoteItem, ExpenseTemplate, Expense
  migrations/             # Migraciones PostgreSQL (SQL manuales)
  seed.ts, seed.users.ts
src/
  app/
    api/
      repairs/[id]/       # route.ts, notes/, parts/, photos/,
                          #   payment/ (legacy — solo paymentStatus),
                          #   payments/ (POST nuevo + DELETE [paymentId] admin)
      sales/              # route.ts, [id]/(route.ts, payments/), stats/
      inventory/          # route.ts, [id]/, import/, export/
      cash-close/         # export/ (GET admin) — corte de caja a Excel
      quotes/             # route.ts (GET+POST), [id]/route.ts (GET+PATCH+DELETE)
      expenses/           # route.ts (GET+POST), [id]/route.ts (DELETE admin),
                          #   templates/route.ts (GET+POST), templates/[id]/route.ts (PATCH+DELETE)
      customers/, stats/, users/[id]/, auth/[...nextauth]/
      settings/           # GET (público) y PUT (admin)
    repairs/, customers/, inventory/, sales/, quotes/, expenses/, reports/,
    settings/, login/,
    corte-de-caja/        # vista admin con filtro de periodo + conciliación efectivo
  components/
    Sidebar.tsx           # Nav desktop — actualizar junto con BottomNav al agregar sección
    BottomNav.tsx         # Nav mobile scrollable — actualizar junto con Sidebar
    MobileHeader.tsx, BusinessSettingsContext.tsx,
    InventoryImportButton.tsx, InventoryCategorySelect.tsx,
    QrScannerButton.tsx   # Lector QR en dashboard (html5-qrcode)
    ui/
  lib/
    prisma.ts, auth.ts, authOptions.ts, cloudinary.ts, utils.ts,
    businessSettings.ts   # React.cache() — usar getBusinessSettings() en server
    inventoryImport.ts    # parser + CATEGORY_NORMALIZATION
    cashClose.ts          # helpers timezone MX + agregaciones corte de caja
    customerImport.ts     # parser clientes Excel
  types/
```

---

## Módulos completados (funcionando en producción)

- **Dashboard** — estadísticas en tiempo real + botón QR scanner
- **Órdenes de reparación** — CRUD, filtros por estado, detalle con piezas, fotos, timeline
- **Clientes** — perfiles con historial de reparaciones, métricas y cotizaciones asociadas
- **Inventario** — stock, alertas, categorías, `reservedQty`, campo `itemType` (PARTS/PRODUCTS/TOOLS), `location`
- **Auth** Admin / Technician — `id`, `role` y `name` en el JWT
- **UI mobile-responsive** — BottomNav scrollable horizontal (7 items + admin); Sidebar en desktop
- **Tickets PDF** — nota de entrada A4, nota de salida A4, ticket 80mm entrada, ticket 80mm salida, etiqueta interna QR (40×30mm térmica, fondo blanco)
- **Fotos de evidencia** con compresión Sharp → Cloudinary
- **Timeline cronológico** con notas y múltiples fotos por nota (`photoUrls` JSON)
- **RepairWorkspace** — resumen de costos + estado de pago reactivo
- **Módulo de ventas / POS** — carrito, descuento, historial `SalePayment`. Solo muestra ítems con `itemType=PRODUCTS`
- **Piezas reservadas** — se apartan del inventario sin descontar hasta confirmar uso
- **Crear cliente** desde nueva venta o nueva orden (tabs "Buscar / Nuevo")
- **Tiempos de servicio** — `queueDate`, `dueDate`, `partsEta`
- **RepairStatusLog** — duración automática por etapa
- **Seguridad** — todos los endpoints requieren sesión; DELETE/admin requiere rol ADMIN
- **Gestión de usuarios** desde `/settings` — agregar, editar, desactivar y eliminar
- **Notificaciones WhatsApp** — botón en detalle de reparación, `wa.me` con mensaje prellenado según estado actual
- **Configuración del negocio** (`/settings`) — `businessName`, `businessPhone`, `businessDomain` editables. Se propagan a: tickets PDF, recibos, sidebar, header móvil y login
- **Módulo de garantías** — No aplica / 30 / 60 días naturales; badge vigente/vencida/anulada; regreso en garantía mueve a IN_REPAIR + entrada en timeline; garantía en ticket de salida
- **Importador + exportador de inventario Excel** — round-trip completo. Export respeta filtros activos. Backup completo en `/settings → BackupSection.tsx`. Modos `create` / `upsert`. Normalización de categorías en `inventoryImport.ts`
- **Pagos por evento (`RepairPayment`)** — inmutables (insert + delete). `advancePayment` es denormalizado. UI: lista de pagos + "Agregar pago" (CASH/CARD/TRANSFER/OTHER) + "Cobrar saldo"
- **Corte de caja** (`/corte-de-caja`, admin) — presets Hoy/Ayer/Esta semana/Este mes + rango custom. Export a .xlsx (Resumen + Movimientos). Helper conciliación efectivo (no persiste)
- **Backup de Clientes** — export/import Excel. Llave natural de upsert: `phone`
- **Ventas independientes de órdenes** — no suman a `totalCost`. RepairWorkspace lee ventas como read-only
- **Timezone fijo** — `MX_TZ = 'America/Mexico_City'` en `utils.ts`. Helpers: `formatDate`, `formatTime`, `formatDateTime`, `formatDateLong`. Siempre usar estos en server components (Railway corre en UTC)
- **Recibo de venta** — desglose de cobros por abono, abre en pestaña nueva
- **diagnosisFee + piezas de servicio** — `RepairPart` tiene `isService Boolean` y `serviceName String?` para mano de obra libre sin inventario
- **Bloqueo de órdenes cerradas** — Admin puede desbloquear eligiendo nuevo estado + razón; queda en timeline
- **Módulo de cotizaciones** — `Quote` + `QuoteItem`. Número: `COT-{año}-{seq4}`. PDF teal A4, estados DRAFT/SENT/ACCEPTED/REJECTED/EXPIRED, WhatsApp prellenado, convertir a orden/venta. En Sidebar y BottomNav
- **QR Scanner en dashboard** — `QrScannerButton.tsx` con `html5-qrcode`. Modal separado para evitar race condition con DOM. Extrae `url.pathname` y hace `router.push`. iOS PWA siempre pide permisos de cámara (WebKit no los persiste — comportamiento normal, no bug)
- **Cotizaciones en perfil de cliente** — `/customers/[id]` incluye sección de cotizaciones con estado, monto y link
- **Inventario con tipos** — campo `itemType` (PARTS/PRODUCTS/TOOLS). POS filtra `?type=PRODUCTS`. Import/export Excel incluyen columnas Type y Location (retrocompatible, default PARTS)
- **Control de gastos** — modelos `ExpenseTemplate` + `Expense`. Categorías: RENT/UTILITIES/SALARY/SUPPLIES/TRANSPORT/MARKETING/MAINTENANCE/OTHER. Tipos: FIXED/VARIABLE. 4 métodos de pago. Páginas: `/expenses` (lista mensual + desglose por categoría), `/expenses/new` (con selector de plantilla), `/expenses/templates` (admin). En Sidebar y BottomNav
- **Módulo de reportes** — `/reports` (admin). Selector: Este mes / Mes anterior / 3 meses / Este año. Tarjetas: Ingresos, Gastos, Utilidad, Margen %. Tendencia 6 meses (barras CSS). Panel de operaciones. Cobros por método. Gastos por categoría. Top dispositivos (todos los tiempos)
- **Reporte de diagnóstico PDF** — botón en `TicketButtons.tsx`, visible en todos los estados excepto `RECEIVED`. Muestra únicamente el campo `repair.diagnosis` (campo "Diagnóstico técnico" de la orden). NO incluye notas del timeline. Sección de estimado de costo con piezas y mano de obra cotizadas. Multi-página con `ensureSpace()`. Solo línea lateral teal en bloque de texto (sin fondo), para no saturar visualmente.

---

## Lecciones técnicas a preservar

1. **PowerShell bloquea npx** por execution policy — siempre usar **CMD**.
2. **Prisma 5 obligatorio:** `npm install prisma@5 @prisma/client@5`. Prisma 7 rompe.
3. **Recuperar dependencias:**
   ```
   npm install next-auth bcryptjs jspdf qrcode sharp html5-qrcode
   npm install -D @types/bcryptjs @types/qrcode
   ```
4. **Dev local no tiene PostgreSQL** — `prisma db push` falla. Para cambios en schema: crear SQL en `prisma/migrations/` + `npx prisma generate`. Railway aplica `prisma migrate deploy` en el start script automáticamente.
5. **`export const dynamic = 'force-dynamic'`** — obligatorio en toda `route.ts` que use Prisma o sesión. Sin esto Next.js intenta pre-renderizar y falla en build.
6. **Totales reactivos:** NO usar `router.refresh()` para refrescar totales — Client Components calculan localmente y hacen fetch directo.
7. **Seed en Windows:** usar `tsconfig.seed.json` y `npx ts-node --project tsconfig.seed.json prisma/seed.ts`.
8. **Nunca `npm audit fix --force`** — rompe compatibilidad de paquetes.
9. **Transacciones en Prisma:** mutaciones que tocan stock usan `prisma.$transaction(...)`.
10. **`paymentMethod` vive en `SalePayment`, NO en `Sale`** — usar `payments[0].paymentMethod`.
11. **Reiniciar dev server** tras `db push` en Windows (EPERM por .dll bloqueado).
12. **`authOptions` NO puede exportarse desde `route.ts`** — vive en `src/lib/authOptions.ts`.
13. **`businessSettings.ts`** usa `React.cache()` — en server usar `getBusinessSettings()`; en client usar `useBusinessSettings()`. Nunca llamar `prisma.setting.findMany` directo.
14. **`LayoutShell.tsx`** legacy aún existe — si modificas `Sidebar.tsx`, actualizar también `LayoutShell` (pasa `businessName=""`).
15. **Script de start en producción:** `prisma migrate deploy && next start`.
16. **Fotos:** Cloudinary (cloud: dpd8cifms). NO usar filesystem local en producción.
17. **Pagos como evento inmutable:** `SalePayment` y `RepairPayment` son insert + delete, no update. `amountPaid`/`advancePayment` son denormalizados. NO recrear UI de "editar monto directo" — rompe el corte de caja.
18. **Timezone corte de caja:** `src/lib/cashClose.ts` usa America/Mexico_City (UTC-6 fijo). Usar `rangeForPreset()` y `parseDateOrNull()`, nunca `new Date()` directo para presets.
19. **xlsx + NextResponse:** `XLSX.write(wb, { type: 'buffer' })` devuelve `Buffer`. Envolver en `new Uint8Array(buffer)` antes de `NextResponse`.
20. **Export con filtros activos:** construir `URLSearchParams` desde `searchParams` de la página y pasar a `<a href>` plano (no `<Link>` — el browser debe descargar sin interceptar).
21. **NUNCA `toLocaleTimeString` directo en server components** — Railway corre en UTC. Siempre `formatDate()`, `formatTime()`, `formatDateTime()` de `@/lib/utils`. jsPDF sí puede usar `toLocaleString` (corre en browser del usuario).
22. **PDFs abren en pestaña nueva:** `window.open(doc.output('bloburl'), '_blank')` — permite Ctrl+P sin descargar. Aplicado en `TicketButtons.tsx` y `SaleReceiptButton.tsx`.
23. **BottomNav y Sidebar siempre juntos** — al agregar una nueva sección al nav, actualizar ambos archivos. BottomNav usa `w-[68px]` por item con overflow-x-auto scrollable.
24. **QR Scanner (iOS):** NO usar `{ facingMode: { exact: 'environment' } }` — lanza error en iOS Safari aunque la cámara exista. Usar `{ facingMode: 'environment' }` con constraints `ideal`. El modal (`QrScannerModal`) es un componente separado para que el `div#qr-reader-container` exista en el DOM antes de que `Html5Qrcode` se inicialice.
25. **Etiqueta térmica 40×30mm:** `jsPDF({ orientation: 'landscape', unit: 'mm', format: [30, 40] })`. QR resolution: `width: 1024` en `QRCode.toDataURL`. Layout 40/60 (texto/QR).

---

## Estado actual — 2026-05-21

**Último commit en `main`:** reportes reconstruidos con periodo, tendencia y gráficas CSS

**En producción:** https://repair-shop-production-c450.up.railway.app
**URL alternativa Railway:** tlamatech.up.railway.app
**Credenciales demo:** admin@repaiross.com / admin123 · tecnico@repaiross.com / tecnico123

---

## Pendientes futuros

- **Reset de DB demo** — diferido. Se ejecutará cuando Tlami lance la app para uso real.
- **`pg_dump` automatizado vía GitHub Action** — para backup de producción en uso real.
- **Pagos históricos con método UNKNOWN** — los anticipos previos al 2026-04-22 quedaron como "No especificado". Ruido aceptable; se diluye con el tiempo.
- **Cierre de caja persistente (v2)** — registros históricos `CashClose` con snapshot y conteo físico. Diferido hasta validar v1 en uso real.
- **Dominio propio** — comprar en Cloudflare (~MX$200/año) y apuntar a Railway cuando Tlami quiera. Cloudflare Email Routing gratis para reenvío a Gmail.
- **Impresora de etiquetas** — Tlami tiene térmica 80mm (tickets) pero no etiquetas. Decisión pendiente de qué modelo comprar.

### Decisiones arquitectónicas fijas

- **Reparaciones y Ventas NO tienen round-trip Excel** — datos relacionales (RepairPart, RepairPhoto, SaleItem, etc.). Backup real = `pg_dump`.
- **Hosting:** Railway. Hostinger compartido no sirve para Next.js/Prisma.
- **Cada pago es un evento inmutable** — no se edita un total. Crítico para corte de caja confiable.

### Schema — modelos clave

```prisma
model Setting { key String @id; value String }
// Keys: businessName, businessPhone, businessDomain, quoteTerms, quoteValidityDays

model Repair {
  // advancePayment, paymentStatus, queueDate, dueDate, partsEta
  // diagnosisFee (antes laborCost), isDefinedService
  // accessories, physicalCondition, clientSignature (JSON/Text)
  // warrantyType, warrantyVoided, warrantyVoidReason
  // deliveredAt, serviceType, authorizedDiagnosis
}

model RepairPart {
  // itemId Int? (nullable), isService Boolean, serviceName String?
  // Piezas de inventario O líneas de mano de obra libre
}

model InventoryItem {
  // itemType String @default("PARTS")  -- PARTS | PRODUCTS | TOOLS
  // location String?
}

model Quote {
  // quoteNumber COT-{año}-{seq4}, status DRAFT/SENT/ACCEPTED/REJECTED
  // customerId?, customerName, customerPhone
  // subtotal, discount, ivaAmount, total, deposit, terms, validUntil
}

model QuoteItem {
  // unitPrice (sin IVA), hasIva, onDemand, ivaAmount, subtotal, total
}

model ExpenseTemplate {
  // description, category, expenseType FIXED|VARIABLE
  // defaultAmount (0 si variable), paymentMethod, active
}

model Expense {
  // description, amount, category, expenseType, paymentMethod
  // notes?, date, templateId? (FK → ExpenseTemplate nullable)
}
```

---

## Roadmap

### Completados ✅
- [x] Dashboard con estadísticas + QR scanner
- [x] Órdenes de reparación completas (CRUD, timeline, fotos, PDF A4 y 80mm)
- [x] Clientes con perfil, historial de reparaciones y cotizaciones
- [x] Inventario con tipos (PARTS/PRODUCTS/TOOLS), location, import/export Excel
- [x] Ventas / POS (solo PRODUCTS del inventario)
- [x] Módulo de garantías
- [x] Pagos por evento (RepairPayment) + Corte de caja v1
- [x] Backup de inventario y clientes (Excel)
- [x] Módulo de cotizaciones (PDF, estados, WhatsApp, convertir a orden/venta)
- [x] Notificaciones WhatsApp desde detalle de reparación
- [x] Etiqueta térmica QR 40×30mm (fondo blanco)
- [x] BottomNav scrollable con Cotizaciones y Gastos
- [x] Módulo de control de gastos (plantillas, FIXED/VARIABLE, por categoría y método)
- [x] Módulo de reportes (periodo, tendencia 6 meses, métodos de pago, categorías)

### Pendientes de Tlami / roadmap propio
- [ ] Checklist de revisión/diagnóstico personalizable por orden
- [ ] Statuses de reparación personalizables
- [ ] Módulo de proveedores
- [ ] Órdenes de compra de inventario
- [ ] Módulo de finanzas (balance general P&L completo)
- [ ] Export-only reportes operativos de Reparaciones/Ventas
- [ ] DB limpia para producción real (reset de demo data)
- [ ] Cierre de caja persistente v2
- [ ] Impresión de etiquetas QR (pendiente impresora)
- [ ] Dominio propio en Cloudflare

### De otras referencias (baja prioridad)
- [ ] Roles más granulares (Gerente, Contable, Empleado)
- [ ] Gestor de empleados (checadas, horarios)
- [ ] Multi-sucursal
- [ ] Reportes avanzados con gráficas interactivas

---

## Convenciones de código y UI

- **Paleta:** fondo negro (`#000–#111`), acentos en `amber-400/500`, textos en escalas de gris
- **Componentes base:** `card`, `btn-primary`, `btn-secondary`, `btn-ghost`, `section-title`, `input`, `select`, `label`, `badge`
- **Iconos:** `lucide-react` (tamaños 12–15px)
- **Moneda:** `formatCurrency()` — **Fechas/horas:** `formatDate()`, `formatTime()`, `formatDateTime()` de `@/lib/utils`
- **Layout:** `MobileHeader` + `BottomNav` en mobile; `Sidebar` fijo en desktop
- **Nombre del negocio en client:** `useBusinessSettings()` de `BusinessSettingsContext`. En server: `getBusinessSettings()` de `@/lib/businessSettings`

---

## Comandos útiles

```cmd
REM --- Desktop (única máquina de trabajo) ---
cd "C:\Users\iFrogsMX\Documents\Proyectos Claude\PWA TlamaTech\repair-shop"

REM Actualizar desde GitHub (hacer SIEMPRE al inicio de sesión)
git pull origin main

REM Iniciar dev server
npm run dev

REM Regenerar cliente Prisma tras cambiar schema (sin PostgreSQL local)
npx prisma generate

REM Cargar datos demo
npm run db:seed

REM Build de producción
npm run build
```
