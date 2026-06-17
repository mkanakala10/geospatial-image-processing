// ─── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'analyst' | 'viewer'

export interface User {
  id: string
  email: string
  username: string
  full_name: string | null
  role: UserRole
  is_active: boolean
  is_verified: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

// ─── Regions ──────────────────────────────────────────────────────────────────
export type RegionType = 'polygon' | 'rectangle' | 'circle'

export interface GeoJsonGeometry {
  type: 'Polygon' | 'MultiPolygon' | 'Point' | 'LineString'
  coordinates: unknown[]
}

export interface Region {
  id: string
  owner_id: string
  name: string
  description: string | null
  region_type: RegionType
  geometry: GeoJsonGeometry
  bbox_min_lat: number
  bbox_max_lat: number
  bbox_min_lon: number
  bbox_max_lon: number
  tags: string[]
  created_at: string
}

// ─── Analyses ─────────────────────────────────────────────────────────────────
export type AnalysisType =
  | 'sar_backscatter'
  | 'optical_ndvi'
  | 'change_detection'
  | 'anomaly_detection'
  | 'elevation_model'

export type AnalysisStatus =
  | 'pending'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface Anomaly {
  id: number
  centroid_px: [number, number]
  area_px: number
  severity: number
}

export interface AnalysisResult {
  processing_time_s: number
  output_image_b64: string
  anomaly_overlay_b64: string
  anomalies: Anomaly[]
  statistics: Record<string, number | string>
  pipeline_steps: string[]
  change_regions?: Anomaly[]
}

export interface Analysis {
  id: string
  owner_id: string
  region_id: string | null
  name: string
  analysis_type: AnalysisType
  status: AnalysisStatus
  task_id: string | null
  parameters: Record<string, unknown>
  input_source: string | null
  result_data: AnalysisResult | null
  ai_summary: string | null
  progress: number
  processing_time_s: number | null
  error_message: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface AnalysisStatusPoll {
  id: string
  status: AnalysisStatus
  progress: number
  error_message: string | null
  result_data: AnalysisResult | null
  ai_summary: string | null
  processing_time_s: number | null
}

// ─── API ──────────────────────────────────────────────────────────────────────
export interface ApiError {
  detail: string | { msg: string; loc: string[] }[]
}

export interface CreateAnalysisPayload {
  name: string
  analysis_type: AnalysisType
  region_id?: string
  parameters?: Record<string, unknown>
  input_source?: string
}

export interface CreateRegionPayload {
  name: string
  description?: string
  region_type?: RegionType
  geometry: GeoJsonGeometry
  tags?: string[]
}
