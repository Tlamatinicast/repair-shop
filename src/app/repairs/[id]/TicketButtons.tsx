'use client';

import { useState } from 'react';
import { Printer, Tag } from 'lucide-react';

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
  status: string;
  createdAt: string;
  customer: {
    name: string;
    phone: string;
    email?: string | null;
    address?: string | null;
  };
}

export function TicketButtons({ repair }: { repair: Repair }) {
  const [loadingClient, setLoadingClient] = useState(false);
  const [loadingInternal, setLoadingInternal] = useState(false);

  const generateClientTicket = async () => {
    setLoadingClient(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageW = 210;
      const margin = 18;
      const contentW = pageW - margin * 2;
      let y = 0;

      // ── Header band ──────────────────────────────────────
      doc.setFillColor(10, 10, 10);
      doc.rect(0, 0, pageW, 38, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(251, 191, 36); // amber
      doc.text('TLAMATECH', margin, 16);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text('TALLER DE REPARACIÓN DE DISPOSITIVOS', margin, 22);
      doc.text('Mérida, Yucatán · tlamatech.com', margin, 27);

      // Ticket number top right
      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(251, 191, 36);
      doc.text(repair.ticketNumber, pageW - margin, 16, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text('ORDEN DE RECEPCIÓN', pageW - margin, 21, { align: 'right' });

      // Date
      const dateStr = new Date(repair.createdAt).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'long', year: 'numeric',
      });
      doc.text(dateStr, pageW - margin, 26, { align: 'right' });

      y = 46;

      // ── Section helper ───────────────────────────────────
      const section = (title: string) => {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y, contentW, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(80, 80, 80);
        doc.text(title.toUpperCase(), margin + 3, y + 5);
        y += 11;
      };

      const row = (label: string, value: string, bold = false) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 100, 100);
        doc.text(label, margin + 2, y);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(30, 30, 30);
        const lines = doc.splitTextToSize(value || '—', contentW - 55);
        doc.text(lines, margin + 52, y);
        y += Math.max(lines.length * 5.5, 6.5);
      };

      // ── Client info ──────────────────────────────────────
      section('Datos del cliente');
      row('Nombre:', repair.customer.name, true);
      row('Teléfono:', repair.customer.phone);
      if (repair.customer.email) row('Correo:', repair.customer.email);
      if (repair.customer.address) row('Dirección:', repair.customer.address);
      y += 3;

      // ── Device info ──────────────────────────────────────
      section('Dispositivo recibido');
      row('Tipo:', repair.deviceType);
      row('Marca / Modelo:', `${repair.deviceBrand} ${repair.deviceModel}`, true);
      if (repair.serialNumber) row('No. Serie:', repair.serialNumber);
      y += 3;

      // ── Problem ──────────────────────────────────────────
      section('Problema reportado');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);
      const issueLines = doc.splitTextToSize(repair.issue, contentW - 6);
      doc.text(issueLines, margin + 3, y);
      y += issueLines.length * 5.5 + 5;

      // ── Physical condition box ────────────────────────────
      section('Condición física del equipo');
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, y, contentW, 20, 'S');
      doc.setFontSize(7.5);
      doc.setTextColor(160, 160, 160);
      doc.text('Observaciones del técnico al momento de recibir el equipo:', margin + 3, y + 5);
      y += 24;

      // ── Cost ─────────────────────────────────────────────
      section('Costo estimado');
      doc.setFillColor(255, 251, 235);
      doc.rect(margin, y, contentW, 12, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(180, 120, 10);
      const cost = repair.totalCost > 0 ? repair.totalCost : repair.laborCost;
      doc.text(
        cost > 0
          ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cost)
          : 'Por cotizar',
        pageW - margin - 3,
        y + 8,
        { align: 'right' },
      );
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      doc.text('Costo estimado (puede variar según diagnóstico)', margin + 3, y + 8);
      y += 16;

      // ── Terms ─────────────────────────────────────────────
      y += 2;
      doc.setFontSize(7);
      doc.setTextColor(130, 130, 130);
      doc.setFont('helvetica', 'bold');
      doc.text('TÉRMINOS Y CONDICIONES:', margin, y);
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      const terms = [
        '1. El tiempo de reparación estimado es de 3 a 7 días hábiles, sujeto a disponibilidad de piezas.',
        '2. TLAMATECH no se hace responsable por pérdida de datos. Se recomienda respaldar su información.',
        '3. Los equipos no reclamados después de 30 días naturales generarán cargo por almacenaje.',
        '4. El presupuesto puede variar una vez realizado el diagnóstico técnico completo.',
        '5. Se otorga garantía de 30 días en mano de obra y 90 días en piezas instaladas.',
      ];
      terms.forEach(t => {
        const tLines = doc.splitTextToSize(t, contentW);
        doc.text(tLines, margin, y);
        y += tLines.length * 4 + 1.5;
      });

      y += 8;

      // ── Signature ─────────────────────────────────────────
      const sigY = y;
      // Client signature
      doc.setDrawColor(180, 180, 180);
      doc.line(margin, sigY + 14, margin + 70, sigY + 14);
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text('Firma del cliente', margin, sigY + 19);
      doc.text(repair.customer.name, margin, sigY + 23);

      // Tech signature
      doc.line(pageW - margin - 70, sigY + 14, pageW - margin, sigY + 14);
      doc.text('Recibido por (técnico)', pageW - margin - 70, sigY + 19);

      // ── Footer ───────────────────────────────────────────
      doc.setFillColor(10, 10, 10);
      doc.rect(0, 285, pageW, 12, 'F');
      doc.setFont('courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(251, 191, 36);
      doc.text(repair.ticketNumber, margin, 291);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Conserve este comprobante para reclamar su equipo.', pageW / 2, 291, { align: 'center' });
      doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pageW - margin, 291, { align: 'right' });

      doc.save(`ticket-cliente-${repair.ticketNumber}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error al generar el PDF. Intenta de nuevo.');
    } finally {
      setLoadingClient(false);
    }
  };

  const generateInternalTicket = async () => {
    setLoadingInternal(true);
    try {
      const { jsPDF } = await import('jspdf');
      const QRCode = await import('qrcode');

      // Generate QR code pointing to the repair URL
      const repairUrl = `${window.location.origin}/repairs/${repair.id}`;
      const qrDataUrl = await QRCode.toDataURL(repairUrl, {
        width: 200,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });

      // Small label format: 100mm x 70mm
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [100, 70] });

      // Background
      doc.setFillColor(10, 10, 10);
      doc.rect(0, 0, 100, 70, 'F');

      // Left content area
      // Company name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(251, 191, 36);
      doc.text('TLAMATECH', 5, 8);

      // Ticket number — BIG
      doc.setFont('courier', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text(repair.ticketNumber, 5, 22);

      // Divider
      doc.setDrawColor(40, 40, 40);
      doc.line(5, 25, 68, 25);

      // Client name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(220, 220, 220);
      const clientLines = doc.splitTextToSize(repair.customer.name, 62);
      doc.text(clientLines, 5, 32);

      // Device
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(160, 160, 160);
      const deviceStr = `${repair.deviceBrand} ${repair.deviceModel}`;
      const deviceLines = doc.splitTextToSize(deviceStr, 62);
      doc.text(deviceLines, 5, 40);

      // Device type badge
      doc.setFillColor(30, 30, 30);
      doc.roundedRect(5, 44, 30, 6, 1, 1, 'F');
      doc.setFontSize(6.5);
      doc.setTextColor(150, 150, 150);
      doc.text(repair.deviceType.toUpperCase(), 20, 48.5, { align: 'center' });

      // Date
      doc.setFontSize(6);
      doc.setTextColor(80, 80, 80);
      doc.text(
        new Date(repair.createdAt).toLocaleDateString('es-MX'),
        5, 57,
      );

      // Scan label
      doc.setFontSize(5.5);
      doc.setTextColor(80, 80, 80);
      doc.text('ESCANEAR PARA VER ORDEN', 5, 63);

      // QR Code — right side
      doc.addImage(qrDataUrl, 'PNG', 68, 4, 28, 28);

      // QR label
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(80, 80, 80);
      doc.text('Abrir en sistema', 82, 35, { align: 'center' });

      // Border accent
      doc.setDrawColor(251, 191, 36);
      doc.setLineWidth(0.8);
      doc.rect(0.4, 0.4, 99.2, 69.2);

      doc.save(`ticket-interno-${repair.ticketNumber}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error al generar el ticket interno.');
    } finally {
      setLoadingInternal(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={generateClientTicket}
        disabled={loadingClient}
        className="btn-primary w-full justify-center disabled:opacity-50"
      >
        <Printer size={14} />
        {loadingClient ? 'Generando...' : 'Ticket cliente (A4)'}
      </button>
      <button
        onClick={generateInternalTicket}
        disabled={loadingInternal}
        className="btn-secondary w-full justify-center disabled:opacity-50"
      >
        <Tag size={14} />
        {loadingInternal ? 'Generando...' : 'Etiqueta interna + QR'}
      </button>
    </div>
  );
}
