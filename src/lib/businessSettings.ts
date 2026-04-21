import { cache } from 'react';
import { prisma } from './prisma';

export type BusinessSettings = {
  name: string;
  phone: string;
  domain: string;
};

export const getBusinessSettings = cache(async (): Promise<BusinessSettings> => {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ['businessName', 'businessPhone', 'businessDomain'] } },
  });
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {
    name:   map['businessName']   ?? 'TLAMATECH',
    phone:  map['businessPhone']  ?? '',
    domain: map['businessDomain'] ?? '',
  };
});
