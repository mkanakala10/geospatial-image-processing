import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FlaskConical, Map, CheckCircle2, AlertCircle, Loader2, Clock, Plus, TrendingUp } from 'lucide-react'
import { analysesApi, regionsApi } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import StatusBadge from '@/components/StatusBadge'
import { formatDistanceToNow } from 'date-fns'
import type { AnalysisType } from '@/types'

const TYPE_LABELS: Record<AnalysisType, string> = {
  sar_backscatter:  'SAR Backscatter',
  optical_ndvi:     'Optical NDVI',
  change_detection: 'Change Detection',
  anomaly_detection:'Anomaly Detection',
  elevation_model:  'Elevation Model',
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data: analyses = [], isLoading: aLoading } = useQuery({
    queryKey: ['analyses'],
    queryFn: analysesApi.list,
    refetchInterval: 8000,
  })
  const { data: regions = [] } = useQuery({ queryKey: ['regions'], queryFn: regionsApi.list })

  const completed = analyses.filter((a) => a.status === 'completed').length
  const failed    = analyses.filter((a) => a.status === 'failed').length
  const running   = analyses.filter((a) => ['queued', 'processing'].includes(a.status)).length

  const canAnalyze = user?.role === 'analyst' || user?.role === 'admin'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">
            Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 text-sm text-gray-400">Your remote sensing analytics dashboard</p>
        </div>
        {canAnalyze && (
          <Link to="/analysis" className="btn-primary">
            <Plus size={16} />
            New Analysis
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total analyses', value: analyses.length, icon: FlaskConical, accent: 'text-sky-400', bg: 'bg-sky-900/30' },
          { label: 'Completed', value: completed, icon: CheckCircle2, accent: 'text-geo-400', bg: 'bg-geo-900/30' },
          { label: 'Running', value: running, icon: Loader2, accent: 'text-amber-400', bg: 'bg-amber-900/30' },
          { label: 'Regions', value: regions.length, icon: Map, accent: 'text-violet-400', bg: 'bg-violet-900/30' },
        ].map(({ label, value, icon: Icon, accent, bg }) => (
          <div key={label} className="stat-block">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg} ${accent}`}>
              <Icon size={18} />
            </div>
            <div>
              <p className="stat-value">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      {canAnalyze && (
        <div className="grid grid-cols-2 gap-4">
          <Link to="/analysis" className="card group flex cursor-pointer items-center gap-4 hover:border-geo-600/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-geo-900/30 text-geo-400">
              <FlaskConical size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">New analysis</p>
              <p className="text-xs text-gray-400">SAR, NDVI, change detection</p>
            </div>
          </Link>
          <Link to="/map" className="card group flex cursor-pointer items-center gap-4 hover:border-gray-600">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-900/30 text-violet-400">
              <Map size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Draw region</p>
              <p className="text-xs text-gray-400">Define an area of interest</p>
            </div>
          </Link>
        </div>
      )}

      {/* Recent analyses */}
      <div className="card-flush">
        <div className="flex items-center justify-between border-b border-gray-700/60 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-white">Recent analyses</h2>
          </div>
          {analyses.length > 5 && (
            <Link to="/analysis" className="link-accent text-sm">View all</Link>
          )}
        </div>

        {aLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading…
          </div>
        ) : analyses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-parchment-dim">
            <FlaskConical size={32} className="mb-3 opacity-30" strokeWidth={1.25} />
            <p className="font-mono text-xs uppercase" style={{ letterSpacing: '0.12em' }}>No passes logged</p>
            {canAnalyze && (
              <Link to="/analysis" className="btn-primary mt-4 text-xs">
                <Plus size={13} /> Start your first analysis
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-800 px-2 py-1">
            {analyses.slice(0, 8).map((a) => (
              <Link
                key={a.id}
                to={`/analysis/${a.id}`}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-800/50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface">
                  <FlaskConical size={14} className="text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white group-hover:text-geo-300">
                    {a.name}
                  </p>
                  <p className="text-xs text-gray-500">{TYPE_LABELS[a.analysis_type]}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={a.status} />
                  <span className="hidden text-xs text-gray-500 sm:block">
                    <Clock size={10} className="mr-1 inline" />
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Error banner */}
      {failed > 0 && (
        <div className="error-banner flex items-center gap-3">
          <AlertCircle size={16} className="shrink-0" />
          <p>
            {failed} analysis{failed > 1 ? 'es' : ''} failed.{' '}
            <Link to="/analysis" className="link-accent underline">Review</Link>
          </p>
        </div>
      )}
    </div>
  )
}
