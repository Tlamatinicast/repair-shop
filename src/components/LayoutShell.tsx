'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isLoginPage = pathname === '/login';

  // Show login page without sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in - let middleware handle redirect
  if (!session) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#080808]">
      <Sidebar userRole={session.user.role} userName={session.user.name ?? ''} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
