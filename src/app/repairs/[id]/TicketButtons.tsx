'use client';

import { useState } from 'react';
import { Printer, Tag, FileCheck, Loader2 } from 'lucide-react';

interface Repair {
  id: number;
  ticketNumber: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  serialNumber?: string | null;
  issue: string;
  diagnosis?: string | null;
  notes?: string | null;
  diagnosisFee: number;
  totalCost: number;
  advancePayment: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
  dueDate?: string | null;
  deliveredAt?: string | null;
  warrantyType?: string;
  warrantyVoided?: boolean;
  password?: string | null;
  contactPreference?: string;
  accessories?: string;
  physicalCondition?: string;
  physicalNotes?: string;
  serviceType?: string;
  authorizedDiagnosis?: boolean;
  clientSignature?: string;
  payments?: { amount: number; paymentMethod: string; createdAt: string }[];
  customer: {
    name: string;
    phone: string;
    email?: string | null;
    address?: string | null;
  };
}

const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

const ACCESSORY_LABELS: Record<string, string> = {
  NONE: 'Ninguno / N.A.', CHARGER: 'Cargador', CABLE: 'Cable de corriente',
  CASE: 'Funda', BOX: 'Caja', ADAPTERS: 'Adaptadores', OTHER: 'Otros',
};
const CONDITION_LABELS: Record<string, string> = {
  NONE: 'Sin daños externos', BROKEN_SCREEN: 'Pantalla rota', SCRATCHES: 'Rayones',
  DENTS: 'Golpes / abolladuras', MISSING_SCREWS: 'Tornillos faltantes',
  WATER_DAMAGE: 'Equipo mojado / humedad', PREVIOUSLY_OPENED: 'Equipo previamente abierto',
};
const SERVICE_LABELS: Record<string, string> = {
  DIAGNOSIS: 'Diagnóstico', DIRECT_REPAIR: 'Reparación directa', GENERAL_REVIEW: 'Revisión general',
};
const CONTACT_LABELS: Record<string, string> = {
  WHATSAPP: 'WhatsApp', CALL: 'Llamada telefónica', EMAIL: 'Correo electrónico',
};

interface BizInfo { name: string; phone: string; domain: string; }

