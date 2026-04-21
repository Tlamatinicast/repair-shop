'use client';

import { createContext, useContext } from 'react';
import type { BusinessSettings } from '@/lib/businessSettings';

const BusinessSettingsContext = createContext<BusinessSettings>({
  name: 'TLAMATECH', phone: '', domain: '',
});

export function BusinessSettingsProvider({
  value,
  children,
}: {
  value: BusinessSettings;
  children: React.ReactNode;
}) {
  return (
    <BusinessSettingsContext.Provider value={value}>
      {children}
    </BusinessSettingsContext.Provider>
  );
}

export function useBusinessSettings() {
  return useContext(BusinessSettingsContext);
}
