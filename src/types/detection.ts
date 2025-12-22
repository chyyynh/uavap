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

export interface TaskOption {
  id: string
  label: string
  checked: boolean
  disabled?: boolean
  parentId?: string
  helpText?: string
}

export type LayerType = 'base' | 'landcover' | 'person' | 'vehicle' | 'cone'

export interface LayerVisibility {
  base: boolean
  landcover: boolean
  person: boolean
  vehicle: boolean
  cone: boolean
}
