'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Send, CheckCircle, XCircle, Loader2, MessageCircle, Wrench, ShoppingBag, Trash2, X } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

interface QuoteItem {
  description: string; quantity: number; unitPrice: number;
  hasIva: boolean; onDemand: boolean; ivaAmount: number; subtotal: number; total: number;
}
interface QuoteData {
  quoteNumber: string; status: string;
  customerName: string; customerPhone: string;
  subtotal: number; discount: number; ivaAmount: number; total: number; deposit: number;
  notes?: string; terms?: string; validUntil?: string; createdAt: string;
  items: QuoteItem[];
}
interface BizInfo { name: string; phone: string; domain: string; }

const STATUSES: Record<string, { label: string }> = {
  DRAFT: { label: 'Borrador' }, SENT: { label: 'Enviada' },
  ACCEPTED: { label: 'Aceptada' }, REJECTED: { label: 'Rechazada' }, EXPIRED: { label: 'Vencida' },
};

export function QuoteActions({
  quoteId, status, isAdmin, customerId, customerName, customerPhone,
  quoteNumber, total, validUntil, biz, quote,
}: {
  quoteId: number; status: string; isAdmin: boolean;
  customerId: number | null; customerName: string; customerPhone: string;
  quoteNumber: string; total: number; validUntil: string | null;
  biz: BizInfo; quote: QuoteData;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState('');
  const [showConvert, setShowConvert] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const changeStatus = async (newStatus: string) => {
    setLoading(newStatus);
    await fetch(`/api/quotes/${quoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
    setLoading('');
  };

  const handleConvert = async (type: 'repair' | 'sale') => {
    setLoading('convert');
    await fetch(`/api/quotes/${quoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ACCEPTED' }),
    });
    setLoading('');
    setShowConvert(false);
    const base = type === 'repair' ? '/repairs/new' : '/sales/new';
    const url = customerId ? `${base}?customerId=${customerId}` : base;
    router.push(url);
  };

  const handleDelete = async () => {
    setLoading('delete');
    await fetch(`/api/quotes/${quoteId}`, { method: 'DELETE' });
    router.push('/quotes');
  };

  const handleWhatsApp = () => {
    const validStr = validUntil
      ? ` Válida hasta el ${new Date(validUntil).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}.`
      : '';
    const msg = `Hola ${customerName}, le compartimos la cotización *${quoteNumber}* de *${biz.name}*.\n\n*Total: ${fmt(total)}*${quote.deposit > 0 ? `\nAnticipo solicitado: ${fmt(quote.deposit)}` : ''}${validStr}\n\nQuedo a sus órdenes.`;
    const phone = customerPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone.startsWith('52') ? phone : '52' + phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const generatePDF = async () => {
    setLoading('pdf');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210; const margin = 18; const contentW = pageW - margin * 2;

      const fill = (r: number, g: number, b: number) => doc.setFillColor(r, g, b);
      const draw = (r: number, g: number, b: number) => doc.setDrawColor(r, g, b);
      const txt  = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);

      const TEAL_D  = [15, 110, 86]   as const;
      const TEAL_M  = [29, 158, 117]  as const;
      const TEAL_L  = [225, 245, 238] as const;
      const TEAL_B  = [159, 225, 203] as const;
      const TEAL_DP = [8, 80, 65]     as const;
      const GR4     = [136, 135, 128] as const;
      const GR6     = [95, 94, 90]    as const;
      const GR9     = [44, 44, 42]    as const;
      const GRL     = [180, 178, 169] as const;
      const SEP     = [232, 232, 228] as const;
      const FT_BG   = [250, 250, 248] as const;
      const WARN_BG = [255, 247, 237] as const;
      const WARN_TX = [133, 79, 11]   as const;
      const WARN_BD = [186, 117, 23]  as const;

      fill(255, 255, 255); doc.rect(0, 0, pageW, 297, 'F');
      let y = 0;

      const sep = (full = false) => {
        draw(...SEP); doc.setLineWidth(0.3);
        doc.line(full ? 0 : margin, y, full ? pageW : pageW - margin, y);
        y += 4;
      };
      const sLabel = (text: string) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); txt(...TEAL_D);
        doc.text(text, margin, y); y += 6;
      };

      // ── HEADER ─────────────────────────────────────────────────────────────
      y = 14;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(20); txt(...TEAL_D);
      doc.text(biz.name, margin, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); txt(...GR4);
      doc.text('TALLER DE REPARACIÓN DE DISPOSITIVOS ELECTRÓNICOS', margin, y + 5.5);
      txt(...GRL);
      const contactLine = [biz.phone, biz.domain].filter(Boolean).join(' · ');
      doc.text(contactLine || '', margin, y + 10.5);

      doc.setFont('helvetica', 'bold'); doc.setFontSize(20); txt(...TEAL_D);
      doc.text(quote.quoteNumber, pageW - margin, y, { align: 'right' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); txt(...GR4);
      doc.text(
        new Date(quote.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }),
        pageW - margin, y + 6, { align: 'right' }
      );

      if (quote.validUntil) {
        const vDate = new Date(quote.validUntil);
        const expired = vDate < new Date();
        const badgeText = `Válida hasta ${vDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`;
        doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
        const bw = doc.getTextWidth(badgeText) + 10;
        if (expired) { fill(...WARN_BG); draw(...WARN_BD); } else { fill(...TEAL_L); draw(...TEAL_B); }
        doc.setLineWidth(0.3);
        doc.roundedRect(pageW - margin - bw, y + 8.5, bw, 5.5, 1, 1, 'FD');
        if (expired) txt(...WARN_TX); else txt(...TEAL_DP);
        doc.text(badgeText, pageW - margin - bw / 2, y + 12.5, { align: 'center' });
      }

      y = 30; sep(true); y -= 3;

      fill(...TEAL_L); doc.rect(0, y, pageW, 7.5, 'F');
      draw(...TEAL_B); doc.setLineWidth(0.3); doc.line(0, y + 7.5, pageW, y + 7.5);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); txt(...TEAL_DP);
      doc.text('COTIZACIÓN', margin, y + 5.2);
      y += 10;

      // ── CLIENTE ────────────────────────────────────────────────────────────
      y += 3; sLabel('Cliente');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); txt(...GR9);
      doc.text(quote.customerName, margin, y); y += 5.5;
      if (quote.customerPhone) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); txt(...GR4);
        doc.text(quote.customerPhone, margin, y); y += 5;
      }
      y += 2; sep();

      // ── CONCEPTOS ─────────────────────────────────────────────────────────
      sLabel('Conceptos');

      const colCant = margin;
      const colDesc = margin + 15;
      const colUnit = pageW - margin - 30;
      const colImp  = pageW - margin;
      const descW   = colUnit - colDesc - 4;

      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); txt(...GR4);
      doc.text('CANT.', colCant, y);
      doc.text('DESCRIPCIÓN', colDesc, y);
      doc.text('P. UNIT.', colUnit, y, { align: 'right' });
      doc.text('TOTAL', colImp, y, { align: 'right' });
      y += 2; draw(...SEP); doc.setLineWidth(0.3); doc.line(margin, y, pageW - margin, y); y += 4;

      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); txt(...GR9);
      quote.items.forEach(item => {
        const descLines = doc.splitTextToSize(item.description, descW);
        const badges: string[] = [];
        if (item.hasIva) badges.push(`IVA: +${fmt(item.ivaAmount)}`);
        if (item.onDemand) badges.push('Bajo pedido');
        const rowH = Math.max(descLines.length * 4.5, 5) + (badges.length > 0 ? 4 : 0);

        doc.text(`${item.quantity}×`, colCant, y);
        doc.text(descLines, colDesc, y);
        txt(...GR6); doc.text(fmt(item.unitPrice), colUnit, y, { align: 'right' });
        doc.setFont('helvetica', 'bold'); txt(...GR9);
        doc.text(fmt(item.total), colImp, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');

        if (badges.length > 0) {
          doc.setFontSize(7); txt(...GR4);
          doc.text(badges.join('  ·  '), colDesc, y + descLines.length * 4.5 + 1);
          doc.setFontSize(9);
        }

        y += rowH + 2;
        draw(241, 239, 232); doc.setLineWidth(0.2); doc.line(margin, y - 1, pageW - margin, y - 1);
      });
      y += 3; sep();

      // ── TOTALES ────────────────────────────────────────────────────────────
      sLabel('Resumen');
      const totRow = (label: string, value: string, opts: { bold?: boolean; teal?: boolean; muted?: boolean } = {}) => {
        const { bold, teal, muted } = opts;
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(teal ? 11 : muted ? 9 : 10);
        if (teal) txt(...TEAL_D); else if (muted) txt(...GR4); else txt(...GR6);
        doc.text(label, margin + 2, y);
        doc.setFont('helvetica', 'bold');
        doc.text(value, pageW - margin - 2, y, { align: 'right' });
        y += teal ? 7 : 5.5;
      };

      totRow('Subtotal (s/IVA)', fmt(quote.subtotal));
      if (quote.ivaAmount > 0) totRow('IVA (16%)', fmt(quote.ivaAmount));
      if (quote.discount > 0) totRow('Descuento', `− ${fmt(quote.discount)}`, { muted: true });
      y += 1; draw(...SEP); doc.setLineWidth(0.3); doc.line(margin + 2, y, pageW - margin - 2, y); y += 4;
      totRow('Total', fmt(quote.total), { teal: true });

      if (quote.deposit > 0) {
        y += 2;
        const boxH = 12;
        fill(...TEAL_L); doc.rect(margin, y, contentW, boxH, 'F');
        fill(...TEAL_M); doc.rect(margin, y, 2, boxH, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); txt(...TEAL_DP);
        doc.text('ANTICIPO SOLICITADO', margin + 6, y + 7.5);
        doc.setFontSize(12); txt(...TEAL_D);
        doc.text(fmt(quote.deposit), pageW - margin - 4, y + 8, { align: 'right' });
        y += boxH + 4;
      }

      sep();

      // ── TÉRMINOS ───────────────────────────────────────────────────────────
      if (quote.terms) {
        sLabel('Términos y condiciones');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); txt(...GR4);
        const termLines = doc.splitTextToSize(quote.terms, contentW - 4);
        doc.text(termLines, margin, y);
        y += termLines.length * 4.5 + 4;
        sep();
      }

      // ── FOOTER ─────────────────────────────────────────────────────────────
      const footerY = 282;
      fill(...FT_BG); doc.rect(0, footerY, pageW, 15, 'F');
      draw(...SEP); doc.setLineWidth(0.3); doc.line(0, footerY, pageW, footerY);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); txt(...TEAL_D);
      doc.text(quote.quoteNumber, margin, footerY + 8);
      doc.setFont('helvetica', 'normal'); txt(...GRL);
      doc.text(`Gracias por su preferencia — ${biz.name}`, pageW / 2, footerY + 8, { align: 'center' });
      doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pageW - margin, footerY + 8, { align: 'right' });

      window.open(doc.output('bloburl'), '_blank');
    } catch (err) { console.error(err); alert('Error al generar el PDF.'); }
    finally { setLoading(''); }
  };

  const isTerminal = status === 'ACCEPTED' || status === 'REJECTED';

  return (
    <div className="space-y-3">
      {/* PDF */}
      <div className="card p-5">
        <p className="section-title mb-3">Documento</p>
        <button
          onClick={generatePDF}
          disabled={!!loading}
          className="btn-primary w-full justify-center disabled:opacity-50"
        >
          {loading === 'pdf' ? <><Loader2 size={14} className="animate-spin" /> Generando...</> : <><FileText size={14} /> Ver PDF</>}
        </button>
        {status !== 'ACCEPTED' && customerPhone && (
          <button onClick={handleWhatsApp} className="btn-secondary w-full justify-center mt-2">
            <MessageCircle size={14} /> Enviar por WhatsApp
          </button>
        )}
      </div>

      {/* Status */}
      {!isTerminal && (
        <div className="card p-5">
          <p className="section-title mb-3">Estado</p>
          <div className="space-y-2">
            {status === 'DRAFT' && (
              <button onClick={() => changeStatus('SENT')} disabled={!!loading}
                className="btn-secondary w-full justify-center disabled:opacity-50 text-blue-400 border-blue-500/20">
                {loading === 'SENT' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Marcar como enviada
              </button>
            )}
            {status === 'SENT' && (
              <>
                <button onClick={() => changeStatus('ACCEPTED')} disabled={!!loading}
                  className="btn-secondary w-full justify-center disabled:opacity-50 text-green-400 border-green-500/20">
                  {loading === 'ACCEPTED' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Marcar aceptada
                </button>
                <button onClick={() => changeStatus('REJECTED')} disabled={!!loading}
                  className="btn-secondary w-full justify-center disabled:opacity-50 text-red-400 border-red-500/20">
                  {loading === 'REJECTED' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  Marcar rechazada
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Convert */}
      {status === 'ACCEPTED' && (
        <div className="card p-5">
          <p className="section-title mb-3">Convertir en</p>
          <div className="space-y-2">
            <button onClick={() => handleConvert('repair')} disabled={!!loading}
              className="btn-secondary w-full justify-center disabled:opacity-50">
              {loading === 'convert' ? <Loader2 size={14} className="animate-spin" /> : <Wrench size={14} />}
              Orden de reparación
            </button>
            <button onClick={() => handleConvert('sale')} disabled={!!loading}
              className="btn-secondary w-full justify-center disabled:opacity-50">
              {loading === 'convert' ? <Loader2 size={14} className="animate-spin" /> : <ShoppingBag size={14} />}
              Venta / POS
            </button>
          </div>
        </div>
      )}

      {/* Delete (admin) */}
      {isAdmin && !showDelete && (
        <button onClick={() => setShowDelete(true)}
          className="text-xs text-[#444] hover:text-red-400 flex items-center gap-1.5 transition-colors mx-auto">
          <Trash2 size={12} /> Eliminar cotización
        </button>
      )}
      {isAdmin && showDelete && (
        <div className="card p-4 border-red-500/20 space-y-3">
          <p className="text-xs text-red-400">¿Eliminar esta cotización? No se puede deshacer.</p>
          <div className="flex gap-2">
            <button onClick={handleDelete} disabled={!!loading}
              className="btn-secondary text-xs text-red-400 border-red-500/20 flex-1 justify-center disabled:opacity-50">
              {loading === 'delete' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Eliminar
            </button>
            <button onClick={() => setShowDelete(false)} className="btn-ghost text-xs flex-1 justify-center">
              <X size={12} /> Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
