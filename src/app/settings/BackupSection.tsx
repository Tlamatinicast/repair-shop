import { Download, Database } from 'lucide-react';
import { InventoryImportButton } from '@/components/InventoryImportButton';
import { CustomerImportButton } from '@/components/CustomerImportButton';

type ModuleRow = {
  key: string;
  label: string;
  description: string;
  exportHref: string | null;
  importControl: React.ReactNode | null;
};

const MODULES: ModuleRow[] = [
  {
    key: 'inventory',
    label: 'Inventario',
    description: 'Refacciones, costos, precios, stock y categorías.',
    exportHref: '/api/inventory/export',
    importControl: <InventoryImportButton />,
  },
  {
    key: 'customers',
    label: 'Clientes',
    description: 'Datos de contacto: nombre, teléfono, correo, dirección y notas.',
    exportHref: '/api/customers/export',
    importControl: <CustomerImportButton />,
  },
  {
    key: 'repairs',
    label: 'Reparaciones',
    description: 'Datos relacionales (piezas, fotos, notas, pagos). Respaldo vía pg_dump automatizado antes del release en campo — no aplica Excel.',
    exportHref: null,
    importControl: null,
  },
  {
    key: 'sales',
    label: 'Ventas',
    description: 'Datos relacionales (ítems, pagos). Respaldo vía pg_dump automatizado antes del release en campo — no aplica Excel.',
    exportHref: null,
    importControl: null,
  },
];

export function BackupSection() {
  return (
    <div className="card p-5 mb-5">
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-[#1a1a1a]">
        <Database size={14} className="text-amber-500" />
        <h2 className="text-sm font-semibold text-[#ccc]">Backup y restauración</h2>
      </div>

      <p className="text-xs text-[#666] mb-5 leading-relaxed">
        Descarga un respaldo en Excel de los módulos planos (Clientes, Inventario).
        Si más adelante algo se daña, puedes restaurar importando el mismo archivo
        en modo &quot;Restaurar / actualizar&quot;. Para Reparaciones y Ventas el
        respaldo real será el dump de la base de datos (pendiente de automatizar
        antes del release en campo).
      </p>

      <div className="space-y-3">
        {MODULES.map(m => (
          <div
            key={m.key}
            className={`flex items-center justify-between gap-3 border border-[#1e1e1e] rounded-lg px-4 py-3 ${m.exportHref ? '' : 'opacity-50'}`}
          >
            <div className="min-w-0">
              <p className="text-sm text-[#ddd]">{m.label}</p>
              <p className="text-xs text-[#666] leading-relaxed">{m.description}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {m.exportHref ? (
                <a href={m.exportHref} className="btn-secondary" title={`Descargar backup completo de ${m.label.toLowerCase()}`}>
                  <Download size={13} />
                  <span className="hidden sm:inline">Backup</span>
                </a>
              ) : (
                <span className="text-xs text-[#555] font-mono">—</span>
              )}
              {m.importControl}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
