import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FlaskConical, Loader2, ChevronDown } from 'lucide-react'
import { analysesApi, regionsApi, getErrorMessage } from '@/services/api'
import type { AnalysisType, CreateAnalysisPayload } from '@/types'
import { useNavigate } from 'react-router-dom'

const ANALYSIS_TYPES: { value: AnalysisType; label: string; desc: string }[] = [
  { value: 'sar_backscatter', label: 'SAR Backscatter', desc: 'Radar backscatter with Lee speckle filter' },
  { value: 'optical_ndvi', label: 'Optical NDVI', desc: 'Vegetation index from red + NIR bands' },
  { value: 'change_detection', label: 'Change Detection', desc: 'Temporal difference between two epochs' },
  { value: 'anomaly_detection', label: 'Anomaly Detection', desc: 'Z-score anomaly identification' },
  { value: 'elevation_model', label: 'Elevation Model', desc: 'Digital terrain model from InSAR' },
]

export default function AnalysisForm({ onCreated }: { onCreated?: () => void }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [type, setType] = useState<AnalysisType>('sar_backscatter')
  const [regionId, setRegionId] = useState('')
  const [resScale, setResScale] = useState(1.0)
  const [filterWindow, setFilterWindow] = useState(7)
  const [anomalySigma, setAnomalySigma] = useState(2.5)
  const [error, setError] = useState('')

  const { data: regions = [] } = useQuery({ queryKey: ['regions'], queryFn: regionsApi.list })

  const mutation = useMutation({
    mutationFn: (payload: CreateAnalysisPayload) => analysesApi.create(payload),
    onSuccess: (analysis) => {
      qc.invalidateQueries({ queryKey: ['analyses'] })
      onCreated?.()
      navigate(`/analysis/${analysis.id}`)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Please enter a name for this analysis'); return }
    mutation.mutate({
      name: name.trim(),
      analysis_type: type,
      region_id: regionId || undefined,
      input_source: 'demo',
      parameters: {
        resolution_scale: resScale,
        filter_window: filterWindow,
        anomaly_sigma: anomalySigma,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label className="label">Analysis Name</label>
        <input
          className="input"
          placeholder="e.g. Kilauea SAR run 2024-06"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* Type */}
      <div>
        <label className="label">Analysis Type</label>
        <div className="relative">
          <select
            className="input appearance-none pr-9"
            value={type}
            onChange={(e) => setType(e.target.value as AnalysisType)}
          >
            {ANALYSIS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
        </div>
        <p className="text-xs text-slate-500 mt-1.5">
          {ANALYSIS_TYPES.find((t) => t.value === type)?.desc}
        </p>
      </div>

      {/* Region */}
      <div>
        <label className="label">Region of Interest (optional)</label>
        <div className="relative">
          <select
            className="input appearance-none pr-9"
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
          >
            <option value="">— No region (full demo scene) —</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Parameters */}
      <div className="border border-slate-700 rounded-lg p-4 space-y-4">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Processing Parameters</p>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Resolution Scale</label>
            <input
              type="number" min={0.1} max={4} step={0.1}
              className="input"
              value={resScale}
              onChange={(e) => setResScale(parseFloat(e.target.value))}
            />
            <p className="text-[10px] text-slate-500 mt-1">e.g. 0.5 = half resolution</p>
          </div>
          <div>
            <label className="label">Filter Window</label>
            <input
              type="number" min={3} max={21} step={2}
              className="input"
              value={filterWindow}
              onChange={(e) => setFilterWindow(parseInt(e.target.value))}
            />
            <p className="text-[10px] text-slate-500 mt-1">Lee filter kernel size</p>
          </div>
          <div>
            <label className="label">Anomaly σ</label>
            <input
              type="number" min={1} max={5} step={0.1}
              className="input"
              value={anomalySigma}
              onChange={(e) => setAnomalySigma(parseFloat(e.target.value))}
            />
            <p className="text-[10px] text-slate-500 mt-1">Z-score threshold</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} />}
        {mutation.isPending ? 'Submitting…' : 'Run Analysis'}
      </button>
    </form>
  )
}
