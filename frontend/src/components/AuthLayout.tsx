import type { ReactNode } from 'react'
import { Satellite } from 'lucide-react'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="auth-shell animate-fade-in">
      <div className="auth-form-panel animate-slide-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-geo-600">
            <Satellite size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">GeoSpatial</h1>
          <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
        </div>

        <div className="card">
          <h2 className="mb-5 text-lg font-semibold text-white">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  )
}
