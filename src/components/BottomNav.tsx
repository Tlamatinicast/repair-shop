'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wrench, Users, ShoppingBag, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const allNav = [
  { href: '/',          label: 'Inicio',   icon: LayoutDashboard, adminOnly: false },
  { href: '/repairs',   label: 'Órdenes',  icon: Wrench,          adminOnly: false },
  { href: '/sales',     label: 'Ventas',   icon: ShoppingBag,     adminOnly: false },
  { href: '/customers', label: 'Clientes', icon: Users,           adminOnly: false },
  { href: '/inventory', label: 'Stock',    icon: Package,         adminOnly: false },
];

export function BottomNav({ session }: { session: any }) {
  const pathname = usePathname();
  const isAdmin = session?.user?.role === 'ADMIN';
  const nav = allNav.filter(item => !item.adminOnly || isAdmin);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a] border-t border-[#1e1e1e] flex items-center md:hidden safe-bottom">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all duration-150',
              active ? 'text-amber-400' : 'text-[#555] hover:text-[#888]',
            )}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
            <span className={cn('text-[10px] font-mono', active ? 'text-amber-400' : 'text-[#555]')}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
