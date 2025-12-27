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
