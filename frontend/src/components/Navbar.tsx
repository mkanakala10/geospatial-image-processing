import { useNavigate } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { usersApi } from '@/services/api'
import { useQuery } from '@tanstack/react-query'

const roleBadge: Record<string, string> = {
  admin: 'badge-red',
  analyst: 'badge-blue',
  viewer: 'badge-gray',
}

export default function Navbar() {
  const { logout, user: cachedUser, setUser } = useAuthStore()
  const navigate = useNavigate()

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: usersApi.me,
    initialData: cachedUser ?? undefined,
  })

  if (user && user.id !== cachedUser?.id) setUser(user)

  return (
    <header className="top-bar">
      <span className="text-sm text-gray-500">Remote sensing platform</span>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 rounded-lg border border-gray-700 bg-surface px-3 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-geo-900/50">
            <User size={14} className="text-geo-400" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-200">{user?.username ?? '—'}</p>
            <p className="text-xs text-gray-500">{user?.email ?? ''}</p>
          </div>
          {user?.role && (
            <span className={roleBadge[user.role] ?? 'badge-gray'}>{user.role}</span>
          )}
        </div>

        <button
          onClick={() => { logout(); navigate('/login') }}
          className="btn-ghost p-2 text-gray-400 hover:text-red-400"
          aria-label="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
