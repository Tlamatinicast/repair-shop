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
  'Baterías', 'Botones', 'Centro de Carga', 'Condensadores Electrolíticos',
  'Diodos', 'DisplayPort Retimer IC', 'DRMosfet', 'EC/KBC/Super IO',
  'Hack IC', 'IC Almacenamiento', 'IC Audio', 'IC Carga',
  'IC Controlador', 'IC Regulador', 'IC Switch', 'IC USB',
  'IC WiFi/LAN', 'Joystick', 'Mosfet', 'PMIC',
  'Placa Buck Converter', 'Puerto HDMI', 'Puerto USB', 'VRAM',
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

const WA_MESSAGES: Record<string, (name: string, device: string, biz: string) => string> = {
  RECEIVED:      (n, d, b) => `Hola ${n}, te confirmamos que recibimos tu ${d} para revisión. Te avisaremos cuando tengamos un diagnóstico. — ${b}`,
  DIAGNOSING:    (n, d, b) => `Hola ${n}, tu ${d} está en diagnóstico. En breve te compartimos los detalles y costo estimado. — ${b}`,
  WAITING_PARTS: (n, d, b) => `Hola ${n}, ya tenemos el diagnóstico de tu ${d}. Estamos en espera de las piezas necesarias. Te avisamos en cuanto lleguen. — ${b}`,
  IN_REPAIR:     (n, d, b) => `Hola ${n}, tu ${d} ya está en proceso de reparación. Te notificamos cuando esté lista. — ${b}`,
  READY:         (n, d, b) => `Hola ${n}, ¡tu ${d} está lista! Puedes pasar a recogerla a nuestro taller en el horario de atención. — ${b}`,
  DELIVERED:     (n, d, b) => `Hola ${n}, gracias por confiar en ${b}. Esperamos que tu ${d} funcione de maravilla. ¡Hasta pronto! 🙌`,
  CANCELLED:     (n, d, b) => `Hola ${n}, lamentamos informarte que la orden de tu ${d} fue cancelada. Contáctanos si tienes dudas. — ${b}`,
};

export function buildWhatsAppUrl(
  phone: string,
  status: string,
  customerName: string,
  deviceBrand: string,
  deviceModel: string,
  businessName: string,
): string {
  const device = `${deviceBrand} ${deviceModel}`;
  const firstName = customerName.split(' ')[0];
  const msgFn = WA_MESSAGES[status] ?? WA_MESSAGES['RECEIVED'];
  const text = msgFn(firstName, device, businessName);
  const cleanPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanPhone.startsWith('52') ? cleanPhone : `52${cleanPhone}`;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
}