export function TicketButtons({ repair, biz }: { repair: Repair; biz: BizInfo }) {
  const [loadingClient,        setLoadingClient]        = useState(false);
  const [loadingInternal,      setLoadingInternal]      = useState(false);
  const [loadingDelivery,      setLoadingDelivery]      = useState(false);
  const [loadingThermalEntry,  setLoadingThermalEntry]  = useState(false);
  const [loadingThermalExit,   setLoadingThermalExit]   = useState(false);

  // ── CLIENT TICKET — estilo teal moderno ──────────────────────────────────
  const generateClientTicket = async () => {
    setLoadingClient(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210; const margin = 18; const contentW = pageW - margin * 2;

      const accessories = JSON.parse(repair.accessories      || '[]') as string[];
      const physCond    = JSON.parse(repair.physicalCondition || '[]') as string[];

      // ── Color helpers ─────────────────────────────────────────────────────
      const fill = (r: number, g: number, b: number) => doc.setFillColor(r, g, b);
      const draw = (r: number, g: number, b: number) => doc.setDrawColor(r, g, b);
      const txt  = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);

      // Palette
      const TEAL_D  = [15, 110, 86]   as const; // #0F6E56
      const TEAL_M  = [29, 158, 117]  as const; // #1D9E75
      const TEAL_L  = [225, 245, 238] as const; // #E1F5EE
      const TEAL_B  = [159, 225, 203] as const; // #9FE1CB
      const TEAL_DP = [8, 80, 65]     as const; // #085041
      const GR4     = [136, 135, 128] as const; // #888780
      const GR6     = [95, 94, 90]    as const; // #5f5e5a
      const GR9     = [44, 44, 42]    as const; // #2c2c2a
      const GRL     = [180, 178, 169] as const; // #b4b2a9
      const TAG_BG  = [241, 239, 232] as const; // #f1efe8
      const TAG_BD  = [211, 209, 199] as const; // #d3d1c7
      const SEP     = [232, 232, 228] as const; // #e8e8e4
      const PROB_BG = [249, 250, 249] as const; // #f9faf9
      const FT_BG   = [250, 250, 248] as const; // #fafaf8

      // ── White page background ─────────────────────────────────────────────
      fill(255, 255, 255); doc.rect(0, 0, pageW, 297, 'F');

      let y = 0;

      // ── Separator helper ─────────────────────────────────────────────────
      const sep = (full = false) => {
        draw(...SEP); doc.setLineWidth(0.3);
        doc.line(full ? 0 : margin, y, full ? pageW : pageW - margin, y);
        y += 4;
      };

      // ── Section label ─────────────────────────────────────────────────────
      const sLabel = (text: string) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); txt(...TEAL_D);
        doc.text(text, margin, y); y += 6;
      };

      // ── 2-col field ───────────────────────────────────────────────────────
      const col1 = margin;
      const col2 = margin + contentW / 2 + 2;
      const colW = contentW / 2 - 4;

      const drawField = (label: string, value: string, x: number, bold = false): number => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); txt(...GR4);
        doc.text(label, x, y);
        doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(10); txt(...GR9);
        const lines = doc.splitTextToSize(value || '—', colW);
        doc.text(lines, x, y + 4.5);
        return 4.5 + lines.length * 4.5 + 1;
      };

      const row2 = (l1: string, v1: string, b1: boolean, l2: string, v2: string, b2 = false) => {
        const h1 = drawField(l1, v1, col1, b1);
        const h2 = drawField(l2, v2, col2, b2);
        y += Math.max(h1, h2) + 3;
      };

      // ── Chip/tag ──────────────────────────────────────────────────────────
      const drawChip = (text: string, cx: number, cy: number, style: 'tag' | 'chip'): number => {
        doc.setFontSize(8);
        const tw = doc.getTextWidth(text);
        const pw = 4; const ph = 4;
        const w = tw + pw * 2; const h = ph * 2;
        if (style === 'tag') {
          fill(...TAG_BG); draw(...TAG_BD); txt(...GR6);
        } else {
          fill(...TEAL_L); draw(...TEAL_B); txt(...TEAL_DP);
        }
        doc.setLineWidth(0.3);
        doc.roundedRect(cx, cy - ph + 0.5, w, h, 1, 1, 'FD');
        doc.setFont('helvetica', style === 'chip' ? 'bold' : 'normal');
        doc.text(text, cx + pw, cy);
        return w + 3;
      };

      // ══════════════════════════════════════════════════════════════════════
      // HEADER
      // ══════════════════════════════════════════════════════════════════════
      y = 14;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(20); txt(...TEAL_D);
      doc.text(biz.name, margin, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); txt(...GR4);
      doc.text('TALLER DE REPARACIÓN DE DISPOSITIVOS ELECTRÓNICOS', margin, y + 5.5);
      txt(...GRL);
      const contactLine = [biz.phone, biz.domain].filter(Boolean).join(' · ');
      doc.text(contactLine || 'Mérida, Yucatán', margin, y + 10.5);

      // Folio (derecha)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(20); txt(...TEAL_D);
      doc.text(repair.ticketNumber, pageW - margin, y, { align: 'right' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); txt(...GR4);
      doc.text(
        new Date(repair.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }),
        pageW - margin, y + 6, { align: 'right' }
      );

      // Badge entrega estimada
      if (repair.dueDate) {
        const badgeText = `Entrega est. ${new Date(repair.dueDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`;
        doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
        const bw = doc.getTextWidth(badgeText) + 10;
        fill(...TEAL_L); draw(...TEAL_B); doc.setLineWidth(0.3);
        doc.roundedRect(pageW - margin - bw, y + 8.5, bw, 5.5, 1, 1, 'FD');
        txt(...TEAL_DP);
        doc.text(badgeText, pageW - margin - bw / 2, y + 12.5, { align: 'center' });
      }

      y = 30;
      sep(true);
      y -= 3; // sep adds 4, teal band starts right at the line

      // ── Banda teal "Orden de recepción" ───────────────────────────────────
      fill(...TEAL_L); doc.rect(0, y, pageW, 7.5, 'F');
      draw(...TEAL_B); doc.setLineWidth(0.3);
      doc.line(0, y + 7.5, pageW, y + 7.5);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); txt(...TEAL_DP);
      doc.text('ORDEN DE RECEPCIÓN', margin, y + 5.2);
      y += 10;

      // ══════════════════════════════════════════════════════════════════════
      // SECCIÓN: CLIENTE
      // ══════════════════════════════════════════════════════════════════════
      y += 3;
      sLabel('Datos del cliente');
      row2('Nombre', repair.customer.name, true, 'Teléfono', repair.customer.phone, false);
      row2(
        'Correo electrónico', repair.customer.email || '—', false,
        'Contactar por', CONTACT_LABELS[repair.contactPreference || ''] || '—', false
      );

      sep();

      // ══════════════════════════════════════════════════════════════════════
      // SECCIÓN: DISPOSITIVO
      // ══════════════════════════════════════════════════════════════════════
      sLabel('Dispositivo recibido');
      row2('Tipo', repair.deviceType, true, 'Marca / Modelo', `${repair.deviceBrand} ${repair.deviceModel}`, true);
      row2(
        'No. de serie', repair.serialNumber || 'N/A', false,
        'Contraseña', (repair.password && repair.password !== 'N/A') ? repair.password : 'No aplica', false
      );

      // Accesorios (chips)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); txt(...GR4);
      doc.text('Accesorios entregados', margin, y);
      y += 5;
      let cx = margin;
      accessories.map(a => ACCESSORY_LABELS[a] || a).forEach(label => {
        doc.setFontSize(8);
        const chipW = doc.getTextWidth(label) + 11;
        if (cx + chipW > pageW - margin) { cx = margin; y += 7; }
        cx += drawChip(label, cx, y, 'tag');
      });
      y += 7;

      // Estado físico
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); txt(...GR4);
      doc.text('Estado físico al recibir', margin, y);
      y += 4.5;
      const condText = physCond.map(pc => CONDITION_LABELS[pc] || pc).join(' · ');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); txt(...GR6);
      const condLines = doc.splitTextToSize(condText || '—', contentW);
      doc.text(condLines, margin, y);
      y += condLines.length * 4.5;
      if (repair.physicalNotes && repair.physicalNotes.trim()) {
        doc.setFontSize(8.5); txt(...GR4);
        const notesLines = doc.splitTextToSize(repair.physicalNotes, contentW);
        doc.text(notesLines, margin, y + 3);
        y += notesLines.length * 4.5 + 3;
      }
      y += 3;

      sep();

      // ══════════════════════════════════════════════════════════════════════
      // SECCIÓN: PROBLEMA
      // ══════════════════════════════════════════════════════════════════════
      sLabel('Problema reportado');

      // Callout con borde izquierdo teal
      const issueLines = doc.splitTextToSize(repair.issue, contentW - 10);
      const calloutH   = issueLines.length * 4.5 + 7;
      fill(...PROB_BG); doc.rect(margin, y - 2, contentW, calloutH, 'F');
      fill(...TEAL_M);  doc.rect(margin, y - 2, 2, calloutH, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); txt(...GR9);
      doc.text(issueLines, margin + 6, y + 3);
      y += calloutH + 2;

      // Chip de tipo + autorización
      cx = margin;
      const serviceLabel = SERVICE_LABELS[repair.serviceType || ''] || repair.serviceType || '';
      if (serviceLabel) cx += drawChip(serviceLabel, cx, y + 1, 'chip');
      if (repair.authorizedDiagnosis) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); txt(...GR4);
        doc.text('Cliente autorizó diagnóstico y cargos adicionales', cx + 2, y + 1.5);
      }
      y += 8;

      // ══════════════════════════════════════════════════════════════════════
      // BLOQUE DE COSTO (fondo teal, full-width)
      // ══════════════════════════════════════════════════════════════════════
      y += 3;
      const costH = 15;
      fill(...TEAL_L); doc.rect(0, y, pageW, costH, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); txt(...TEAL_DP);
      doc.text('Diagnóstico estimado', margin, y + 6.5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); txt(...TEAL_M);
      doc.text('La mano de obra y piezas pueden generar cargos adicionales', margin, y + 11.5);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(20); txt(...TEAL_D);
      doc.text(
        repair.diagnosisFee > 0 ? fmt(repair.diagnosisFee) : 'Por cotizar',
        pageW - margin, y + 11, { align: 'right' }
      );
      y += costH + 3;

      sep();

      // ══════════════════════════════════════════════════════════════════════
      // TÉRMINOS Y CONDICIONES
      // ══════════════════════════════════════════════════════════════════════
      sLabel('Términos y condiciones');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); txt(...GR4);
      [
        'Tiempo estimado: 3–7 días hábiles, sujeto a disponibilidad de piezas.',
        `${biz.name} no se responsabiliza por pérdida de datos. Respalde su información.`,
        'Equipos no reclamados después de 30 días generarán cargo por almacenaje.',
      ].forEach((term, i) => {
        const tlines = doc.splitTextToSize(`${i + 1}. ${term}`, contentW - 4);
        doc.text(tlines, margin, y);
        y += tlines.length * 4.5 + 1.5;
      });
      y += 2;

      sep();

      // ══════════════════════════════════════════════════════════════════════
      // FIRMA DEL CLIENTE
      // ══════════════════════════════════════════════════════════════════════
      sLabel('Firma del cliente');
      if (repair.clientSignature && repair.clientSignature.length > 50) {
        try {
          doc.addImage(repair.clientSignature, 'PNG', margin, y, 90, 22);
        } catch { /* firma corrupta, mostrar caja vacía */ }
        y += 24;
      } else {
        draw(...SEP); doc.setLineWidth(0.3);
        doc.roundedRect(margin, y, contentW, 18, 1, 1, 'S');
        y += 20;
      }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); txt(...GR4);
      doc.text(repair.customer.name, margin, y + 1);

      // ══════════════════════════════════════════════════════════════════════
      // FOOTER
      // ══════════════════════════════════════════════════════════════════════
      const footerY = 282;
      fill(...FT_BG); doc.rect(0, footerY, pageW, 15, 'F');
      draw(...SEP); doc.setLineWidth(0.3);
      doc.line(0, footerY, pageW, footerY);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); txt(...TEAL_D);
      doc.text(repair.ticketNumber, margin, footerY + 8);
      doc.setFont('helvetica', 'normal'); txt(...GRL);
      doc.text('Conserve este comprobante para reclamar su equipo.', pageW / 2, footerY + 8, { align: 'center' });
      doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pageW - margin, footerY + 8, { align: 'right' });

      window.open(doc.output('bloburl'), '_blank');
    } catch (err) { console.error(err); alert('Error al generar el PDF.'); }
    finally { setLoadingClient(false); }
  };

  // ── DELIVERY TICKET — estilo teal moderno, consistente con ticket de entrada ──
  const generateDeliveryTicket = async () => {
    setLoadingDelivery(true);
    try {
      // El ticket de entrega solo cubre la reparación (mano de obra + piezas).
      // Las ventas ligadas a la orden tienen su propio ticket y no se incluyen.
      const partsRes = await fetch(`/api/repairs/${repair.id}/parts`);
      const allParts: any[] = partsRes.ok ? await partsRes.json() : [];

      const inventoryParts = allParts.filter((p: any) => !p.isService);
      const serviceParts   = allParts.filter((p: any) => p.isService);
      const inventoryTotal = inventoryParts.reduce((s: number, p: any) => s + p.unitPrice * p.quantity, 0);
      const serviceTotal   = serviceParts.reduce((s: number, p: any) => s + p.unitPrice * p.quantity, 0);
      const total          = repair.diagnosisFee + serviceTotal + inventoryTotal;
      const advance        = repair.advancePayment ?? 0;
      const pending        = Math.max(0, total - advance);
      const isPaid         = pending <= 0 && total > 0;

      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210; const margin = 18; const contentW = pageW - margin * 2;

      // ── Color helpers (misma paleta que ticket de entrada) ───────────────
      const fill = (r: number, g: number, b: number) => doc.setFillColor(r, g, b);
      const draw = (r: number, g: number, b: number) => doc.setDrawColor(r, g, b);
      const txt  = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);

      const TEAL_D  = [15, 110, 86]   as const; // #0F6E56
      const TEAL_M  = [29, 158, 117]  as const; // #1D9E75
      const TEAL_L  = [225, 245, 238] as const; // #E1F5EE
      const TEAL_B  = [159, 225, 203] as const; // #9FE1CB
      const TEAL_DP = [8, 80, 65]     as const; // #085041
      const GR4     = [136, 135, 128] as const; // #888780
      const GR6     = [95, 94, 90]    as const; // #5f5e5a
      const GR9     = [44, 44, 42]    as const; // #2c2c2a
      const GRL     = [180, 178, 169] as const; // #b4b2a9
      const SEP     = [232, 232, 228] as const; // #e8e8e4
      const FT_BG   = [250, 250, 248] as const; // #fafaf8
      const WARN_BG = [255, 247, 237] as const; // #fff7ed
      const WARN_BD = [186, 117, 23]  as const; // #BA7517
      const WARN_TX = [133, 79, 11]   as const; // #854F0B
      const RED_TX  = [180, 50, 50]   as const;

      // White page background
      fill(255, 255, 255); doc.rect(0, 0, pageW, 297, 'F');

      let y = 0;

      // ── Helpers ───────────────────────────────────────────────────────────
      const sep = (full = false) => {
        draw(...SEP); doc.setLineWidth(0.3);
        doc.line(full ? 0 : margin, y, full ? pageW : pageW - margin, y);
        y += 4;
      };
      const sLabel = (text: string) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); txt(...TEAL_D);
        doc.text(text, margin, y); y += 6;
      };
      const col1 = margin;
      const col2 = margin + contentW / 2 + 2;
      const colW = contentW / 2 - 4;
      const drawField = (label: string, value: string, x: number, bold = false): number => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); txt(...GR4);
        doc.text(label, x, y);
        doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(10); txt(...GR9);
        const lines = doc.splitTextToSize(value || '—', colW);
        doc.text(lines, x, y + 4.5);
        return 4.5 + lines.length * 4.5 + 1;
      };
      const row2 = (l1: string, v1: string, b1: boolean, l2: string, v2: string, b2 = false) => {
        const h1 = drawField(l1, v1, col1, b1);
        const h2 = drawField(l2, v2, col2, b2);
        y += Math.max(h1, h2) + 3;
      };

      // ══════════════════════════════════════════════════════════════════════
      // HEADER
      // ══════════════════════════════════════════════════════════════════════
      y = 14;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(20); txt(...TEAL_D);
      doc.text(biz.name, margin, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); txt(...GR4);
      doc.text('TALLER DE REPARACIÓN DE DISPOSITIVOS ELECTRÓNICOS', margin, y + 5.5);
      txt(...GRL);
      const contactLine = [biz.phone, biz.domain].filter(Boolean).join(' · ');
      doc.text(contactLine || 'Mérida, Yucatán', margin, y + 10.5);

      // Folio (derecha)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(20); txt(...TEAL_D);
      doc.text(repair.ticketNumber, pageW - margin, y, { align: 'right' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); txt(...GR4);
      const deliveryDate = repair.deliveredAt ? new Date(repair.deliveredAt) : new Date();
      doc.text(
        deliveryDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }),
        pageW - margin, y + 6, { align: 'right' }
      );

      // Badge de estado (Pagado / Saldo pendiente)
      {
        const badgeText = isPaid ? 'Pagado' : 'Saldo pendiente';
        doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
        const bw = doc.getTextWidth(badgeText) + 10;
        if (isPaid) {
          fill(...TEAL_L); draw(...TEAL_B);
        } else {
          fill(...WARN_BG); draw(...WARN_BD);
        }
        doc.setLineWidth(0.3);
        doc.roundedRect(pageW - margin - bw, y + 8.5, bw, 5.5, 1, 1, 'FD');
        if (isPaid) txt(...TEAL_DP); else txt(...WARN_TX);
        doc.text(badgeText, pageW - margin - bw / 2, y + 12.5, { align: 'center' });
      }

      y = 30;
      sep(true);
      y -= 3;

      // ── Banda teal "Comprobante de entrega" ──────────────────────────────
      fill(...TEAL_L); doc.rect(0, y, pageW, 7.5, 'F');
      draw(...TEAL_B); doc.setLineWidth(0.3);
      doc.line(0, y + 7.5, pageW, y + 7.5);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); txt(...TEAL_DP);
      doc.text('COMPROBANTE DE ENTREGA', margin, y + 5.2);
      y += 10;

      // ══════════════════════════════════════════════════════════════════════
      // SECCIÓN: CLIENTE
      // ══════════════════════════════════════════════════════════════════════
      y += 3;
      sLabel('Datos del cliente');
      row2('Nombre', repair.customer.name, true, 'Teléfono', repair.customer.phone, false);

      sep();

      // ══════════════════════════════════════════════════════════════════════
      // SECCIÓN: DISPOSITIVO
      // ══════════════════════════════════════════════════════════════════════
      sLabel('Dispositivo entregado');
      row2('Tipo', repair.deviceType, true, 'Marca / Modelo', `${repair.deviceBrand} ${repair.deviceModel}`, true);
      if (repair.serialNumber) {
        const h = drawField('No. de serie', repair.serialNumber, col1, false);
        y += h + 3;
      }

      sep();

      // ══════════════════════════════════════════════════════════════════════
      // SECCIÓN: SERVICIOS (diagnóstico + mano de obra)
      // ══════════════════════════════════════════════════════════════════════
      if (repair.diagnosisFee > 0 || serviceParts.length > 0) {
        sLabel('Servicios');

        const colCant = margin;
        const colDesc = margin + 15;
        const colImp  = pageW - margin;
        const descW   = colImp - colDesc - 4;

        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); txt(...GR4);
        doc.text('CANT.', colCant, y);
        doc.text('DESCRIPCIÓN', colDesc, y);
        doc.text('IMPORTE', colImp, y, { align: 'right' });
        y += 2;
        draw(...SEP); doc.setLineWidth(0.3); doc.line(margin, y, pageW - margin, y);
        y += 4;

        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); txt(...GR9);

        if (repair.diagnosisFee > 0) {
          doc.text('1×', colCant, y);
          doc.text('Diagnóstico', colDesc, y);
          doc.setFont('helvetica', 'bold');
          doc.text(fmt(repair.diagnosisFee), colImp, y, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          y += 6;
          draw(241, 239, 232); doc.setLineWidth(0.2); doc.line(margin, y - 1, pageW - margin, y - 1);
        }

        serviceParts.forEach((p: any) => {
          const name = p.serviceName ?? 'Mano de obra';
          const descLines = doc.splitTextToSize(name, descW);
          const rowH = Math.max(descLines.length * 4.5, 5);
          doc.text('1×', colCant, y);
          doc.text(descLines, colDesc, y);
          doc.setFont('helvetica', 'bold');
          doc.text(fmt(p.unitPrice), colImp, y, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          y += rowH + 2;
          draw(241, 239, 232); doc.setLineWidth(0.2); doc.line(margin, y - 1, pageW - margin, y - 1);
        });

        y += 2;
        sep();
      }

      // ══════════════════════════════════════════════════════════════════════
      // SECCIÓN: PIEZAS UTILIZADAS (tabla)
      // ══════════════════════════════════════════════════════════════════════
      if (inventoryParts.length > 0) {
        sLabel('Piezas utilizadas');

        const colCant = margin;
        const colDesc = margin + 15;
        const colUnit = pageW - margin - 56;
        const colImp  = pageW - margin;
        const descW   = colUnit - colDesc - 4;

        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); txt(...GR4);
        doc.text('CANT.', colCant, y);
        doc.text('DESCRIPCIÓN', colDesc, y);
        doc.text('PRECIO UNIT.', colUnit, y, { align: 'right' });
        doc.text('IMPORTE', colImp, y, { align: 'right' });
        y += 2;
        draw(...SEP); doc.setLineWidth(0.3); doc.line(margin, y, pageW - margin, y);
        y += 4;

        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); txt(...GR9);
        inventoryParts.forEach((p: any) => {
          const name = p.item?.name ?? 'Pieza';
          const descLines = doc.splitTextToSize(name, descW);
          const rowH = Math.max(descLines.length * 4.5, 5);
          doc.text(`${p.quantity}×`, colCant, y);
          doc.text(descLines, colDesc, y);
          doc.text(fmt(p.unitPrice), colUnit, y, { align: 'right' });
          doc.setFont('helvetica', 'bold');
          doc.text(fmt(p.unitPrice * p.quantity), colImp, y, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          y += rowH + 2;
          draw(241, 239, 232); doc.setLineWidth(0.2); doc.line(margin, y - 1, pageW - margin, y - 1);
        });
        y += 2;

        sep();
      }

      // ══════════════════════════════════════════════════════════════════════
      // SECCIÓN: RESUMEN DE COBRO
      // ══════════════════════════════════════════════════════════════════════
      sLabel('Resumen de cobro');

      const cobroRow = (label: string, value: string, opts: { bold?: boolean; muted?: boolean; total?: boolean } = {}) => {
        const { bold, muted, total } = opts;
        doc.setFont('helvetica', (bold || total) ? 'bold' : 'normal');
        doc.setFontSize(total ? 11 : (muted ? 9 : 10));
        if (total) txt(...TEAL_D);
        else if (muted) txt(...GR4);
        else txt(...GR6);
        doc.text(label, margin + 2, y);
        if (total) txt(...TEAL_D);
        else if (muted) txt(...GR4);
        else txt(...GR9);
        doc.setFont('helvetica', 'bold');
        doc.text(value, pageW - margin - 2, y, { align: 'right' });
        y += total ? 7 : 5.5;
      };

      if (repair.diagnosisFee > 0) cobroRow('Diagnóstico', fmt(repair.diagnosisFee));
      if (serviceTotal > 0) cobroRow('Mano de obra', fmt(serviceTotal));
      if (inventoryTotal > 0) cobroRow('Piezas', fmt(inventoryTotal));
      y += 1;
      draw(...SEP); doc.setLineWidth(0.3); doc.line(margin + 2, y, pageW - margin - 2, y);
      y += 4;
      cobroRow('Total', fmt(total), { total: true });
      if (advance > 0) cobroRow('Anticipo recibido', `− ${fmt(advance)}`, { muted: true });
      if (isPaid && advance < total && total > 0) {
        cobroRow('Pago final', `− ${fmt(total - advance)}`, { muted: true });
      }
      y += 2;

      // Caja de saldo (pendiente o liquidado)
      {
        const boxH = 13;
        if (isPaid) {
          fill(...TEAL_L); doc.rect(margin, y, contentW, boxH, 'F');
          fill(...TEAL_M); doc.rect(margin, y, 2, boxH, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); txt(...TEAL_D);
          doc.text('LIQUIDADO', margin + 6, y + 8);
          doc.setFontSize(16);
          doc.text(fmt(0), pageW - margin - 4, y + 9, { align: 'right' });
        } else {
          fill(...WARN_BG); doc.rect(margin, y, contentW, boxH, 'F');
          fill(...WARN_BD); doc.rect(margin, y, 2, boxH, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); txt(...WARN_TX);
          doc.text('SALDO PENDIENTE', margin + 6, y + 8);
          doc.setFontSize(16);
          doc.text(fmt(pending), pageW - margin - 4, y + 9, { align: 'right' });
        }
        y += boxH + 4;
      }

      sep();

      // ══════════════════════════════════════════════════════════════════════
      // SECCIÓN: GARANTÍA (si aplica)
      // ══════════════════════════════════════════════════════════════════════
      const wType = repair.warrantyType ?? 'NONE';
      const wVoided = repair.warrantyVoided ?? false;
      if (wType !== 'NONE') {
        sLabel('Garantía');

        if (wVoided) {
          fill(253, 240, 240); doc.rect(margin, y - 2, contentW, 14, 'F');
          fill(...RED_TX);     doc.rect(margin, y - 2, 2, 14, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); txt(...RED_TX);
          doc.text('Garantía anulada', margin + 6, y + 3);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); txt(...GR6);
          doc.text(repair.warrantyVoided ? 'Equipo alterado después de la entrega.' : '', margin + 6, y + 8);
          y += 16;
        } else {
          const totalDays = wType === 'DAYS_30' ? 30 : 60;
          const start = deliveryDate;
          const expiry = new Date(start.getTime() + totalDays * 24 * 60 * 60 * 1000);
          const fmtD = (d: Date) => d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

          const boxH = 20;
          fill(249, 250, 249); doc.rect(margin, y - 2, contentW, boxH, 'F');
          fill(...TEAL_M);     doc.rect(margin, y - 2, 2, boxH, 'F');
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9); txt(...GR6);
          doc.text(`${totalDays} días naturales en mano de obra y piezas instaladas.`, margin + 6, y + 3);

          doc.setFontSize(7.5); txt(...GR4);
          doc.text('INICIO', margin + 6, y + 10);
          doc.text('VENCE', margin + 40, y + 10);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); txt(...GR9);
          doc.text(fmtD(start), margin + 6, y + 15);
          doc.text(fmtD(expiry), margin + 40, y + 15);
          y += boxH + 2;
        }

        sep();
      }

      // ══════════════════════════════════════════════════════════════════════
      // SECCIÓN: FIRMAS
      // ══════════════════════════════════════════════════════════════════════
      sLabel('Firmas');
      {
        const sigW = (contentW - 8) / 2;
        const sigH = 18;
        const sigY = y;

        // Firma del cliente (izquierda)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); txt(...GR4);
        doc.text('FIRMA DE CONFORMIDAD DEL CLIENTE', col1, sigY);
        draw(...SEP); doc.setLineWidth(0.3);
        doc.roundedRect(col1, sigY + 2, sigW, sigH, 1, 1, 'S');
        doc.setFontSize(9); txt(...GR4);
        doc.text(repair.customer.name, col1, sigY + sigH + 6);

        // Firma del técnico (derecha)
        const techX = col1 + sigW + 8;
        doc.setFontSize(7.5); txt(...GR4);
        doc.text('ENTREGADO POR (TÉCNICO)', techX, sigY);
        draw(...SEP); doc.setLineWidth(0.3);
        doc.roundedRect(techX, sigY + 2, sigW, sigH, 1, 1, 'S');

        y += sigH + 10;
      }

      // ══════════════════════════════════════════════════════════════════════
      // FOOTER
      // ══════════════════════════════════════════════════════════════════════
      const footerY = 282;
      fill(...FT_BG); doc.rect(0, footerY, pageW, 15, 'F');
      draw(...SEP); doc.setLineWidth(0.3);
      doc.line(0, footerY, pageW, footerY);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); txt(...TEAL_D);
      doc.text(repair.ticketNumber, margin, footerY + 8);
      doc.setFont('helvetica', 'normal'); txt(...GRL);
      doc.text(`Gracias por su preferencia — ${biz.name}`, pageW / 2, footerY + 8, { align: 'center' });
      doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pageW - margin, footerY + 8, { align: 'right' });

      window.open(doc.output('bloburl'), '_blank');
    } catch (err) { console.error(err); alert('Error al generar el ticket de entrega.'); }
    finally { setLoadingDelivery(false); }
  };

  // ── INTERNAL LABEL (40×30mm landscape + QR) ─────────────────────────────
  const generateInternalTicket = async () => {
    setLoadingInternal(true);
    try {
      const { jsPDF } = await import('jspdf');
      const QRCode    = await import('qrcode');

      const repairUrl = `${window.location.origin}/repairs/${repair.id}`;
      // QR con margen 0 para aprovechar al máximo el espacio en etiqueta pequeña
      const qrDataUrl = await QRCode.toDataURL(repairUrl, {
        width: 256, margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });

      // 40mm ancho × 30mm alto (landscape)
      const W = 40; const H = 30;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [H, W] });
      // jsPDF con landscape invierte: format[0]=corto, format[1]=largo → 30×40 → landscape = 40×30 ✓

      // ── Fondo negro total ────────────────────────────────────────────────
      doc.setFillColor(10, 10, 10);
      doc.rect(0, 0, W, H, 'F');

      // ── QR — lado derecho, 16×16mm, centrado verticalmente ──────────────
      const QR_SIZE = 16;
      const QR_X   = W - 1.5 - QR_SIZE;   // 22.5mm desde izq.
      const QR_Y   = (H - QR_SIZE) / 2;   // 7mm desde arriba (centrado)
      doc.addImage(qrDataUrl, 'PNG', QR_X, QR_Y, QR_SIZE, QR_SIZE);

      // Texto bajo QR
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4);
      doc.setTextColor(70, 70, 70);
      doc.text('Escanear', QR_X + QR_SIZE / 2, QR_Y + QR_SIZE + 2, { align: 'center' });

      // ── Contenido izquierdo (ancho útil ≈ 19.5mm) ───────────────────────
      const m    = 1.5;
      const leftW = QR_X - m - 1;   // ≈ 20mm

      // Nombre del negocio
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(251, 191, 36);
      const bizName = biz.name.length > 22 ? biz.name.substring(0, 21) + '…' : biz.name;
      doc.text(bizName, m, m + 3);

      // Número de ticket (elemento principal)
      doc.setFont('courier', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text(repair.ticketNumber, m, m + 8.5);

      // Línea separadora
      doc.setDrawColor(35, 35, 35);
      doc.setLineWidth(0.25);
      doc.line(m, m + 10.5, QR_X - 1, m + 10.5);

      // Nombre del cliente
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(210, 210, 210);
      const clientShort = repair.customer.name.length > 21
        ? repair.customer.name.substring(0, 20) + '…'
        : repair.customer.name;
      doc.text(clientShort, m, m + 14);

      // Marca + modelo del dispositivo
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(130, 130, 130);
      const deviceStr = `${repair.deviceBrand} ${repair.deviceModel}`;
      const deviceShort = deviceStr.length > 23 ? deviceStr.substring(0, 22) + '…' : deviceStr;
      doc.text(deviceShort, m, m + 18);

      // Tipo de dispositivo + fecha
      doc.setFontSize(4.5);
      doc.setTextColor(75, 75, 75);
      const fechaLabel = new Date(repair.createdAt).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', year: '2-digit', timeZone: 'America/Mexico_City',
      });
      const typeLabel = repair.deviceType.toUpperCase();
      doc.text(`${typeLabel} · ${fechaLabel}`, m, m + 21.5);

      // ── Borde ámbar ──────────────────────────────────────────────────────
      doc.setDrawColor(251, 191, 36);
      doc.setLineWidth(0.4);
      doc.rect(0.2, 0.2, W - 0.4, H - 0.4);

      window.open(doc.output('bloburl'), '_blank');
    } catch (err) { console.error(err); alert('Error al generar la etiqueta.'); }
    finally { setLoadingInternal(false); }
  };

  // ── TICKET TÉRMICO DE ENTRADA (80mm) ────────────────────────────────────
  const generateThermalEntry = async () => {
    setLoadingThermalEntry(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 280] });
      const pageW = 80; const m = 4; const cW = pageW - m * 2;

      const accessories = JSON.parse(repair.accessories      || '[]') as string[];
      const physCond    = JSON.parse(repair.physicalCondition || '[]') as string[];

      doc.setFillColor(255, 255, 255); doc.rect(0, 0, pageW, 280, 'F');
      let y = 6;

      const line = () => {
        doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3);
        doc.line(m, y, pageW - m, y); y += 3;
      };
      const bold = (size: number) => { doc.setFont('helvetica', 'bold');   doc.setFontSize(size); doc.setTextColor(0, 0, 0); };
      const norm = (size: number) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(40, 40, 40); };
      const muted = (size: number) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(110, 110, 110); };
      const secHeader = (text: string) => { bold(7); doc.text(text, m, y); y += 4.5; };
      const kv = (label: string, value: string) => {
        muted(6.5); doc.text(label, m, y);
        norm(8); const lines = doc.splitTextToSize(value || '—', cW); doc.text(lines, m, y + 3.5);
        y += 3.5 + lines.length * 3.8 + 1.5;
      };

      // Header
      bold(11); doc.text(biz.name, pageW / 2, y, { align: 'center' }); y += 5;
      muted(6.5); doc.text('Taller de Reparación de Dispositivos', pageW / 2, y, { align: 'center' }); y += 3.5;
      const contact = [biz.phone, biz.domain].filter(Boolean).join(' · ');
      if (contact) { doc.text(contact, pageW / 2, y, { align: 'center' }); y += 3.5; }
      y += 1; line();

      bold(8); doc.text('TICKET DE ENTRADA', pageW / 2, y, { align: 'center' }); y += 5;
      line();

      // Folio + fecha
      bold(8); doc.text(repair.ticketNumber, m, y);
      norm(7);
      const fechaStr = new Date(repair.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Mexico_City' });
      const horaStr  = new Date(repair.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' });
      doc.text(`${fechaStr}  ${horaStr}`, pageW - m, y, { align: 'right' }); y += 4;
      if (repair.dueDate) {
        muted(6.5);
        doc.text(`Entrega est.: ${new Date(repair.dueDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Mexico_City' })}`, m, y); y += 4;
      }
      line();

      // Cliente
      secHeader('CLIENTE');
      kv('Nombre', repair.customer.name);
      kv('Teléfono', repair.customer.phone);
      if (repair.customer.email) kv('Correo', repair.customer.email);
      if (repair.contactPreference) kv('Contactar por', CONTACT_LABELS[repair.contactPreference] || repair.contactPreference);
      line();

      // Dispositivo
      secHeader('DISPOSITIVO');
      kv('Tipo', repair.deviceType);
      kv('Marca / Modelo', `${repair.deviceBrand} ${repair.deviceModel}`);
      if (repair.serialNumber) kv('No. de serie', repair.serialNumber);
      if (repair.password && repair.password !== 'N/A') kv('Contraseña', repair.password);
      line();

      // Accesorios
      secHeader('ACCESORIOS ENTREGADOS');
      if (accessories.length > 0) {
        norm(7.5);
        accessories.map(a => ACCESSORY_LABELS[a] || a).forEach(label => {
          doc.text(`• ${label}`, m + 1, y); y += 4;
        });
      } else { muted(7.5); doc.text('Ninguno / N.A.', m + 1, y); y += 4; }
      line();

      // Condición física
      secHeader('ESTADO FÍSICO AL RECIBIR');
      norm(7.5);
      const condText = physCond.map(pc => CONDITION_LABELS[pc] || pc).join(' · ') || 'Sin daños externos';
      const condLines = doc.splitTextToSize(condText, cW); doc.text(condLines, m, y); y += condLines.length * 3.8 + 2;
      if (repair.physicalNotes?.trim()) {
        muted(7); const nLines = doc.splitTextToSize(repair.physicalNotes, cW); doc.text(nLines, m, y); y += nLines.length * 3.8 + 1;
      }
      line();

      // Problema
      secHeader('PROBLEMA REPORTADO');
      norm(7.5);
      const issLines = doc.splitTextToSize(repair.issue, cW); doc.text(issLines, m, y); y += issLines.length * 3.8 + 2;
      if (repair.serviceType) {
        const sLabel = SERVICE_LABELS[repair.serviceType] || repair.serviceType;
        bold(7); doc.text(`Tipo: `, m, y); norm(7); doc.text(sLabel, m + doc.getTextWidth('Tipo: ') + 0.5, y); y += 4;
      }
      if (repair.authorizedDiagnosis) {
        muted(6.5); doc.text('Autorizó diagnóstico y cargos adicionales', m, y); y += 4;
      }
      line();

      // Diagnóstico estimado
      secHeader('DIAGNÓSTICO ESTIMADO');
      bold(10); doc.text(repair.diagnosisFee > 0 ? fmt(repair.diagnosisFee) : 'Por cotizar', m, y); y += 5;
      muted(6.5); doc.text('Mano de obra y piezas pueden generar cargos adicionales.', m, y); y += 4;
      line();

      // Términos
      secHeader('TÉRMINOS Y CONDICIONES');
      muted(6.5);
      [
        'Tiempo estimado: 3–7 días hábiles, sujeto a disponibilidad de piezas.',
        `${biz.name} no se responsabiliza por pérdida de datos. Respalde su información.`,
        'Equipos no reclamados después de 30 días generarán cargo por almacenaje.',
      ].forEach((term, i) => {
        const tLines = doc.splitTextToSize(`${i + 1}. ${term}`, cW);
        doc.text(tLines, m, y); y += tLines.length * 3.5 + 1.5;
      });
      line();

      // Firma
      secHeader('FIRMA DEL CLIENTE');
      const sigH = 18;
      doc.setFillColor(255, 255, 255); doc.rect(m, y, cW, sigH, 'F');
      if (repair.clientSignature && repair.clientSignature.length > 50) {
        try { doc.addImage(repair.clientSignature, 'PNG', m, y, cW, sigH); } catch {}
      }
      doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.3);
      doc.rect(m, y, cW, sigH);
      y += sigH + 2;
      norm(7.5); doc.text(repair.customer.name, m, y); y += 5;
      line();

      // Footer
      bold(7); doc.text(repair.ticketNumber, m, y);
      muted(6.5); doc.text('Conserve este comprobante para reclamar su equipo.', pageW / 2, y + 3.5, { align: 'center' });

      window.open(doc.output('bloburl'), '_blank');
    } catch (err) { console.error(err); alert('Error al generar el ticket térmico.'); }
    finally { setLoadingThermalEntry(false); }
  };

  // ── TICKET TÉRMICO DE SALIDA (80mm) ─────────────────────────────────────
  const generateThermalExit = async () => {
    setLoadingThermalExit(true);
    try {
      const partsRes = await fetch(`/api/repairs/${repair.id}/parts`);
      const allPartsT: any[] = partsRes.ok ? await partsRes.json() : [];
      const invPartsT  = allPartsT.filter((p: any) => !p.isService);
      const svcPartsT  = allPartsT.filter((p: any) => p.isService);
      const invTotalT  = invPartsT.reduce((s: number, p: any) => s + p.unitPrice * p.quantity, 0);
      const svcTotalT  = svcPartsT.reduce((s: number, p: any) => s + p.unitPrice * p.quantity, 0);
      const total      = repair.diagnosisFee + svcTotalT + invTotalT;
      const payments   = repair.payments ?? [];
      const totalPaid  = payments.length > 0
        ? payments.reduce((s, p) => s + p.amount, 0)
        : (repair.advancePayment ?? 0);
      const pending    = Math.max(0, total - totalPaid);
      const isPaid     = pending <= 0 && total > 0;
      const deliveryDate = repair.deliveredAt ? new Date(repair.deliveredAt) : new Date();

      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 260] });
      const pageW = 80; const m = 4; const cW = pageW - m * 2;

      doc.setFillColor(255, 255, 255); doc.rect(0, 0, pageW, 260, 'F');
      let y = 6;

      const line = () => {
        doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3);
        doc.line(m, y, pageW - m, y); y += 3;
      };
      const bold  = (size: number) => { doc.setFont('helvetica', 'bold');   doc.setFontSize(size); doc.setTextColor(0, 0, 0); };
      const norm  = (size: number) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(40, 40, 40); };
      const muted = (size: number) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(110, 110, 110); };
      const PAYMENT_LABELS_T: Record<string, string> = { CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', OTHER: 'Otro', UNKNOWN: 'N/E' };

      // Header
      bold(11); doc.text(biz.name, pageW / 2, y, { align: 'center' }); y += 5;
      muted(6.5); doc.text('Taller de Reparación de Dispositivos', pageW / 2, y, { align: 'center' }); y += 3.5;
      const contact = [biz.phone, biz.domain].filter(Boolean).join(' · ');
      if (contact) { doc.text(contact, pageW / 2, y, { align: 'center' }); y += 3.5; }
      y += 1; line();

      // Título + estado
      bold(8); doc.text('TICKET DE SALIDA', pageW / 2, y, { align: 'center' }); y += 4.5;
      bold(7); const statusTxt = isPaid ? '✓ LIQUIDADO' : '⚠ SALDO PENDIENTE';
      doc.text(statusTxt, pageW / 2, y, { align: 'center' }); y += 4;
      line();

      // Folio + fecha
      bold(8); doc.text(repair.ticketNumber, m, y);
      norm(7);
      const fechaStr = deliveryDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Mexico_City' });
      doc.text(fechaStr, pageW - m, y, { align: 'right' }); y += 5;
      line();

      // Cliente
      bold(7); doc.text('CLIENTE', m, y); y += 4;
      bold(8); doc.text(repair.customer.name, m, y); y += 4;
      norm(7.5); doc.text(repair.customer.phone, m, y); y += 4;
      line();

      // Dispositivo
      bold(7); doc.text('DISPOSITIVO', m, y); y += 4;
      norm(8); doc.text(`${repair.deviceType}  ·  ${repair.deviceBrand} ${repair.deviceModel}`, m, y); y += 4;
      if (repair.serialNumber) { muted(6.5); doc.text(`N/S: ${repair.serialNumber}`, m, y); y += 3.5; }
      line();

      // Servicios (diagnóstico + mano de obra)
      if (repair.diagnosisFee > 0 || svcPartsT.length > 0) {
        bold(7); doc.text('SERVICIOS', m, y); y += 4;
        if (repair.diagnosisFee > 0) {
          norm(7.5);
          doc.text('Diagnóstico', m, y);
          bold(7.5); doc.text(fmt(repair.diagnosisFee), pageW - m, y, { align: 'right' });
          doc.setFont('helvetica', 'normal'); y += 4.5;
        }
        svcPartsT.forEach((p: any) => {
          norm(7.5);
          const nameLines = doc.splitTextToSize(p.serviceName ?? 'Mano de obra', cW - 18);
          doc.text(nameLines, m, y);
          bold(7.5); doc.text(fmt(p.unitPrice), pageW - m, y, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          y += nameLines.length * 3.8 + 1.5;
        });
        line();
      }

      // Piezas de inventario
      if (invPartsT.length > 0) {
        bold(7); doc.text('PIEZAS UTILIZADAS', m, y); y += 4;
        invPartsT.forEach((p: any) => {
          norm(7.5);
          const name = p.item?.name ?? 'Pieza';
          const nameLines = doc.splitTextToSize(`${p.quantity}× ${name}`, cW - 18);
          doc.text(nameLines, m, y);
          bold(7.5); doc.text(fmt(p.unitPrice * p.quantity), pageW - m, y, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          y += nameLines.length * 3.8 + 1.5;
        });
        line();
      }

      // Resumen de cobro
      bold(7); doc.text('RESUMEN DE COBRO', m, y); y += 4.5;
      const cobroRow = (label: string, value: string, isBold = false) => {
        if (isBold) bold(8); else norm(7.5);
        doc.text(label, m, y);
        if (isBold) bold(8); else norm(7.5);
        doc.text(value, pageW - m, y, { align: 'right' }); y += 4.5;
      };
      if (repair.diagnosisFee > 0) cobroRow('Diagnóstico', fmt(repair.diagnosisFee));
      if (svcTotalT > 0) cobroRow('Mano de obra', fmt(svcTotalT));
      if (invTotalT > 0) cobroRow('Piezas', fmt(invTotalT));
      doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.4);
      doc.line(m, y, pageW - m, y); y += 3;
      cobroRow('TOTAL', fmt(total), true);
      y += 1;

      // Cobros / saldo
      if (payments.length > 0) {
        muted(6.5); doc.text('COBROS REGISTRADOS', m, y); y += 4;
        payments.forEach(p => {
          const pFecha = new Date(p.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', timeZone: 'America/Mexico_City' });
          norm(7);
          doc.text(`+ ${fmt(p.amount)}  ${PAYMENT_LABELS_T[p.paymentMethod] ?? p.paymentMethod}`, m, y);
          muted(6.5); doc.text(pFecha, pageW - m, y, { align: 'right' }); y += 4;
        });
        doc.setDrawColor(140, 140, 140); doc.setLineWidth(0.3); doc.line(m, y, pageW - m, y); y += 3;
      } else if (totalPaid > 0) {
        norm(7.5); doc.text('Anticipo recibido', m, y);
        doc.text(fmt(totalPaid), pageW - m, y, { align: 'right' }); y += 4.5;
      }

      bold(9);
      if (isPaid) {
        doc.text('LIQUIDADO', m, y); doc.text(fmt(0), pageW - m, y, { align: 'right' });
      } else {
        doc.text('SALDO PENDIENTE', m, y); doc.text(fmt(pending), pageW - m, y, { align: 'right' });
      }
      y += 6;
      line();

      // Garantía
      const wType   = repair.warrantyType ?? 'NONE';
      const wVoided = repair.warrantyVoided ?? false;
      if (wType !== 'NONE') {
        bold(7); doc.text('GARANTÍA', m, y); y += 4;
        if (wVoided) {
          bold(7.5); doc.setTextColor(160, 0, 0); doc.text('Garantía anulada (equipo alterado)', m, y); y += 4;
          doc.setTextColor(0, 0, 0);
        } else {
          const totalDays = wType === 'DAYS_30' ? 30 : 60;
          const expiry    = new Date(deliveryDate.getTime() + totalDays * 24 * 60 * 60 * 1000);
          const fmtD = (d: Date) => d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Mexico_City' });
          norm(7.5); doc.text(`${totalDays} días naturales en mano de obra y piezas.`, m, y); y += 4;
          muted(6.5);
          doc.text(`Inicio: ${fmtD(deliveryDate)}`, m, y);
          doc.text(`Vence: ${fmtD(expiry)}`, pageW - m, y, { align: 'right' }); y += 4;
        }
        line();
      }

      // Firmas
      bold(7); doc.text('FIRMAS', m, y); y += 4;
      const sigW = (cW - 4) / 2;
      const sigH = 16;

      muted(6); doc.text('CONFORMIDAD DEL CLIENTE', m, y);
      doc.text('ENTREGADO POR (TÉCNICO)', m + sigW + 4, y); y += 2;

      doc.setFillColor(255, 255, 255);
      doc.rect(m, y, sigW, sigH, 'F');
      doc.rect(m + sigW + 4, y, sigW, sigH, 'F');
      doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.3);
      doc.rect(m, y, sigW, sigH);
      doc.rect(m + sigW + 4, y, sigW, sigH);
      y += sigH + 2;

      norm(7); doc.text(repair.customer.name, m, y); y += 6;
      line();

      // Footer
      bold(7); doc.text(repair.ticketNumber, m, y);
      muted(6.5); doc.text(`Gracias por su preferencia — ${biz.name}`, pageW / 2, y + 3.5, { align: 'center' });

      window.open(doc.output('bloburl'), '_blank');
    } catch (err) { console.error(err); alert('Error al generar el ticket térmico.'); }
    finally { setLoadingThermalExit(false); }
  };

  return (
    <div className="flex flex-col gap-2">
      <button onClick={generateThermalEntry} disabled={loadingThermalEntry} className="btn-primary w-full justify-center disabled:opacity-50">
        {loadingThermalEntry ? <><Loader2 size={14} className="animate-spin" /> Generando...</> : <><Printer size={14} /> Ticket de entrada (80mm)</>}
      </button>
      <button onClick={generateThermalExit} disabled={loadingThermalExit} className="btn-primary w-full justify-center disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #065f46, #047857)' }}>
        {loadingThermalExit ? <><Loader2 size={14} className="animate-spin" /> Generando...</> : <><FileCheck size={14} /> Ticket de salida (80mm)</>}
      </button>
      <div className="border-t border-[#1a1a1a] pt-2 flex flex-col gap-2">
        <p className="text-[10px] text-[#444] font-mono uppercase tracking-wide">Formato A4</p>
        <button onClick={generateClientTicket} disabled={loadingClient} className="btn-secondary w-full justify-center disabled:opacity-50">
          {loadingClient ? <><Loader2 size={14} className="animate-spin" /> Generando...</> : <><Printer size={14} /> Nota de entrada</>}
        </button>
        <button onClick={generateDeliveryTicket} disabled={loadingDelivery} className="btn-secondary w-full justify-center disabled:opacity-50">
          {loadingDelivery ? <><Loader2 size={14} className="animate-spin" /> Generando...</> : <><FileCheck size={14} /> Nota de salida</>}
        </button>
      </div>
      <button onClick={generateInternalTicket} disabled={loadingInternal} className="btn-secondary w-full justify-center disabled:opacity-50">
        {loadingInternal ? <><Loader2 size={14} className="animate-spin" /> Generando...</> : <><Tag size={14} /> Etiqueta interna + QR</>}
      </button>
    </div>
  );
}
