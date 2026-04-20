'use client';

import { MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/utils';

type Props = {
  phone: string;
  status: string;
  customerName: string;
  deviceBrand: string;
  deviceModel: string;
  businessName: string;
};

export function WhatsAppButton({ phone, status, customerName, deviceBrand, deviceModel, businessName }: Props) {
  const url = buildWhatsAppUrl(phone, status, customerName, deviceBrand, deviceModel, businessName);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium
        bg-green-500/10 border border-green-500/20 text-green-400
        hover:bg-green-500/20 hover:border-green-500/40 transition-colors"
    >
      <MessageCircle size={14} />
      Notificar al cliente
    </a>
  );
}
