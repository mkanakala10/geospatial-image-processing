import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, MapPin, Loader2, Tag } from 'lucide-react'
import { regionsApi, getErrorMessage } from '@/services/api'
import { useMapStore } from '@/store/mapStore'
import MapView from '@/components/MapView'
import type { Region } from '@/types'
import clsx from 'clsx'

export default function MapPage() {
  const qc = useQueryClient()
  const { drawnGeometry, selectedRegion, setSelectedRegion, setDrawnGeometry } = useMapStore()
  const [regionName, setRegionName] = useState('')
  const [regionDesc, setRegionDesc] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: regions = [], isLoading } = useQuery({
    queryKey: ['regions'],
    queryFn: regionsApi.list,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => regionsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['regions'] }),
  })

  const handleSaveRegion = async () => {
    if (!drawnGeometry) return
    if (!regionName.trim()) { setSaveError('Enter a region name'); return }
    setSaveError('')
    setSaving(true)
    try {
      await regionsApi.create({
        name: regionName.trim(),
        description: regionDesc || undefined,
        geometry: drawnGeometry,
        region_type: drawnGeometry.type === 'Polygon' ? 'polygon' : 'polygon',
      })
      qc.invalidateQueries({ queryKey: ['regions'] })
      setRegionName('')
      setRegionDesc('')
      setDrawnGeometry(null)
    } catch (err) {
      setSaveError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full gap-4 animate-fade-in" style={{ height: 'calc(100vh - 10rem)' }}>
      {/* Sidebar */}
      <div className="w-72 flex flex-col gap-4 overflow-y-auto shrink-0">
        {/* Draw instructions */}
        <div className="card">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">
            Draw Region of Interest
          </p>
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            Use the polygon or rectangle tool on the map to define an area. Then save it below to use in analyses.
          </p>

          {drawnGeometry ? (
            <div className="space-y-3">
              <div className="bg-geo-900/20 border border-geo-700/40 rounded-lg px-3 py-2 text-xs text-geo-300">
                Region drawn. Save it below.
              </div>
              <div>
                <label className="label">Region Name</label>
                <input className="input" placeholder="e.g. Kilauea Summit" value={regionName}
                  onChange={(e) => setRegionName(e.target.value)} />
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <input className="input" placeholder="Volcanic zone, East Rift…" value={regionDesc}
                  onChange={(e) => setRegionDesc(e.target.value)} />
              </div>
              {saveError && <p className="text-xs text-red-400">{saveError}</p>}
              <button className="btn-primary w-full text-xs" onClick={handleSaveRegion} disabled={saving}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                {saving ? 'Saving…' : 'Save Region'}
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-700 rounded-lg py-6 text-center text-slate-500 text-xs">
              <MapPin size={20} className="mx-auto mb-2 opacity-40" />
              Use the draw tool on the map
            </div>
          )}
        </div>

        {/* Saved regions list */}
        <div className="card flex-1">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">
            Saved Regions ({regions.length})
          </p>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-slate-500" /></div>
          ) : regions.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              <MapPin size={20} className="mx-auto mb-2 opacity-30" />
              No regions saved yet
            </div>
          ) : (
            <div className="space-y-1.5">
              {regions.map((region) => (
                <RegionItem
                  key={region.id}
                  region={region}
                  isSelected={selectedRegion?.id === region.id}
                  onSelect={() => setSelectedRegion(selectedRegion?.id === region.id ? null : region)}
                  onDelete={() => deleteMutation.mutate(region.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 rounded-xl overflow-hidden border border-slate-700/60">
        <MapView
          regions={regions}
          showDraw
          selectedRegion={selectedRegion}
          onRegionClick={(r) => setSelectedRegion(r.id === selectedRegion?.id ? null : r)}
        />
      </div>
    </div>
  )
}

function RegionItem({
  region, isSelected, onSelect, onDelete,
}: {
  region: Region
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors group',
        isSelected ? 'bg-geo-900/30 border border-geo-700/40' : 'hover:bg-surface',
      )}
      onClick={onSelect}
    >
      <MapPin size={13} className={isSelected ? 'text-geo-400' : 'text-slate-500'} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-200 truncate">{region.name}</p>
        {region.tags.length > 0 && (
          <div className="flex gap-1 mt-0.5">
            {region.tags.slice(0, 2).map((t) => (
              <span key={t} className="text-[9px] bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded-full">
                <Tag size={7} className="inline mr-0.5" />{t}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}
