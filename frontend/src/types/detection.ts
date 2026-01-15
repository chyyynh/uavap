export type ObjectClass = 'person' | 'vehicle' | 'cone'

export interface DetectionObject {
  id: number
  cls: ObjectClass
  score: number
  center_x: number
  center_y: number
  area_m2: number
  aspect_rat: number
  elev_z: number
  height_m: number
  volume_m3?: number | null
  volume_reason?: string | null
  lat: number
  lon: number
}

export interface Project {
  id: string
  name: string
}

export interface GpuStatus {
  name: string
  status: 'online' | 'offline' | 'busy'
}

export type ProcessingStepStatus = 'pending' | 'running' | 'done' | 'error'

export interface ProcessingStep {
  id: number
  name: string
  status: ProcessingStepStatus
  elapsed?: number
}

export interface ProcessingLogEntry {
  timestamp: string
  event: 'run_start' | 'step_status' | 'run_done' | 'run_error' | 'no_log'
  status: ProcessingStepStatus | 'running'
  step?: string
  inputs?: {
    file_mode?: 'upload' | 'local'
    detect_person?: boolean
    detect_vehicle?: boolean
    detect_cone?: boolean
    include_elevation?: boolean
    include_landcover?: boolean
    output_stats?: boolean
    output_pdf?: boolean
    output_geojson?: boolean
    aoi_geojson_path?: string | null
    aoi_geojson_file_id?: string | null
    aoi_points?: number[][] | null
    aoi_crs?: string | null
    mission_start_ts?: string | null
  }
  outputs?: string[]
}

export interface TaskOption {
  id: string
  label: string
  checked: boolean
  disabled?: boolean
  parentId?: string
  helpText?: string
}

export type LayerType = 'base' | 'ortho' | 'landcover' | 'slope' | 'aspect' | 'person' | 'vehicle' | 'cone'

export interface LayerVisibility {
  base: boolean
  ortho: boolean
  landcover: boolean
  slope: boolean
  aspect: boolean
  person: boolean
  vehicle: boolean
  cone: boolean
}

export interface OrthoBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface AoiBounds {
  minx: number
  miny: number
  maxx: number
  maxy: number
}

export interface AoiInfo {
  bbox: AoiBounds
  bbox_wgs84?: AoiBounds
  geojson: Record<string, unknown>
  input_geom_type?: string | null
  used_geom_type?: string | null
  buffer_m?: number | null
  image_crs?: string | null
  aoi_crs?: string | null
  assumed_crs?: boolean
}

export interface TiffMetadata {
  filename: string
  datetime: string | null
  width: number
  height: number
  crs?: string
  pixel_w?: number  // Pixel width in meters (e.g., 0.05 = 5cm)
  pixel_h?: number  // Pixel height in meters
}

export interface PdfReportData {
  title: string
  datetime: string
  mapImageBase64: string
  objects: DetectionObject[]
  summary: {
    total: number
    person: number
    vehicle: number
    cone: number
  }
  landcover?: LandcoverStats
  terrain?: TerrainStats
}

// Landcover types
export interface LandcoverClassStats {
  pixels: number
  percentage: number
}

export interface LandcoverStats {
  classes: Record<number, string>
  colors: Record<string, number[]>
  stats: Record<string, LandcoverClassStats>
}

export interface LandcoverStatus {
  computed: boolean
  has_stats: boolean
}

// Terrain types
export interface TerrainElevationStats {
  min: number
  max: number
  mean: number
  std: number
}

export interface TerrainDistributionItem {
  count: number
  percentage: number
}

export interface TerrainSlopeStats {
  min: number
  max: number
  mean: number
  distribution: Record<string, TerrainDistributionItem>
}

export interface TerrainAspectStats {
  distribution: Record<string, TerrainDistributionItem>
}

export interface TerrainStats {
  elevation: TerrainElevationStats
  slope: TerrainSlopeStats
  aspect: TerrainAspectStats
}

export interface TerrainStatus {
  computed: boolean
  has_stats: boolean
  dsm_loaded: boolean
}
