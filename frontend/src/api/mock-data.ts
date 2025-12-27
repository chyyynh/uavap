import type {
  DetectionObject,
  Project,
  GpuStatus,
  ProcessingStep,
} from '@/types/detection'

export const MOCK_OBJECTS: DetectionObject[] = [
  {
    id: 1,
    cls: 'vehicle',
    score: 0.924,
    center_x: 214297.40625,
    center_y: 2558033.75,
    area_m2: 13.640625,
    aspect_rat: 1.4845356,
    elev_z: 36.2,
    height_m: 1.4,
    lat: 25.04761,
    lon: 121.53291,
  },
  {
    id: 2,
    cls: 'vehicle',
    score: 0.924,
    center_x: 214283.84375,
    center_y: 2558021.5,
    area_m2: 15.609375,
    aspect_rat: 1.2972969,
    elev_z: 36.0,
    height_m: 1.2,
    lat: 25.04758,
    lon: 121.53274,
  },
  {
    id: 3,
    cls: 'vehicle',
    score: 0.914,
    center_x: 214276.53125,
    center_y: 2557982.0,
    area_m2: 26.0546875,
    aspect_rat: 1.2689652,
    elev_z: 35.6,
    height_m: 1.0,
    lat: 25.04722,
    lon: 121.5332,
  },
  {
    id: 4,
    cls: 'person',
    score: 0.882,
    center_x: 214290.12,
    center_y: 2558010.24,
    area_m2: 0.38,
    aspect_rat: 1.1,
    elev_z: 36.1,
    height_m: 1.7,
    lat: 25.04743,
    lon: 121.53266,
  },
  {
    id: 5,
    cls: 'cone',
    score: 0.801,
    center_x: 214289.22,
    center_y: 2558008.12,
    area_m2: 0.12,
    aspect_rat: 0.98,
    elev_z: 36.1,
    height_m: 0.7,
    lat: 25.04745,
    lon: 121.53262,
  },
]

export const MOCK_PROJECTS: Project[] = [
  { id: 'mock', name: '[MOCK] Demo Data' },
  { id: 'futas', name: 'FUTAS_Test_Field' },
  { id: 'harbor', name: 'Harbor_Breakwater' },
  { id: 'bridge', name: 'Bridge_Inspection' },
]

export const MOCK_GPU_STATUS: GpuStatus = {
  name: 'RTX 3070 Ti',
  status: 'online',
}

export const INITIAL_PROCESSING_STEPS: ProcessingStep[] = [
  { id: 1, name: 'Semantic segmentation', status: 'pending' },
  { id: 2, name: 'Object extraction', status: 'pending' },
  { id: 3, name: 'Terrain / DSM sampling', status: 'pending' },
  { id: 4, name: 'Object detection', status: 'pending' },
  { id: 5, name: 'Height / volume analysis', status: 'pending' },
]

export const LANDCOVER_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: { class: 'grass' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [121.5323, 25.0473],
            [121.5323, 25.04785],
            [121.5331, 25.04785],
            [121.5331, 25.0473],
            [121.5323, 25.0473],
          ],
        ],
      },
    },
  ],
}

export const DEFAULT_MAP_CENTER: [number, number] = [25.0476, 121.5329]
export const DEFAULT_MAP_ZOOM = 17

// ============================================
// Mock Landcover Stats
// ============================================
export const MOCK_LANDCOVER_STATUS = {
  computed: true,
  has_stats: true,
}

export const MOCK_LANDCOVER_STATS = {
  classes: {
    0: 'bare-ground',
    1: 'tree',
    2: 'road',
    3: 'pavement',
    4: 'grass',
    5: 'building',
  },
  colors: {
    'bare-ground': [222, 184, 135],
    'tree': [34, 139, 34],
    'road': [128, 128, 128],
    'pavement': [178, 34, 34],
    'grass': [124, 252, 0],
    'building': [255, 140, 0],
  },
  stats: {
    'grass': { pixels: 125000, percentage: 50.4 },
    'road': { pixels: 45000, percentage: 18.1 },
    'bare-ground': { pixels: 36250, percentage: 14.6 },
    'building': { pixels: 27000, percentage: 10.9 },
    'tree': { pixels: 10000, percentage: 4.0 },
    'pavement': { pixels: 5000, percentage: 2.0 },
  },
}

// ============================================
// Mock Terrain Stats
// ============================================
export const MOCK_TERRAIN_STATUS = {
  computed: true,
  has_stats: true,
  dsm_loaded: true,
}

export const MOCK_TERRAIN_STATS = {
  elevation: {
    min: 53.4,
    max: 75.6,
    mean: 61.3,
    std: 3.5,
  },
  slope: {
    min: 0,
    max: 45.2,
    mean: 12.3,
    distribution: {
      flat: { count: 50000, percentage: 28.5 },
      gentle: { count: 45000, percentage: 25.7 },
      moderate: { count: 35000, percentage: 20.0 },
      steep: { count: 45000, percentage: 25.8 },
    },
  },
  aspect: {
    distribution: {
      N: { count: 12000, percentage: 18 },
      NE: { count: 11000, percentage: 17 },
      E: { count: 9000, percentage: 14 },
      SE: { count: 8000, percentage: 12 },
      S: { count: 6000, percentage: 9 },
      SW: { count: 5000, percentage: 8 },
      W: { count: 6000, percentage: 9 },
      NW: { count: 8000, percentage: 12 },
    },
  },
}

// ============================================
// Mock Ortho Data
// ============================================
export const MOCK_ORTHO_BOUNDS = {
  north: 25.048,
  south: 25.047,
  east: 121.534,
  west: 121.532,
}

export const MOCK_TIFF_METADATA = {
  filename: 'demo_ortho.tif',
  datetime: new Date().toISOString(),
  width: 4096,
  height: 3072,
  crs: 'EPSG:4326',
  pixel_w: 0.05,
  pixel_h: 0.05,
}
