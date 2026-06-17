import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Region, GeoJsonGeometry } from '@/types'
import { useMapStore } from '@/store/mapStore'

// Fix Leaflet default marker icon path broken by bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ─── Fly-to control ───────────────────────────────────────────────────────────
function FlyToControl() {
  const map = useMap()
  const { mapCenter, mapZoom } = useMapStore()
  const prevCenter = useRef(mapCenter)

  useEffect(() => {
    if (prevCenter.current !== mapCenter) {
      map.flyTo(mapCenter, mapZoom, { duration: 1.2 })
      prevCenter.current = mapCenter
    }
  }, [map, mapCenter, mapZoom])

  return null
}

// ─── Result image overlay ─────────────────────────────────────────────────────
function ResultOverlay({
  imageB64,
  region,
}: {
  imageB64: string | null
  region: Region | null
}) {
  const map = useMap()
  const overlayRef = useRef<L.ImageOverlay | null>(null)

  useEffect(() => {
    if (overlayRef.current) {
      map.removeLayer(overlayRef.current)
      overlayRef.current = null
    }
    if (!imageB64 || !region) return

    const bounds: L.LatLngBoundsExpression = [
      [region.bbox_min_lat, region.bbox_min_lon],
      [region.bbox_max_lat, region.bbox_max_lon],
    ]
    overlayRef.current = L.imageOverlay(`data:image/png;base64,${imageB64}`, bounds, {
      opacity: 0.75,
      interactive: false,
    }).addTo(map)
    map.fitBounds(bounds, { padding: [40, 40] })

    return () => {
      if (overlayRef.current) map.removeLayer(overlayRef.current)
    }
  }, [imageB64, region, map])

  return null
}

// ─── Draw control ─────────────────────────────────────────────────────────────
function DrawControl() {
  const map = useMap()
  const { setDrawnGeometry } = useMapStore()
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null)

  useEffect(() => {
    const drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)
    drawnItemsRef.current = drawnItems

    // Dynamically load leaflet-draw
    import('leaflet-draw').then(() => {
      const drawControl = new (L.Control as unknown as { Draw: new (opts: unknown) => L.Control }).Draw({
        position: 'topright',
        draw: {
          polygon: { shapeOptions: { color: '#14b8a6', weight: 2, fillOpacity: 0.15 } },
          rectangle: { shapeOptions: { color: '#14b8a6', weight: 2, fillOpacity: 0.15 } },
          circle: false,
          circlemarker: false,
          polyline: false,
          marker: false,
        },
        edit: { featureGroup: drawnItems },
      })
      map.addControl(drawControl)

      map.on(L.Draw.Event.CREATED, (e: unknown) => {
        const event = e as { layer: L.Layer & { toGeoJSON: () => { geometry: GeoJsonGeometry } } }
        drawnItems.clearLayers()
        drawnItems.addLayer(event.layer)
        const geojson = event.layer.toGeoJSON()
        setDrawnGeometry(geojson.geometry)
      })

      map.on(L.Draw.Event.DELETED, () => {
        setDrawnGeometry(null)
      })
    })

    return () => {
      map.removeLayer(drawnItems)
    }
  }, [map, setDrawnGeometry])

  return null
}

// ─── Main MapView ─────────────────────────────────────────────────────────────
interface MapViewProps {
  regions?: Region[]
  showDraw?: boolean
  onRegionClick?: (region: Region) => void
  resultImageB64?: string | null
  selectedRegion?: Region | null
}

export default function MapView({
  regions = [],
  showDraw = false,
  onRegionClick,
  resultImageB64,
  selectedRegion,
}: MapViewProps) {
  const { mapCenter, mapZoom, activeResultImageB64 } = useMapStore()
  const effectiveImage = resultImageB64 ?? activeResultImageB64

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      style={{ height: '100%', width: '100%' }}
      className="overflow-hidden rounded-xl"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FlyToControl />

      {regions.map((region) => (
        <GeoJSON
          key={region.id}
          data={{ type: 'Feature', geometry: region.geometry, properties: {} } as unknown as GeoJSON.GeoJsonObject}
          style={{
            color: selectedRegion?.id === region.id ? '#14b8a6' : '#6b7280',
            weight: 2,
            fillOpacity: selectedRegion?.id === region.id ? 0.2 : 0.05,
          }}
          eventHandlers={{
            click: () => onRegionClick?.(region),
          }}
        />
      ))}

      {effectiveImage && selectedRegion && (
        <ResultOverlay imageB64={effectiveImage} region={selectedRegion} />
      )}

      {showDraw && <DrawControl />}
    </MapContainer>
  )
}
