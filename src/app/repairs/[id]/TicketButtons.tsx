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
  laborCost: number;
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
  const [loadingClient,   setLoadingClient]   = useState(false);
  const [loadingInternal, setLoadingInternal] = useState(false);
  const [loadingDelivery, setLoadingDelivery] = useState(false);

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
      doc.text('Costo estimado de mano de obra', margin, y + 6.5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); txt(...TEAL_M);
      doc.text('Las piezas pueden generar cargos adicionales', margin, y + 11.5);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(20); txt(...TEAL_D);
      doc.text(
        repair.laborCost > 0 ? fmt(repair.laborCost) : 'Por cotizar',
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

  // ── DELIVERY TICKET (A4 full summary) ────────────────────────────────────
  const generateDeliveryTicket = async () => {
    setLoadingDelivery(true);
    try {
      const [partsRes, salesRes] = await Promise.all([
        fetch(`/api/repairs/${repair.id}/parts`),
        fetch(`/api/sales?repairId=${repair.id}`),
      ]);
      const parts: any[] = partsRes.ok ? await partsRes.json() : [];
      const sales: any[] = salesRes.ok ? await salesRes.json() : [];

      const partsTotal = parts.reduce((s: number, p: any) => s + p.unitPrice * p.quantity, 0);
      const salesTotal = sales.reduce((s: number, sale: any) => s + sale.total, 0);
      const total      = repair.laborCost + partsTotal + salesTotal;
      const advance    = repair.advancePayment ?? 0;
      const pending    = Math.max(0, total - advance);

      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210; const margin = 18; const contentW = pageW - margin * 2;
      let y = 0;

      doc.setFillColor(10, 10, 10); doc.rect(0, 0, pageW, 38, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(251, 191, 36);
      doc.text(biz.name, margin, 16);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 150, 150);
      doc.text('TALLER DE REPARACIÓN DE DISPOSITIVOS', margin, 22);
      const contactLine2 = [biz.phone, biz.domain].filter(Boolean).join(' · ');
      doc.text(contactLine2 || 'Mérida, Yucatán', margin, 27);
      doc.setFont('courier', 'bold'); doc.setFontSize(11); doc.setTextColor(251, 191, 36);
      doc.text(repair.ticketNumber, pageW - margin, 16, { align: 'right' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120, 120, 120);
      doc.text('COMPROBANTE DE ENTREGA', pageW - margin, 21, { align: 'right' });
      doc.text(new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }), pageW - margin, 26, { align: 'right' });

      y = 46;
      const section = (title: string) => {
        doc.setFillColor(245, 245, 245); doc.rect(margin, y, contentW, 7, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(80, 80, 80);
        doc.text(title.toUpperCase(), margin + 3, y + 5); y += 11;
      };
      const row = (label: string, value: string, bold = false) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(100, 100, 100);
        doc.text(label, margin + 2, y);
        doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(30, 30, 30);
        const lines = doc.splitTextToSize(value || '—', contentW - 55);
        doc.text(lines, margin + 52, y); y += Math.max(lines.length * 5.5, 6.5);
      };

      section('Datos del cliente');
      row('Nombre:', repair.customer.name, true);
      row('Teléfono:', repair.customer.phone);
      y += 2;

      section('Dispositivo entregado');
      row('Tipo:', repair.deviceType);
      row('Marca / Modelo:', `${repair.deviceBrand} ${repair.deviceModel}`, true);
      if (repair.serialNumber) row('No. Serie:', repair.serialNumber);
      if (repair.diagnosis) { y += 2; row('Diagnóstico:', repair.diagnosis); }
      y += 2;

      if (parts.length > 0) {
        section('Piezas utilizadas');
        parts.forEach(p => { row(`${p.quantity}x ${p.item?.name ?? 'Pieza'}`, fmt(p.unitPrice * p.quantity)); });
        y += 2;
      }

      if (sales.length > 0) {
        section('Productos vendidos');
        sales.forEach(sale => {
          sale.items?.forEach((i: any) => { row(`${i.quantity}x ${i.name}`, fmt(i.unitPrice * i.quantity)); });
        });
        y += 2;
      }

      section('Resumen de cobro');
      doc.setFillColor(250, 250, 250); doc.rect(margin, y, contentW, 50, 'F');
      doc.setDrawColor(220, 220, 220); doc.rect(margin, y, contentW, 50, 'S');

      const sumRow = (label: string, value: string, highlight = false) => {
        doc.setFont('helvetica', highlight ? 'bold' : 'normal');
        doc.setFontSize(highlight ? 10 : 8.5);
        doc.setTextColor(highlight ? 30 : 80, highlight ? 30 : 80, highlight ? 30 : 80);
        doc.text(label, margin + 4, y + 6);
        if (highlight) doc.setTextColor(180, 120, 10);
        doc.text(value, pageW - margin - 4, y + 6, { align: 'right' });
        y += 9;
      };

      y += 2;
      sumRow('Mano de obra', fmt(repair.laborCost));
      if (partsTotal > 0) sumRow('Piezas', fmt(partsTotal));
      if (salesTotal > 0) sumRow('Productos vendidos', fmt(salesTotal));
      doc.setDrawColor(200, 200, 200); doc.line(margin + 4, y + 2, pageW - margin - 4, y + 2); y += 4;
      sumRow('TOTAL', fmt(total), true);
      if (advance > 0) sumRow('Anticipo recibido', `- ${fmt(advance)}`);
      doc.setDrawColor(200, 200, 200); doc.line(margin + 4, y + 2, pageW - margin - 4, y + 2); y += 4;
      sumRow(pending > 0 ? 'SALDO PENDIENTE' : '✓ PAGADO', pending > 0 ? fmt(pending) : fmt(total), true);
      y += 8;

      // ── Garantía ───────────────────────────────────────────────────────────
      const wType = repair.warrantyType ?? 'NONE';
      const wVoided = repair.warrantyVoided ?? false;
      if (wType !== 'NONE') {
        y += 4;
        doc.setFillColor(245, 245, 245); doc.rect(margin, y, contentW, 7, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(80, 80, 80);
        doc.text('GARANTÍA', margin + 3, y + 5); y += 11;

        if (wVoided) {
          doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(180, 50, 50);
          doc.text('Garantía anulada — equipo alterado.', margin + 2, y);
          y += 7;
        } else {
          const totalDays = wType === 'DAYS_30' ? 30 : 60;
          const deliveredDate = repair.deliveredAt ? new Date(repair.deliveredAt) : new Date();
          const expiryDate = new Date(deliveredDate.getTime() + totalDays * 24 * 60 * 60 * 1000);
          const expiryStr = expiryDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
          const startStr = deliveredDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

          doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(30, 30, 30);
          doc.text(`${totalDays} días naturales en mano de obra y piezas instaladas.`, margin + 2, y); y += 6;
          doc.setFontSize(8); doc.setTextColor(100, 100, 100);
          doc.text(`Inicio: ${startStr}   Vence: ${expiryStr}`, margin + 2, y); y += 7;
        }
      }
      y += 4;

      doc.setDrawColor(180, 180, 180);
      doc.line(margin, y + 14, margin + 70, y + 14);
      doc.setFontSize(7.5); doc.setTextColor(100, 100, 100);
      doc.text('Firma de conformidad del cliente', margin, y + 19);
      doc.text(repair.customer.name, margin, y + 23);
      doc.line(pageW - margin - 70, y + 14, pageW - margin, y + 14);
      doc.text('Entregado por (técnico)', pageW - margin - 70, y + 19);

      doc.setFillColor(10, 10, 10); doc.rect(0, 285, pageW, 12, 'F');
      doc.setFont('courier', 'bold'); doc.setFontSize(7); doc.setTextColor(251, 191, 36);
      doc.text(repair.ticketNumber, margin, 291);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
      doc.text(`Gracias por su preferencia — ${biz.name}`, pageW / 2, 291, { align: 'center' });
      doc.text(`${new Date().toLocaleString('es-MX')}`, pageW - margin, 291, { align: 'right' });

      window.open(doc.output('bloburl'), '_blank');
    } catch (err) { console.error(err); alert('Error al generar el ticket de entrega.'); }
    finally { setLoadingDelivery(false); }
  };

  // ── INTERNAL LABEL (100×70mm + QR) ───────────────────────────────────────
  const generateInternalTicket = async () => {
    setLoadingInternal(true);
    try {
      const { jsPDF } = await import('jspdf');
      const QRCode = await import('qrcode');
      const repairUrl = `${window.location.origin}/repairs/${repair.id}`;
      const qrDataUrl = await QRCode.toDataURL(repairUrl, { width: 200, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [100, 70] });

      doc.setFillColor(10, 10, 10); doc.rect(0, 0, 100, 70, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(251, 191, 36);
      doc.text(biz.name, 5, 8);
      doc.setFont('courier', 'bold'); doc.setFontSize(22); doc.setTextColor(255, 255, 255);
      doc.text(repair.ticketNumber, 5, 22);
      doc.setDrawColor(40, 40, 40); doc.line(5, 25, 68, 25);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(220, 220, 220);
      const clientLines = doc.splitTextToSize(repair.customer.name, 62);
      doc.text(clientLines, 5, 32);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(160, 160, 160);
      const deviceLines = doc.splitTextToSize(`${repair.deviceBrand} ${repair.deviceModel}`, 62);
      doc.text(deviceLines, 5, 40);
      doc.setFillColor(30, 30, 30); doc.roundedRect(5, 44, 30, 6, 1, 1, 'F');
      doc.setFontSize(6.5); doc.setTextColor(150, 150, 150);
      doc.text(repair.deviceType.toUpperCase(), 20, 48.5, { align: 'center' });
      doc.setFontSize(6); doc.setTextColor(80, 80, 80);
      doc.text(new Date(repair.createdAt).toLocaleDateString('es-MX'), 5, 57);
      doc.text('ESCANEAR PARA VER ORDEN', 5, 63);
      doc.addImage(qrDataUrl, 'PNG', 68, 4, 28, 28);
      doc.setFontSize(5.5); doc.setTextColor(80, 80, 80);
      doc.text('Abrir en sistema', 82, 35, { align: 'center' });
      doc.setDrawColor(251, 191, 36); doc.setLineWidth(0.8);
      doc.rect(0.4, 0.4, 99.2, 69.2);

      window.open(doc.output('bloburl'), '_blank');
    } catch (err) { console.error(err); alert('Error al generar la etiqueta.'); }
    finally { setLoadingInternal(false); }
  };

  return (
    <div className="flex flex-col gap-2">
      <button onClick={generateClientTicket} disabled={loadingClient} className="btn-primary w-full justify-center disabled:opacity-50">
        {loadingClient ? <><Loader2 size={14} className="animate-spin" /> Generando...</> : <><Printer size={14} /> Ticket entrada (A4)</>}
      </button>
      <button onClick={generateDeliveryTicket} disabled={loadingDelivery} className="btn-primary w-full justify-center disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #065f46, #047857)' }}>
        {loadingDelivery ? <><Loader2 size={14} className="animate-spin" /> Generando...</> : <><FileCheck size={14} /> Ticket entrega (A4)</>}
      </button>
      <button onClick={generateInternalTicket} disabled={loadingInternal} className="btn-secondary w-full justify-center disabled:opacity-50">
        {loadingInternal ? <><Loader2 size={14} className="animate-spin" /> Generando...</> : <><Tag size={14} /> Etiqueta interna + QR</>}
      </button>
    </div>
  );
}
