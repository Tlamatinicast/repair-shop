# CLAUDE.md — Contexto del proyecto RepairOS / TLAMATECH

> Este archivo se carga automáticamente al iniciar Claude Code en este repositorio.
> Mantenerlo actualizado para que cualquier nueva sesión arranque ya informada.
>
> Última actualización: 2026-04-22

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
                          #   RepairPhoto, RepairNote, Sale, SaleItem,
                          #   SalePayment, RepairStatusLog, User, Setting
  migrations/             # Migraciones PostgreSQL
  seed.ts, seed.users.ts
src/
  app/
    api/                  # REST endpoints — todos requieren sesión
      repairs/[id]/       # route.ts, notes/, parts/, payment/, photos/
      sales/              # route.ts, [id]/(route.ts, payments/), stats/
      customers/, inventory/, stats/, users/[id]/, auth/[...nextauth]/
      settings/           # GET (público) y PUT (admin) — clave/valor del negocio
    repairs/, customers/, inventory/, sales/, reports/, settings/, login/
  components/             # Sidebar, BottomNav, MobileHeader, BusinessSettingsContext, ui/
  lib/                    # prisma.ts, auth.ts, authOptions.ts, cloudinary.ts, utils.ts,
                          #   businessSettings.ts (helper cacheado con React.cache)
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

---

## Estado actual al 2026-04-22

**Último commit en `main`:** `1aa67f0 Módulo de garantías — Capa 1 + Capa 2`

**En producción:** https://repair-shop-production-c450.up.railway.app  
**Credenciales demo:** admin@repaiross.com / admin123 · tecnico@repaiross.com / tecnico123

---

## 🔜 Próximo trabajo acordado — Importación de inventario desde Excel + DB limpia

**Objetivo:** sacar el proyecto de "demo" a "en uso real en el taller". Tlami ya tiene un Excel con 96 refacciones reales y quiere cargarlo en vez de seguir con datos demo.

### Archivo fuente
- **Ruta:** `C:\Users\iFrogsMX\Documents\Relacion de inventario-refacciones.xlsx`
- **Hoja:** `Inventario+csv`
- **Filas de datos:** 96
- **Columnas originales:** `Category | Name | Description | Cost | Price | Quantity`

### Mapeo al schema `InventoryItem`

| Excel | DB | Notas |
|---|---|---|
| Category | `category` | Normalizar formato |
| Name | `name` | — |
| Description | `description` | Opcional |
| Cost | `costPrice` | — |
| Price | `salePrice` | — |
| Quantity | `quantity` | — |
| *(nuevo)* SKU | `sku` | **Requerido y único** — se agrega en cowork |
| *(opcional)* MinQuantity | `minQuantity` | Default `1` si no viene |
| *(opcional)* Location | `location` | Default `null` si no viene |

### Pendiente antes de la siguiente sesión (Tlami lo hará con Claude en cowork el 2026-04-23)

Tlami trabajará el Excel con **Claude cowork** para resolver los siguientes problemas **antes** de retomar la implementación. No empezar a codificar hasta tener el Excel mejorado.

1. **Agregar columna SKU** con patrón `{PREFIJO_CAT}-{ID_CORTO}` basado en Name/Description (ej. `BAT-CR2032`, `DIO-P6KE33A`, `MOS-AOZ5311`). SKUs deben ser únicos.
2. **Consolidar duplicados** — hay al menos dos filas con `BOTON 3X4X2` y dos con `BOTON 3X4X2.5`. Decidir si se suman las cantidades o se diferencian.
3. **Fila 90 con `Name` vacío** — completar o descartar.
4. **Normalizar categorías** — mezcla de mayúsculas (`BATERIAS`) y Title Case (`Condensadores electroliticos`), doble espacio en `Centro de  carga`. Unificar a **Title Case en español** (`Baterías`, `Botones`, `Condensadores Electrolíticos`, `Centro de Carga`...).
5. **Opcional:** agregar columnas `MinQuantity` y `Location` (ubicación física: gaveta/anaquel).

### Plan de implementación (para cuando el Excel esté listo)

1. **Validar el Excel mejorado:** leer con openpyxl/xlsx, confirmar unicidad de SKU y completitud de `Category`, `Name`, `SKU`, `Cost`, `Price`, `Quantity`.
2. **Importador UI en `/inventory`:** botón que acepta `.xlsx` → muestra preview con validaciones (nuevos, duplicados de SKU, errores) → confirma y escribe en `prisma.$transaction`.
3. **Exportador a Excel/CSV** desde el mismo módulo (primer paso del item "Exportación CSV/Excel por módulo" del roadmap).
4. **Reset de DB demo** antes de cargar el inventario real. **Pendiente de confirmar con Tlami:** conservar usuarios Admin/Technician o borrar todo.

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
- [ ] Exportación CSV/Excel por módulo *(Admin only)*
- [ ] Importación de inventario desde Excel *(tienes un Excel con refacciones)*
- [ ] DB limpia sin datos demo para producción
- [ ] Expansión de `deviceType` para módulos vehiculares y dispositivos médicos

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
