import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Map, FlaskConical, ShieldCheck, Satellite } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import clsx from 'clsx'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/map', icon: Map, label: 'Map & Regions' },
  { to: '/analysis', icon: FlaskConical, label: 'Analysis', roles: ['analyst', 'admin'] as Array<'analyst' | 'admin' | 'viewer'> },
  { to: '/admin', icon: ShieldCheck, label: 'Admin', roles: ['admin'] as Array<'analyst' | 'admin' | 'viewer'> },
]

export default function Sidebar() {
  const { hasRole } = useAuthStore()

  return (
    <aside className="sidebar-rail">
      <div className="flex items-center gap-3 border-b border-gray-800 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-geo-600">
          <Satellite size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">GeoSpatial</p>
          <p className="text-xs text-gray-500">Remote sensing</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 py-4">
        {navItems.map(({ to, icon: Icon, label, roles, end }) => {
          if (roles && !hasRole(roles)) return null
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => clsx('nav-link', isActive && 'nav-link-active')}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-gray-800 px-5 py-3">
        <p className="text-center text-xs text-gray-600">v1.0.0</p>
      </div>
    </aside>
  )
}
