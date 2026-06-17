import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Eye, EyeOff, Sparkles, AlertTriangle, Clock } from 'lucide-react'
import type { Analysis } from '@/types'

interface Props {
  analysis: Analysis
}

export default function AnalysisResultCard({ analysis }: Props) {
  const [showOverlay, setShowOverlay] = useState(false)
  const result = analysis.result_data
  if (!result) return null

  const statsEntries = Object.entries(result.statistics).map(([k, v]) => ({
    name: k.replace(/_/g, ' '),
    value: typeof v === 'number' ? v : parseFloat(String(v)) || 0,
  }))

  const activeImage = showOverlay ? result.anomaly_overlay_b64 : result.output_image_b64

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Image output */}
      <div className="card-flush">
        <div className="flex items-center justify-between border-b border-gray-700/60 px-4 py-2.5">
          <p className="text-sm font-medium text-gray-300">
            {showOverlay ? 'Anomaly overlay' : 'Processed output'}
          </p>
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className="btn-ghost px-2.5 py-1 text-xs gap-1.5"
          >
            {showOverlay ? <Eye size={13} /> : <EyeOff size={13} />}
            {showOverlay ? 'Show Output' : 'Show Anomalies'}
          </button>
        </div>
        <div className="flex items-center justify-center bg-gray-950 p-2" style={{ height: 320 }}>
          <img
            src={`data:image/png;base64,${activeImage}`}
            alt="Analysis output"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      </div>

      {analysis.ai_summary && (
        <div className="card border-geo-700/30 bg-geo-900/20">
          <div className="flex items-start gap-3">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-geo-400" />
            <div>
              <p className="mb-1 text-sm font-medium text-geo-400">Summary</p>
              <p className="text-sm leading-relaxed text-gray-300">{analysis.ai_summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="card">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">Band Statistics</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={statsEntries.slice(0, 8)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="value" fill="#14b8a6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Anomalies */}
      {result.anomalies.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-yellow-400" />
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              Detected Anomalies ({result.anomalies.length})
            </p>
          </div>
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {result.anomalies.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between bg-surface rounded-lg px-3 py-2 text-xs"
              >
                <span className="text-slate-400">#{a.id} · area {a.area_px}px²</span>
                <span
                  className={
                    a.severity > 4 ? 'text-red-400' : a.severity > 3 ? 'text-yellow-400' : 'text-slate-400'
                  }
                >
                  σ={a.severity.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline steps */}
      <div className="flex items-center gap-2 flex-wrap">
        {result.pipeline_steps.map((step, i) => (
          <span key={i} className="badge-gray text-[10px]">
            {step.replace(/_/g, ' ')}
          </span>
        ))}
        {analysis.processing_time_s && (
          <span className="badge-blue text-[10px] ml-auto">
            <Clock size={9} />
            {analysis.processing_time_s.toFixed(2)}s
          </span>
        )}
      </div>
    </div>
  )
}
