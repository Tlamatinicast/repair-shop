import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { Users, Shield } from 'lucide-react';
import { NewUserForm } from './NewUserForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="p-6 max-w-3xl mx-auto animate-in">
      <div className="mb-8">
        <p className="section-title mb-1">Administración</p>
        <h1 className="page-title">Configuración</h1>
      </div>

      {/* Users section */}
      <div className="card p-5 mb-5">
        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-[#1a1a1a]">
          <Users size={14} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-[#ccc]">Usuarios del sistema</h2>
        </div>

        <div className="space-y-2 mb-6">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#0f0f0f] border border-[#1a1a1a]">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/20 rounded-lg flex items-center justify-center text-amber-500 text-xs font-bold flex-shrink-0">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#ddd]">{u.name}</p>
                <p className="text-xs text-[#555] font-mono">{u.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`badge ${u.role === 'ADMIN' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' : 'text-blue-400 bg-blue-400/10 border-blue-400/20'}`}>
                  {u.role === 'ADMIN' ? 'Admin' : 'Técnico'}
                </span>
                <span className={`badge ${u.active ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20'}`}>
                  {u.active ? 'Activo' : 'Inactivo'}
                </span>
                <span className="text-[10px] text-[#444] font-mono">{formatDate(u.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* New user form */}
        <div className="border-t border-[#1a1a1a] pt-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={13} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-[#ccc]">Agregar nuevo usuario</h3>
          </div>
          <NewUserForm />
        </div>
      </div>
    </div>
  );
}
