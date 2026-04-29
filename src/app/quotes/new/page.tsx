import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { NewQuoteForm } from './NewQuoteForm';

export const dynamic = 'force-dynamic';

export default async function NewQuotePage({ searchParams }: { searchParams: { customerId?: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const [settings, preCustomer] = await Promise.all([
    prisma.setting.findMany({ where: { key: { in: ['quoteTerms', 'quoteValidityDays', 'quoteFooter', 'businessName'] } } }),
    searchParams.customerId
      ? prisma.customer.findUnique({
          where: { id: Number(searchParams.customerId) },
          select: { id: true, name: true, phone: true },
        })
      : null,
  ]);

  const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

  return (
    <NewQuoteForm
      defaultTerms={settingsMap['quoteTerms'] ?? ''}
      defaultValidityDays={Number(settingsMap['quoteValidityDays'] ?? 30)}
      businessName={settingsMap['businessName'] ?? ''}
      preCustomer={preCustomer}
    />
  );
}
