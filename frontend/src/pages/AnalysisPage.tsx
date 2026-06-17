import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FlaskConical, Clock, Loader2, Trash2, Plus } from 'lucide-react'
import { analysesApi } from '@/services/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import StatusBadge from '@/components/StatusBadge'
import AnalysisForm from '@/components/AnalysisForm'
import { formatDistanceToNow } from 'date-fns'
import type { AnalysisType } from '@/types'
import { useState } from 'react'

const TYPE_LABELS: Record<AnalysisType, string> = {
  sar_backscatter:   'SAR Backscatter',
  optical_ndvi:      'Optical NDVI',
  change_detection:  'Change Detection',
  anomaly_detection: 'Anomaly Detection',
  elevation_model:   'Elevation Model',
}

export default function AnalysisPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ['analyses'],
    queryFn: analysesApi.list,
    refetchInterval: 5000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => analysesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analyses'] }),
  })

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Analysis Jobs</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Submit imagery processing runs and monitor results
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} />
          {showForm ? 'Hide Form' : 'New Analysis'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card animate-slide-up max-w-lg">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <FlaskConical size={15} className="text-geo-400" />
            Configure Analysis
          </h2>
          <AnalysisForm onCreated={() => setShowForm(false)} />
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-700/60">
          <p className="text-sm font-medium text-white">All Analyses ({analyses.length})</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading…
          </div>
        ) : analyses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <FlaskConical size={32} className="mb-3 opacity-30" />
            <p className="text-sm">No analyses yet</p>
            <button className="btn-primary mt-4 text-xs" onClick={() => setShowForm(true)}>
              <Plus size={13} /> Create first analysis
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/40">
            {analyses.map((a) => (
              <div key={a.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-800/30 transition-colors group">
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/analysis/${a.id}`}
                    className="text-sm font-medium text-white hover:text-geo-300 transition-colors"
                  >
                    {a.name}
                  </Link>
                  <p className="text-xs text-slate-500 mt-0.5">{TYPE_LABELS[a.analysis_type]}</p>
                </div>

                <StatusBadge status={a.status} />

                {a.status === 'processing' && (
                  <div className="w-20 bg-slate-700 rounded-full h-1.5">
                    <div
                      className="bg-geo-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${a.progress}%` }}
                    />
                  </div>
                )}

                <span className="text-xs text-slate-500 shrink-0">
                  <Clock size={10} className="inline mr-1" />
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </span>

                <button
                  onClick={() => deleteMutation.mutate(a.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
