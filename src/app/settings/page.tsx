import { requireAdmin } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { Users, Shield, Building2 } from 'lucide-react';
import { NewUserForm } from './NewUserForm';
import { UserList } from './UserList';
import { BusinessSettingsForm } from './BusinessSettingsForm';
import { BackupSection } from './BackupSection';
import { getBusinessSettings } from '@/lib/businessSettings';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireAdmin();
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as any)?.id ?? 0;

  const [users, biz] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    getBusinessSettings(),
  ]);

  return (
    <div className="p-6 max-w-3xl mx-auto animate-in">
      <div className="mb-8">
        <p className="section-title mb-1">Administración</p>
        <h1 className="page-title">Configuración</h1>
      </div>

      {/* Business settings */}
      <div className="card p-5 mb-5">
        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-[#1a1a1a]">
          <Building2 size={14} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-[#ccc]">Información del negocio</h2>
        </div>
        <BusinessSettingsForm current={biz} />
      </div>

      <div className="card p-5 mb-5">
        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-[#1a1a1a]">
          <Users size={14} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-[#ccc]">Usuarios del sistema</h2>
        </div>

        <UserList users={users} currentUserId={currentUserId} />

        <div className="border-t border-[#1a1a1a] pt-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={13} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-[#ccc]">Agregar nuevo usuario</h3>
          </div>
          <NewUserForm />
        </div>
      </div>

      <BackupSection />
    </div>
  );
}
