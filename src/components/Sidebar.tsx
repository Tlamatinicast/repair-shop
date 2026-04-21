'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Image from 'next/image';
import {
  LayoutDashboard, Wrench, Users, Package, BarChart3,
  ShoppingBag, Settings, ChevronRight, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const allNav = [
  { href: '/',          label: 'Dashboard',    icon: LayoutDashboard, adminOnly: false },
  { href: '/repairs',   label: 'Reparaciones', icon: Wrench,          adminOnly: false },
  { href: '/customers', label: 'Clientes',     icon: Users,           adminOnly: false },
  { href: '/inventory', label: 'Inventario',   icon: Package,         adminOnly: false },
  { href: '/sales',     label: 'Ventas',       icon: ShoppingBag,     adminOnly: false },
  { href: '/reports',   label: 'Reportes',     icon: BarChart3,       adminOnly: true  },
];

export function Sidebar({ session, businessName }: { session: any; businessName: string }) {
  const pathname = usePathname();
  const isAdmin = session?.user?.role === 'ADMIN';
  const nav = allNav.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside className="w-56 flex-shrink-0 h-screen flex flex-col bg-[#0a0a0a] border-r border-[#1a1a1a]">
      <div className="px-5 py-4 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-[#111] flex items-center justify-center">
            <Image src="/logo.png" alt={businessName} width={32} height={32} className="object-contain" />
          </div>
          <div>
            <span className="text-sm font-bold text-white tracking-widest" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
              {businessName}
            </span>
            <p className="text-[10px] text-[#555] mt-0.5">Taller de Reparación</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="section-title px-2 mb-3">Menú</p>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                active
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-[#777] hover:text-[#ccc] hover:bg-[#141414]',
              )}
            >
              <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={12} className="opacity-50" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-[#1a1a1a] space-y-0.5">
        {isAdmin && (
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#666] hover:text-[#ccc] hover:bg-[#141414] transition-all"
          >
            <Settings size={15} strokeWidth={1.8} />
            Configuración
          </Link>
        )}
        <div className="mt-2 mx-1 p-3 bg-[#111] rounded-lg border border-[#1e1e1e]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
              {session?.user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#ddd] truncate">{session?.user?.name}</p>
              <p className="text-[10px] text-[#555]">{isAdmin ? 'Administrador' : 'Técnico'}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-[#555] hover:text-red-400 transition-colors p-1"
              title="Cerrar sesión"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
