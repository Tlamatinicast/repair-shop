'use client';

import { SessionProvider } from 'next-auth/react';
import { BusinessSettingsProvider } from './BusinessSettingsContext';
import type { BusinessSettings } from '@/lib/businessSettings';

export function Providers({
  children,
  businessSettings,
}: {
  children: React.ReactNode;
  businessSettings: BusinessSettings;
}) {
  return (
    <SessionProvider>
      <BusinessSettingsProvider value={businessSettings}>
        {children}
      </BusinessSettingsProvider>
    </SessionProvider>
  );
}
