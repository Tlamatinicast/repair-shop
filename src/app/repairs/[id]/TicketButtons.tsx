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

export function TicketButtons({ repair }: { repair: Repair }) {
  const [loadingClient,   setLoadingClient]   = useState(false);
  const [loadingInternal, setLoadingInternal] = useState(false);
  const [loadingDelivery, setLoadingDelivery] = useState(false);

  // ── CLIENT TICKET (A4 intake) ────────────────────────────────────────────
  const generateClientTicket = async () => {
    setLoadingClient(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210; const margin = 15; const contentW = pageW - margin * 2;
      let y = 0;

      const accessories     = JSON.parse(repair.accessories     || '[]') as string[];
      const physicalCond    = JSON.parse(repair.physicalCondition || '[]') as string[];
      const accessoryLabels = accessories.map(a => ACCESSORY_LABELS[a] || a).join(', ') || '—';
      const conditionLabels = physicalCond.map(c => CONDITION_LABELS[c] || c).join(', ') || '—';

      // ── Header ──────────────────────────────────────────────────────────
      doc.setFillColor(10, 10, 10);
      doc.rect(0, 0, pageW, 42, 'F');

      doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(251, 191, 36);
      doc.text('TLAMATECH', margin, 14);
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120);
      doc.text('TALLER DE REPARACIÓN DE DISPOSITIVOS ELECTRÓNICOS', margin, 20);
      doc.text('Mérida, Yucatán · tlamatech.com', margin, 25.5);
      doc.setFontSize(7); doc.setTextColor(80, 80, 80);
      doc.text('ORDEN DE RECEPCIÓN', margin, 35);

      // Folio grande a la derecha
      doc.setFont('courier', 'bold'); doc.setFontSize(22); doc.setTextColor(251, 191, 36);
      doc.text(repair.ticketNumber, pageW - margin, 18, { align: 'right' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(120, 120, 120);
      doc.text(new Date(repair.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }), pageW - margin, 25, { align: 'right' });
      if (repair.dueDate) {
        doc.setTextColor(251, 191, 36);
        doc.text(`Entrega est.: ${new Date(repair.dueDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageW - margin, 31, { align: 'right' });
      }

      y = 50;

      const sectionHeader = (title: string) => {
        doc.setFillColor(22, 22, 22); doc.rect(margin, y, contentW, 6.5, 'F');
        doc.setDrawColor(40, 40, 40); doc.rect(margin, y, contentW, 6.5, 'S');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(160, 120, 40);
        doc.text(title.toUpperCase(), margin + 3, y + 4.5);
        y += 10;
      };

      const row = (label: string, value: string, bold = false) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 120, 120);
        doc.text(label, margin + 2, y);
        doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(220, 220, 220);
        const lines = doc.splitTextToSize(value || '—', contentW - 52);
        doc.text(lines, margin + 52, y);
        y += Math.max(lines.length * 5.2, 6);
      };

      // ── Cliente ─────────────────────────────────────────────────────────
      sectionHeader('Datos del cliente');
      row('Nombre:', repair.customer.name, true);
      row('Teléfono:', repair.customer.phone);
      if (repair.customer.email) row('Correo:', repair.customer.email);
      if (repair.contactPreference) row('Contactar por:', CONTACT_LABELS[repair.contactPreference] || repair.contactPreference);
      y += 2;

      // ── Dispositivo ─────────────────────────────────────────────────────
      sectionHeader('Dispositivo recibido');
      row('Tipo:', repair.deviceType);
      row('Marca / Modelo:', `${repair.deviceBrand} ${repair.deviceModel}`, true);
      if (repair.serialNumber) row('No. Serie:', repair.serialNumber);
      if (repair.password && repair.password !== 'N/A') row('Contraseña:', repair.password);
      y += 2;

      // ── Accesorios ──────────────────────────────────────────────────────
      sectionHeader('Accesorios entregados');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(220, 220, 220);
      const accLines = doc.splitTextToSize(accessoryLabels, contentW - 6);
      doc.text(accLines, margin + 3, y);
      y += accLines.length * 5.2 + 4;

      // ── Estado físico ────────────────────────────────────────────────────
      sectionHeader('Estado físico al recibir');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(220, 220, 220);
      const condLines = doc.splitTextToSize(conditionLabels, contentW - 6);
      doc.text(condLines, margin + 3, y);
      y += condLines.length * 5.2 + 2;
      if (repair.physicalNotes && repair.physicalNotes.trim()) {
        doc.setTextColor(150, 150, 150); doc.setFontSize(7.5);
        doc.text('Obs.:', margin + 3, y);
        const notesLines = doc.splitTextToSize(repair.physicalNotes, contentW - 18);
        doc.text(notesLines, margin + 14, y);
        y += notesLines.length * 5 + 2;
      }
      y += 2;

      // ── Problema ─────────────────────────────────────────────────────────
      sectionHeader('Problema reportado');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(220, 220, 220);
      const issueLines = doc.splitTextToSize(repair.issue, contentW - 6);
      doc.text(issueLines, margin + 3, y);
      y += issueLines.length * 5.2 + 4;

      // ── Servicio y costo ─────────────────────────────────────────────────
      sectionHeader('Tipo de servicio y costo estimado');
      if (repair.serviceType) row('Tipo de servicio:', SERVICE_LABELS[repair.serviceType] || repair.serviceType);
      doc.setFillColor(20, 15, 5); doc.rect(margin, y, contentW, 10, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(120, 120, 120);
      doc.text('Costo estimado de mano de obra:', margin + 3, y + 6.5);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(251, 191, 36);
      doc.text(repair.laborCost > 0 ? fmt(repair.laborCost) : 'Por cotizar', pageW - margin - 3, y + 7, { align: 'right' });
      y += 14;

      doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
      doc.text('* Las piezas pueden generar cargos adicionales.', margin + 3, y);
      y += 5;

      if (repair.authorizedDiagnosis) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(80, 160, 80);
        doc.text('✓ Cliente autorizó diagnóstico y cargos adicionales', margin + 3, y);
        y += 6;
      }
      y += 3;

      // ── Términos condensados ─────────────────────────────────────────────
      doc.setFontSize(6.5); doc.setTextColor(70, 70, 70); doc.setFont('helvetica', 'bold');
      doc.text('TÉRMINOS Y CONDICIONES:', margin, y); y += 4;
      doc.setFont('helvetica', 'normal');
      [
        '1. Tiempo estimado: 3–7 días hábiles, sujeto a disponibilidad de piezas.',
        '2. TLAMATECH no se responsabiliza por pérdida de datos. Respalde su información.',
        '3. Equipos no reclamados después de 30 días generarán cargo por almacenaje.',
        '4. Garantía: 30 días en mano de obra y 90 días en piezas instaladas.',
      ].forEach(t => {
        const tl = doc.splitTextToSize(t, contentW);
        doc.text(tl, margin, y);
        y += tl.length * 3.8 + 1;
      });
      y += 4;

      // ── Firma ────────────────────────────────────────────────────────────
      if (repair.clientSignature && repair.clientSignature.length > 50) {
        sectionHeader('Firma del cliente');
        try {
          doc.addImage(repair.clientSignature, 'PNG', margin + 2, y, 80, 22);
        } catch {}
        y += 26;
        doc.setDrawColor(60, 60, 60);
        doc.line(margin + 2, y, margin + 82, y);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 100, 100);
        doc.text(repair.customer.name, margin + 2, y + 4);
        y += 8;
      } else {
        y += 6;
        doc.setDrawColor(60, 60, 60);
        doc.line(margin, y + 16, margin + 80, y + 16);
        doc.line(pageW - margin - 70, y + 16, pageW - margin, y + 16);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 100, 100);
        doc.text('Firma del cliente', margin, y + 21);
        doc.text(repair.customer.name, margin, y + 25);
        doc.text('Recibido por (técnico)', pageW - margin - 70, y + 21);
        y += 28;
      }

      // ── Footer ───────────────────────────────────────────────────────────
      doc.setFillColor(10, 10, 10); doc.rect(0, 285, pageW, 12, 'F');
      doc.setFont('courier', 'bold'); doc.setFontSize(7); doc.setTextColor(251, 191, 36);
      doc.text(repair.ticketNumber, margin, 291);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
      doc.text('Conserve este comprobante para reclamar su equipo.', pageW / 2, 291, { align: 'center' });
      doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pageW - margin, 291, { align: 'right' });

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
      doc.text('TLAMATECH', margin, 16);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 150, 150);
      doc.text('TALLER DE REPARACIÓN DE DISPOSITIVOS', margin, 22);
      doc.text('Mérida, Yucatán · tlamatech.com', margin, 27);
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
      doc.text('Gracias por su preferencia — TLAMATECH', pageW / 2, 291, { align: 'center' });
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
      doc.text('TLAMATECH', 5, 8);
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
