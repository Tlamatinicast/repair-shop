import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { Providers } from '@/components/Providers';
import { getSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'TLAMATECH — Sistema de Gestión',
  description: 'Sistema de gestión para taller de reparación de dispositivos TLAMATECH',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'TLAMATECH' },
  icons: { apple: '/logo.png' },
};

export const viewport: Viewport = {
  themeColor: '#080808',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="es">
      <body className="flex h-screen overflow-hidden bg-[#080808]">
        <Providers>
          {session ? (
            <>
              {/* Sidebar: solo visible en desktop */}
              <div className="hidden md:flex">
                <Sidebar session={session} />
              </div>
              {/* Main content */}
              <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
                {children}
              </main>
              {/* Bottom nav: solo visible en móvil */}
              <BottomNav session={session} />
            </>
          ) : (
            <main className="flex-1">
              {children}
            </main>
          )}
        </Providers>
      </body>
    </html>
  );
}
