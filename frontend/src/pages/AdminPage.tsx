import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Loader2, ChevronDown } from 'lucide-react'
import { usersApi } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'
import { formatDistanceToNow } from 'date-fns'

const ROLE_COLORS: Record<UserRole, string> = {
  admin:   'badge-red',
  analyst: 'badge-blue',
  viewer:  'badge-gray',
}

export default function AdminPage() {
  const qc = useQueryClient()
  const { user: me } = useAuthStore()
  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.list })

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      usersApi.updateRole(userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
  void deleteUserMutation // available for future use

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-900/30 rounded-xl flex items-center justify-center">
          <Shield size={18} className="text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          <p className="text-slate-400 text-sm">User management and role assignment</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-700/60">
          <p className="text-sm font-medium text-white">Users ({users.length})</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-slate-500" />
          </div>
        ) : (
          <div className="divide-y divide-slate-700/40">
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-4 px-5 py-3">
                <div className="w-9 h-9 bg-geo-900/30 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-geo-400 text-sm font-medium">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{user.username}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <span className={ROLE_COLORS[user.role]}>{user.role}</span>
                <span className="text-xs text-slate-600 hidden md:block">
                  {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                </span>

                {/* Role selector */}
                {user.id !== me?.id && (
                  <div className="relative">
                    <select
                      className="bg-surface border border-slate-600 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 appearance-none pr-7 cursor-pointer focus:outline-none focus:ring-1 focus:ring-geo-500"
                      value={user.role}
                      onChange={(e) =>
                        roleMutation.mutate({ userId: user.id, role: e.target.value as UserRole })
                      }
                    >
                      <option value="viewer">viewer</option>
                      <option value="analyst">analyst</option>
                      <option value="admin">admin</option>
                    </select>
                    <ChevronDown size={11} className="absolute right-2 top-2 text-slate-500 pointer-events-none" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
