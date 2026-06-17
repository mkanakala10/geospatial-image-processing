import { create } from 'zustand'
import type { Region, GeoJsonGeometry } from '@/types'

interface MapState {
  selectedRegion: Region | null
  drawnGeometry: GeoJsonGeometry | null
  mapCenter: [number, number]
  mapZoom: number
  showAnomalyOverlay: boolean
  activeResultImageB64: string | null
  activeOverlayB64: string | null

  setSelectedRegion: (region: Region | null) => void
  setDrawnGeometry: (geom: GeoJsonGeometry | null) => void
  setMapView: (center: [number, number], zoom: number) => void
  setShowAnomalyOverlay: (show: boolean) => void
  setResultImages: (result: string | null, overlay: string | null) => void
  clearResults: () => void
}

export const useMapStore = create<MapState>((set) => ({
  selectedRegion: null,
  drawnGeometry: null,
  mapCenter: [20, 0],
  mapZoom: 3,
  showAnomalyOverlay: false,
  activeResultImageB64: null,
  activeOverlayB64: null,

  setSelectedRegion: (region) => set({ selectedRegion: region }),
  setDrawnGeometry: (geom) => set({ drawnGeometry: geom }),
  setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),
  setShowAnomalyOverlay: (show) => set({ showAnomalyOverlay: show }),
  setResultImages: (result, overlay) =>
    set({ activeResultImageB64: result, activeOverlayB64: overlay }),
  clearResults: () =>
    set({ activeResultImageB64: null, activeOverlayB64: null, showAnomalyOverlay: false }),
}))
