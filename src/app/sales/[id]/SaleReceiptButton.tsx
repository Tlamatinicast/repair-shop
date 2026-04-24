'use client';

import { useState } from 'react';
import { Printer, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', OTHER: 'Otro', UNKNOWN: 'No especificado',
};

interface SaleData {
  saleNumber: string;
  createdAt: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod?: string | null;
  notes?: string | null;
  customer?: { name: string; phone: string } | null;
  items: { name: string; quantity: number; unitPrice: number; subtotal: number }[];
  payments: { amount: number; paymentMethod: string; createdAt: string }[];
  amountPaid: number;
  paymentStatus: string;
}

export function SaleReceiptButton({ sale, bizName }: { sale: SaleData; bizName: string }) {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 200] });

      const pageW = 80;
      const m     = 5;
      let y       = 8;

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.text(bizName, pageW / 2, y, { align: 'center' }); y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text('Taller de Reparación de Dispositivos', pageW / 2, y, { align: 'center' }); y += 4;
      doc.text('Mérida, Yucatán', pageW / 2, y, { align: 'center' }); y += 6;

      // Divider
      doc.setDrawColor(220, 220, 220);
      doc.line(m, y, pageW - m, y); y += 4;

      // Sale info
      doc.setFont('courier', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text(`FOLIO: ${sale.saleNumber}`, m, y); y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      const dateStr = new Date(sale.createdAt).toLocaleString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
      doc.text(dateStr, m, y); y += 4;
      if (sale.paymentMethod) { doc.text(`Pago: ${PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}`, m, y); y += 4; }
      if (sale.customer) {
        doc.text(`Cliente: ${sale.customer.name}`, m, y); y += 4;
      }
      y += 2;
      doc.line(m, y, pageW - m, y); y += 4;

      // Items
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.text('PRODUCTO', m, y);
      doc.text('TOTAL', pageW - m, y, { align: 'right' }); y += 4;
      doc.line(m, y, pageW - m, y); y += 3;

      sale.items.forEach(item => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 30, 30);
        const nameLines = doc.splitTextToSize(item.name, pageW - m * 2 - 20);
        doc.text(nameLines, m, y);
        doc.text(formatCurrency(item.subtotal), pageW - m, y, { align: 'right' });
        y += nameLines.length * 4;
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(6.5);
        doc.text(`${item.quantity} x ${formatCurrency(item.unitPrice)}`, m + 2, y); y += 4;
      });

      y += 2;
      doc.line(m, y, pageW - m, y); y += 4;

      // Totals
      const totalsY = (label: string, value: string, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(bold ? 9 : 7.5);
        doc.setTextColor(bold ? 30 : 80, bold ? 30 : 80, bold ? 30 : 80);
        doc.text(label, m, y);
        doc.text(value, pageW - m, y, { align: 'right' });
        y += bold ? 5 : 4;
      };

      totalsY('Subtotal', formatCurrency(sale.subtotal));
      if (sale.discount > 0) totalsY('Descuento', `- ${formatCurrency(sale.discount)}`);
      totalsY('TOTAL', formatCurrency(sale.total), true);

      // Sección de cobros
      y += 2;
      doc.line(m, y, pageW - m, y); y += 4;

      const remaining = sale.total - sale.amountPaid;
      const multiPago = sale.payments.length > 1 || remaining > 0;

      if (multiPago && sale.payments.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        doc.text('COBROS', m, y); y += 4;

        sale.payments.forEach(p => {
          const pDate = new Date(p.createdAt).toLocaleString('es-MX', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
          });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(50, 50, 50);
          doc.text(`+ ${formatCurrency(p.amount)}`, m, y);
          doc.text(PAYMENT_LABELS[p.paymentMethod] ?? p.paymentMethod, m + 22, y);
          doc.setTextColor(130, 130, 130);
          doc.text(pDate, pageW - m, y, { align: 'right' }); y += 4;
        });

        y += 1;
        doc.line(m, y, pageW - m, y); y += 3;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(60, 60, 60);
        doc.text('Total pagado', m, y);
        doc.text(formatCurrency(sale.amountPaid), pageW - m, y, { align: 'right' }); y += 4;

        if (remaining > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(180, 90, 0);
          doc.text('SALDO PENDIENTE', m, y);
          doc.text(formatCurrency(remaining), pageW - m, y, { align: 'right' }); y += 6;
        }
      } else {
        const p = sale.payments[0];
        const method = p ? (PAYMENT_LABELS[p.paymentMethod] ?? p.paymentMethod) : (PAYMENT_LABELS[sale.paymentMethod ?? ''] ?? sale.paymentMethod ?? '');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(40, 130, 40);
        doc.text(`Pagado · ${method}`, m, y);
        doc.text(formatCurrency(sale.amountPaid), pageW - m, y, { align: 'right' }); y += 5;
      }

      if (sale.notes) {
        y += 2;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.5);
        doc.setTextColor(120, 120, 120);
        const noteLines = doc.splitTextToSize(`Nota: ${sale.notes}`, pageW - m * 2);
        doc.text(noteLines, m, y); y += noteLines.length * 4;
      }

      y += 4;
      doc.line(m, y, pageW - m, y); y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text('¡Gracias por su compra!', pageW / 2, y, { align: 'center' }); y += 4;
      doc.text(bizName, pageW / 2, y, { align: 'center' });

      doc.save(`recibo-${sale.saleNumber}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error al generar el recibo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={generate} disabled={loading} className="btn-primary w-full justify-center disabled:opacity-50">
      {loading ? <><Loader2 size={13} className="animate-spin" /> Generando...</> : <><Printer size={13} /> Imprimir recibo</>}
    </button>
  );
}
