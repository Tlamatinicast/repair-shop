'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { EditUserModal } from './EditUserModal';
import { formatDate } from '@/lib/utils';

export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: Date | string;
};

type Props = {
  users: User[];
  currentUserId: number;
};

export function UserList({ users: initial, currentUserId }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState(initial);
  const [editing, setEditing] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleSaved = (updated: User) => {
    setUsers(prev => prev.map(u => (u.id === updated.id ? { ...u, ...updated } : u)));
    setEditing(null);
    router.refresh();
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`¿Eliminar al usuario "${user.name}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }
      setUsers(prev => prev.filter(u => u.id !== user.id));
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="space-y-2 mb-6">
        {users.map((u) => (
          <div key={u.id} className="flex items-start gap-3 p-3 rounded-lg bg-[#0f0f0f] border border-[#1a1a1a]">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/20 rounded-lg flex items-center justify-center text-amber-500 text-xs font-bold flex-shrink-0 mt-0.5">
              {u.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#ddd]">{u.name}</p>
              <p className="text-xs text-[#555] font-mono">{u.email}</p>
              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                <span className={`badge ${u.role === 'ADMIN' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' : 'text-blue-400 bg-blue-400/10 border-blue-400/20'}`}>
                  {u.role === 'ADMIN' ? 'Admin' : 'Técnico'}
                </span>
                <span className={`badge ${u.active ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20'}`}>
                  {u.active ? 'Activo' : 'Inactivo'}
                </span>
                <span className="text-[10px] text-[#444] font-mono">{formatDate(u.createdAt as any)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setEditing(u)}
                className="btn-ghost p-1.5"
                title="Editar"
              >
                <Pencil size={13} className="text-[#555] hover:text-amber-400" />
              </button>
              {u.id !== currentUserId && (
                <button
                  onClick={() => handleDelete(u)}
                  disabled={deletingId === u.id}
                  className="btn-ghost p-1.5 disabled:opacity-40"
                  title="Eliminar"
                >
                  <Trash2 size={13} className="text-[#555] hover:text-red-400" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
