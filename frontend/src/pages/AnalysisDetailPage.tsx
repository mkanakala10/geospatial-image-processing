import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2, XCircle, RefreshCw } from 'lucide-react'
import { analysesApi } from '@/services/api'
import { useAnalysisPolling } from '@/hooks/usePolling'
import StatusBadge from '@/components/StatusBadge'
import AnalysisResultCard from '@/components/AnalysisResultCard'
import type { AnalysisType } from '@/types'

const TYPE_LABELS: Record<AnalysisType, string> = {
  sar_backscatter:   'SAR Backscatter',
  optical_ndvi:      'Optical NDVI',
  change_detection:  'Change Detection',
  anomaly_detection: 'Anomaly Detection',
  elevation_model:   'Elevation Model',
}

export default function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: analysis, isLoading, refetch } = useQuery({
    queryKey: ['analysis', id],
    queryFn: () => analysesApi.get(id!),
    enabled: !!id,
  })

  // Poll status until terminal state
  const { data: statusData } = useAnalysisPolling(
    analysis?.status && !['completed', 'failed', 'cancelled'].includes(analysis.status)
      ? id
      : undefined,
  )

  const live = statusData
    ? { ...analysis!, ...statusData }
    : analysis

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <Loader2 size={20} className="animate-spin mr-2" /> Loading analysis…
      </div>
    )
  }

  if (!live) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <XCircle size={32} className="mb-3 opacity-30" />
        <p>Analysis not found</p>
        <Link to="/analysis" className="btn-secondary mt-4 text-xs">Back</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link to="/analysis" className="btn-ghost p-2 mt-0.5">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-white">{live.name}</h1>
            <StatusBadge status={live.status} />
          </div>
          <p className="text-slate-400 text-sm mt-0.5">{TYPE_LABELS[live.analysis_type]}</p>
        </div>
        <button onClick={() => refetch()} className="btn-ghost p-2">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Progress bar while running */}
      {['queued', 'processing'].includes(live.status) && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-300">Processing…</p>
            <p className="text-sm text-geo-400 font-mono">{live.progress}%</p>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-geo-500 h-2 rounded-full transition-all duration-700"
              style={{ width: `${live.progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            The pipeline is running on the server. This page auto-updates.
          </p>
        </div>
      )}

      {/* Error state */}
      {live.status === 'failed' && (
        <div className="card border-red-700/40 bg-red-900/10">
          <div className="flex items-start gap-3">
            <XCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-300">Processing Failed</p>
              <p className="text-xs text-slate-400 mt-1 font-mono">{live.error_message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Parameters */}
      <div className="card">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">Parameters</p>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(live.parameters).map(([k, v]) => (
            <div key={k} className="bg-surface rounded-lg px-3 py-2">
              <p className="text-[10px] text-slate-500 uppercase">{k.replace(/_/g, ' ')}</p>
              <p className="text-sm text-white font-mono mt-0.5">{String(v)}</p>
            </div>
          ))}
          <div className="bg-surface rounded-lg px-3 py-2">
            <p className="text-[10px] text-slate-500 uppercase">Source</p>
            <p className="text-sm text-white font-mono mt-0.5">{live.input_source ?? 'demo'}</p>
          </div>
        </div>
      </div>

      {/* Results */}
      {live.status === 'completed' && live.result_data && (
        <AnalysisResultCard analysis={live} />
      )}
    </div>
  )
}
