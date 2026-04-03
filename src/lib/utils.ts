import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const REPAIR_STATUSES = {
  RECEIVED:      { label: 'Recibido',         color: 'text-blue-400   bg-blue-400/10   border-blue-400/20' },
  DIAGNOSING:    { label: 'Diagnóstico',       color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
  WAITING_PARTS: { label: 'Esperando piezas',  color: 'text-amber-400  bg-amber-400/10  border-amber-400/20' },
  IN_REPAIR:     { label: 'En reparación',     color: 'text-pink-400   bg-pink-400/10   border-pink-400/20' },
  READY:         { label: 'Listo',             color: 'text-green-400  bg-green-400/10  border-green-400/20' },
  DELIVERED:     { label: 'Entregado',         color: 'text-gray-400   bg-gray-400/10   border-gray-400/20' },
  CANCELLED:     { label: 'Cancelado',         color: 'text-red-400    bg-red-400/10    border-red-400/20' },
} as const;

export type RepairStatus = keyof typeof REPAIR_STATUSES;

export const DEVICE_TYPES = [
  'Laptop', 'Desktop', 'Tablet', 'Teléfono', 'Consola', 'GPU',
  'Módulo vehicular', 'Dispositivo médico', 'Otro',
];

export const INVENTORY_CATEGORIES = [
  'Pantallas', 'Baterías', 'Almacenamiento', 'Memorias RAM',
  'Consumibles', 'Consolas', 'GPU', 'Cables', 'Accesorios', 'Otro',
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
}

export function generateTicketNumber(id: number): string {
  return `TK-${String(id).padStart(4, '0')}`;
}
