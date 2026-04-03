'use client';

import { signOut, useSession } from 'next-auth/react';
import { LogOut, Settings } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export function MobileHeader() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  return (
    <header className="mobile-header">
      {/* Logo + nombre */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg overflow-hidden bg-[#111] flex items-center justify-center flex-shrink-0">
          <Image src="/logo.png" alt="TLAMATECH" width={28} height={28} className="object-contain" />
        </div>
        <span className="text-sm font-bold text-white tracking-widest" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
          TLAMATECH
        </span>
      </div>

      {/* Avatar */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-xs font-bold text-black"
        >
          {session?.user?.name?.charAt(0).toUpperCase() ?? 'U'}
        </button>

        {open && (
          <div className="absolute right-0 top-10 w-48 bg-[#111] border border-[#222] rounded-xl shadow-2xl overflow-hidden z-50">
            <div className="px-3 py-3 border-b border-[#1a1a1a]">
              <p className="text-xs font-medium text-[#ddd] truncate">{session?.user?.name}</p>
              <p className="text-[10px] text-[#555]">{isAdmin ? 'Administrador' : 'Técnico'}</p>
            </div>
            {isAdmin && (
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-[#888] hover:text-[#ccc] hover:bg-[#1a1a1a] transition-colors"
              >
                <Settings size={13} /> Configuración
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400/80 hover:text-red-400 hover:bg-[#1a1a1a] transition-colors"
            >
              <LogOut size={13} /> Cerrar sesión
            </button>
          </div>
        )}
        {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      </div>
    </header>
  );
}
