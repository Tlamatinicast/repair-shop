# CLAUDE.md — Contexto del proyecto RepairOS / TLAMATECH

> Este archivo se carga automáticamente al iniciar Claude Code en este repositorio.
> Mantenerlo actualizado para que cualquier nueva sesión arranque ya informada.
>
> Última actualización: 2026-04-17

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
| Frontend | Next.js 14.2.35 (App Router) + TypeScript + Tailwind CSS |
| Backend | Next.js API Routes (REST) |
| DB local | SQLite vía **Prisma 5** (dev solamente) |
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
  schema.prisma           # Modelos (Customer, Repair, InventoryItem, RepairPart,
                          #          RepairPhoto, RepairNote, Sale, SaleItem,
                          #          SalePayment, RepairStatusLog, User)
  migrations/             # Migraciones PostgreSQL (generadas con prisma migrate dev)
  seed.ts, seed.users.ts
  dev.db                  # SQLite local (NO se sube a git)
src/
  app/
    api/                  # REST endpoints — todos requieren sesión (apiRequireAuth)
      repairs/[id]/       # route.ts, notes/, parts/, payment/, photos/
      sales/              # route.ts, [id]/(route.ts, payments/), stats/
      customers/, inventory/, stats/, users/, auth/[...nextauth]/
    repairs/, customers/, inventory/, sales/, reports/, settings/, login/
  components/             # Sidebar, BottomNav, MobileHeader, ui/
  lib/                    # prisma.ts, auth.ts, authOptions.ts, cloudinary.ts, utils.ts
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
- **Crear cliente desde nueva venta o nueva orden** — tabs "Buscar / Nuevo" en sección Cliente
- **Tiempos de servicio** — `queueDate` obligatoria, `dueDate` opcional (servicios definidos), `partsEta` en WAITING_PARTS
- **RepairStatusLog** — registra automáticamente duración por etapa al cambiar estado
- **Seguridad** — todos los endpoints requieren sesión; DELETE requiere Admin
- **En producción** en Railway con PostgreSQL + Cloudinary para fotos

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
12. **Orden de listas:** `orderBy: { createdAt: 'desc' }` es correcto — los datos del seed tienen timestamps distintos. El `id` no siempre coincide con el orden de creación.
13. **`authOptions` NO puede exportarse desde `route.ts`** — vive en `src/lib/authOptions.ts` e importarse desde ahí. Exportarlo desde el route causa error de build en producción.
14. **Dev local usa SQLite, producción usa PostgreSQL** — no mezclar. Para crear migraciones de producción: cambiar `DATABASE_URL` en `.env` a la URL pública de Railway, correr `prisma migrate dev`, luego revertir `.env`.
15. **Fotos:** se suben a Cloudinary (cloud: dpd8cifms). Las credenciales están en `.env` y en Railway Variables. NO usar filesystem local en producción — Railway no tiene almacenamiento persistente.
16. **Script de start en producción:** `prisma migrate deploy && next start` — aplica migraciones pendientes automáticamente en cada deploy.

---

## Estado actual al 2026-04-17

**Último commit en `main`:** `67e72a3 Integrar Cloudinary para almacenamiento persistente de fotos`

**En producción:** https://repair-shop-production-c450.up.railway.app  
**Credenciales demo:** admin@repaiross.com / admin123 · tecnico@repaiross.com / tecnico123

### Schema actual (modelos clave)

- `Repair`: `advancePayment`, `paymentStatus`, `queueDate`, `dueDate`, `partsEta`, `isDefinedService`, relaciones `sales`, `statusLogs`
- `RepairStatusLog`: registro automático de duración por etapa de estado
- `Sale`: `amountPaid`, `paymentStatus` (PENDING/PARTIAL/PAID), relación `payments: SalePayment[]`
- `SalePayment`: `saleId`, `amount`, `paymentMethod`, `notes`, `createdAt`
- `InventoryItem`: `reservedQty`, relación `saleItems`
- `RepairPart`: `reserved: Boolean`
- `RepairNote`: `photoUrls: String?` (JSON array con URLs de Cloudinary; `photoUrl` legacy)

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

## Roadmap — funciones pendientes

> Comparado contra **Samii** (samiiweb.com) y **SpotsPOS** (spotspos.com).
> Ordenar por impacto al elegir qué trabajar en cada sesión.

### De Samii
- [ ] Fechas límite de entrega por orden
- [ ] Checklist de revisión/diagnóstico personalizable por orden
- [ ] Statuses de reparación personalizables (no fijos en código)
- [ ] Módulo de garantías — folio con fecha de vencimiento al entregar
- [ ] Módulo de proveedores
- [ ] Control de gastos fijos y variables (renta, luz, sueldos, etc.)
- [ ] Órdenes de compra de inventario
- [ ] Notificaciones WhatsApp/correo al cambiar estado *(sin API de pago — botón de link prellenado)*
- [ ] Impresión térmica y stickers
- [ ] Módulo de finanzas (balance general)

### De SpotsPOS
- [ ] Roles más granulares (Gerente, Contable, Empleado)
- [ ] Gestor de empleados (checadas, horarios, desempeño)
- [ ] Multi-sucursal
- [ ] Análisis de horas pico y reportes avanzados con gráficas
- [ ] CRM con automatización de comunicaciones

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
