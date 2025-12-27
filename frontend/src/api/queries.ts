import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  DetectionObject,
  Project,
  GpuStatus,
  OrthoBounds,
  TiffMetadata,
  LandcoverStats,
  LandcoverStatus,
  TerrainStats,
  TerrainStatus,
} from '@/types/detection'
import {
  MOCK_OBJECTS,
  MOCK_PROJECTS,
  MOCK_GPU_STATUS,
  MOCK_LANDCOVER_STATUS,
  MOCK_LANDCOVER_STATS,
  MOCK_TERRAIN_STATUS,
  MOCK_TERRAIN_STATS,
  MOCK_ORTHO_BOUNDS,
  MOCK_TIFF_METADATA,
} from './mock-data'
import { notify } from '@/components/ui/sonner'

// ============================================
// API 設定
// ============================================

const STORAGE_KEY = 'uav_api_url'
const DEFAULT_API_URL = 'https://chyyynh-uav-detection-api.hf.space'

/**
 * 取得 API 基礎網址（從 localStorage，預設使用 HuggingFace Spaces）
 */
function getApiBaseUrl(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_API_URL
}

/**
 * 設定 API 基礎網址
 */
export function setApiBaseUrl(url: string | null): void {
  if (typeof window === 'undefined') return
  if (url && url.trim()) {
    localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/$/, ''))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

/**
 * 取得目前儲存的 API URL
 */
export function getStoredApiUrl(): string {
  return getApiBaseUrl() || DEFAULT_API_URL
}

/**
 * 強制完整 mock 模式（用於 /mock 路由）
 */
let _forceFullMock = false

export function setForceFullMock(value: boolean): void {
  _forceFullMock = value
}

export function isForceFullMock(): boolean {
  return _forceFullMock
}

/**
 * 是否使用 mock 資料
 */
function useMock(): boolean {
  return _forceFullMock || !getApiBaseUrl()
}

/**
 * 是否使用完整 mock 資料（包含 landcover/terrain）
 */
function useFullMock(): boolean {
  return _forceFullMock
}

// ============================================
// Query Keys（快取鍵）
// ============================================

export const detectionKeys = {
  all: ['detections'] as const,
  byProject: (projectId: string) => [...detectionKeys.all, projectId] as const,
}

export const projectKeys = {
  all: ['projects'] as const,
}

export const gpuKeys = {
  status: ['gpu', 'status'] as const,
}

export const processingKeys = {
  all: ['processing'] as const,
  byJob: (jobId: string) => [...processingKeys.all, jobId] as const,
}

export const orthoKeys = {
  bounds: ['ortho', 'bounds'] as const,
  metadata: ['ortho', 'metadata'] as const,
}

export const landcoverKeys = {
  status: ['landcover', 'status'] as const,
  stats: ['landcover', 'stats'] as const,
}

export const terrainKeys = {
  status: ['terrain', 'status'] as const,
  stats: ['terrain', 'stats'] as const,
}

// ============================================
// API 請求函式
// ============================================

/**
 * 通用 API 請求函式
 * 處理錯誤和 JSON 解析
 */
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API 錯誤 (${response.status}): ${error}`)
  }

  return response.json()
}

/**
 * 取得偵測結果
 * @param projectId 專案 ID
 */
async function fetchDetections(projectId: string): Promise<DetectionObject[]> {
  // 使用 mock 資料
  if (useMock()) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    return MOCK_OBJECTS
  }

  // 呼叫真實 API
  return apiRequest<DetectionObject[]>(`/api/detections/${projectId}`)
}

/**
 * 取得專案列表
 */
async function fetchProjects(): Promise<Project[]> {
  // 總是包含 mock project 選項
  const mockProject = MOCK_PROJECTS.find(p => p.id === 'mock')

  if (useMock()) {
    await new Promise((resolve) => setTimeout(resolve, 50))
    return MOCK_PROJECTS
  }

  try {
    const apiProjects = await apiRequest<Project[]>('/api/projects')
    // 在 API 返回的 projects 前面加上 mock project 選項
    return mockProject ? [mockProject, ...apiProjects] : apiProjects
  } catch {
    // API 失敗時回傳 mock 資料
    return MOCK_PROJECTS
  }
}

/**
 * 取得 GPU 狀態
 */
async function fetchGpuStatus(): Promise<GpuStatus> {
  if (useMock()) {
    await new Promise((resolve) => setTimeout(resolve, 50))
    return MOCK_GPU_STATUS
  }

  return apiRequest<GpuStatus>('/api/gpu/status')
}

/**
 * 取得正射影像邊界
 */
async function fetchOrthoBounds(): Promise<OrthoBounds | null> {
  if (useFullMock()) {
    return MOCK_ORTHO_BOUNDS
  }
  if (useMock()) {
    return null
  }

  try {
    const result = await apiRequest<OrthoBounds & { error?: string }>('/api/ortho/bounds')
    // 檢查是否為有效的邊界資料
    if (result.error || result.north === undefined || result.south === undefined) {
      return null
    }
    return result
  } catch {
    return null
  }
}

/**
 * 取得正射影像 URL（含壓縮參數）
 * @param maxWidth 最大寬度（預設 2000px，適合地圖顯示）
 * @param quality JPEG 品質 (1-95)
 */
export function getOrthoImageUrl(maxWidth = 2000, quality = 80): string | null {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) return null
  return `${baseUrl}/api/ortho/image?max_width=${maxWidth}&quality=${quality}`
}

/**
 * 取得正射影像預覽圖 URL（含偵測結果，用於 PDF）
 */
export function getOrthoPreviewUrl(withDetections = true, width = 800, height = 600): string | null {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) return null
  return `${baseUrl}/api/ortho/preview?with_detections=${withDetections}&width=${width}&height=${height}`
}

/**
 * 取得 TIFF 元資料
 */
async function fetchTiffMetadata(): Promise<TiffMetadata | null> {
  if (useFullMock()) {
    return MOCK_TIFF_METADATA
  }
  if (useMock()) {
    return {
      filename: 'demo_ortho.tif',
      datetime: new Date().toISOString(),
      width: 4096,
      height: 3072,
      crs: 'EPSG:4326',
    }
  }

  try {
    const result = await apiRequest<TiffMetadata & { error?: string }>('/api/ortho/metadata')
    if (result.error) {
      return null
    }
    return result
  } catch {
    return null
  }
}

// ============================================
// Landcover 相關
// ============================================

/**
 * 取得土地覆蓋狀態
 */
async function fetchLandcoverStatus(): Promise<LandcoverStatus> {
  if (useFullMock()) {
    return MOCK_LANDCOVER_STATUS
  }
  if (useMock()) {
    return { computed: false, has_stats: false }
  }

  return apiRequest<LandcoverStatus>('/api/landcover/status')
}

/**
 * 取得土地覆蓋統計
 */
async function fetchLandcoverStats(): Promise<LandcoverStats | null> {
  if (useFullMock()) {
    return MOCK_LANDCOVER_STATS as LandcoverStats
  }
  if (useMock()) {
    return null
  }

  try {
    return await apiRequest<LandcoverStats>('/api/landcover/stats')
  } catch {
    return null
  }
}

/**
 * 取得土地覆蓋彩色圖 URL
 * @param maxWidth 最大寬度（預設 2000px）
 */
export function getLandcoverImageUrl(maxWidth = 2000): string | null {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) return null
  return `${baseUrl}/api/landcover/image?max_width=${maxWidth}`
}

/**
 * 取得土地覆蓋疊加圖 URL
 * @param alpha 透明度 (0-1)
 * @param maxWidth 最大寬度
 * @param quality JPEG 品質
 */
export function getLandcoverOverlayUrl(alpha = 0.5, maxWidth = 2000, quality = 80): string | null {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) return null
  return `${baseUrl}/api/landcover/overlay?alpha=${alpha}&max_width=${maxWidth}&quality=${quality}`
}

/**
 * 執行土地覆蓋分析
 */
async function runLandcoverAnalysis(): Promise<{ status: string; stats: Record<string, unknown> }> {
  return apiRequest('/api/landcover/run', { method: 'POST' })
}

// ============================================
// Terrain 相關
// ============================================

/**
 * 取得地形分析狀態
 */
async function fetchTerrainStatus(): Promise<TerrainStatus> {
  if (useFullMock()) {
    return MOCK_TERRAIN_STATUS
  }
  if (useMock()) {
    return { computed: false, has_stats: false, dsm_loaded: false }
  }

  return apiRequest<TerrainStatus>('/api/terrain/status')
}

/**
 * 取得地形統計
 */
async function fetchTerrainStats(): Promise<TerrainStats | null> {
  if (useFullMock()) {
    return MOCK_TERRAIN_STATS as TerrainStats
  }
  if (useMock()) {
    return null
  }

  try {
    return await apiRequest<TerrainStats>('/api/terrain/stats')
  } catch {
    return null
  }
}

/**
 * 取得坡度圖 URL
 * @param maxWidth 最大寬度（預設 2000px）
 */
export function getSlopeImageUrl(maxWidth = 2000): string | null {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) return null
  return `${baseUrl}/api/terrain/slope?max_width=${maxWidth}`
}

/**
 * 取得坡向圖 URL
 * @param maxWidth 最大寬度（預設 2000px）
 */
export function getAspectImageUrl(maxWidth = 2000): string | null {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) return null
  return `${baseUrl}/api/terrain/aspect?max_width=${maxWidth}`
}

/**
 * 執行地形分析
 */
async function runTerrainAnalysis(): Promise<{ status: string; stats: TerrainStats }> {
  return apiRequest('/api/terrain/run', { method: 'POST' })
}

// ============================================
// 處理任務相關
// ============================================

/**
 * 處理請求參數
 */
export interface ProcessingRequest {
  project_id: string
  detect_person: boolean
  detect_vehicle: boolean
  detect_cone: boolean
  include_elevation: boolean
  include_terrain: boolean
  include_landcover: boolean
  output_stats: boolean
  output_pdf: boolean
  output_gpkg: boolean
}

/**
 * 處理任務回應
 */
export interface ProcessingResponse {
  job_id: string
  status: string
  message: string
}

/**
 * 處理任務狀態
 */
export interface ProcessingStatusResponse {
  job_id: string
  status: 'pending' | 'running' | 'done' | 'error'
  progress: number
  current_step: string
  elapsed_seconds: number
}

/**
 * 上傳檔案參數
 */
export interface UploadFileParams {
  file: File
  fileType: 'ortho' | 'dsm' | 'laz'
}

/**
 * 上傳檔案（根據類型選擇端點）
 */
async function uploadFile(
  params: UploadFileParams,
): Promise<{ filename: string; message: string; type: string }> {
  const { file, fileType } = params

  if (useMock()) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return { filename: file.name, message: '模擬上傳成功', type: fileType }
  }

  const formData = new FormData()
  formData.append('file', file)

  const baseUrl = getApiBaseUrl()
  // DSM 使用專屬端點，其他使用通用端點
  const endpoint = fileType === 'dsm' ? '/api/upload/dsm' : '/api/upload'
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`上傳失敗 (${response.status}): ${error}`)
  }

  return response.json()
}

/**
 * 啟動處理任務
 */
async function startProcessing(
  request: ProcessingRequest,
): Promise<ProcessingResponse> {
  if (useMock()) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return {
      job_id: `mock_job_${Date.now()}`,
      status: 'started',
      message: '模擬處理任務已啟動',
    }
  }

  return apiRequest<ProcessingResponse>('/api/process', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/**
 * 取得處理任務狀態
 */
async function fetchProcessingStatus(
  jobId: string,
): Promise<ProcessingStatusResponse> {
  if (useMock()) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    return {
      job_id: jobId,
      status: 'running',
      progress: 50,
      current_step: 'Object detection',
      elapsed_seconds: 2.5,
    }
  }

  return apiRequest<ProcessingStatusResponse>(`/api/process/${jobId}/status`)
}

// ============================================
// React Query Hooks
// ============================================

/**
 * 取得偵測結果 Hook
 */
export function useDetections(projectId: string) {
  return useQuery({
    queryKey: detectionKeys.byProject(projectId),
    queryFn: () => fetchDetections(projectId),
  })
}

/**
 * 取得專案列表 Hook
 */
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: fetchProjects,
  })
}

/**
 * 取得 GPU 狀態 Hook
 */
export function useGpuStatus() {
  return useQuery({
    queryKey: gpuKeys.status,
    queryFn: fetchGpuStatus,
    // 每 30 秒自動更新
    refetchInterval: 30000,
  })
}

/**
 * 取得正射影像邊界 Hook
 */
export function useOrthoBounds() {
  return useQuery({
    queryKey: orthoKeys.bounds,
    queryFn: fetchOrthoBounds,
    enabled: useFullMock() || !useMock(),
  })
}

/**
 * 取得 TIFF 元資料 Hook
 */
export function useTiffMetadata() {
  return useQuery({
    queryKey: orthoKeys.metadata,
    queryFn: fetchTiffMetadata,
  })
}

/**
 * 上傳檔案 Hook（支援 TIFF/DSM/LAZ）
 */
export function useUploadFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: uploadFile,
    onSuccess: (data) => {
      const typeLabel = data.type === 'laz' ? 'LAZ' : data.type === 'dsm' ? 'DSM' : 'Image'
      notify.success(`${typeLabel} uploaded`, data.filename)

      // 上傳新的 ortho 時，清除所有快取（包含舊的偵測結果）
      if (data.type === 'ortho') {
        queryClient.clear()
      } else {
        queryClient.invalidateQueries({ queryKey: projectKeys.all })
        queryClient.invalidateQueries({ queryKey: orthoKeys.bounds })
      }
    },
    onError: (error) => {
      notify.error('Upload failed', error instanceof Error ? error.message : 'Unknown error')
    },
  })
}

/**
 * 啟動處理任務 Hook
 */
export function useStartProcessing() {
  return useMutation({
    mutationFn: startProcessing,
    onSuccess: (data) => {
      notify.info('Processing started', `Job ID: ${data.job_id}`)
    },
    onError: (error) => {
      notify.error('Processing failed', error instanceof Error ? error.message : 'Unknown error')
    },
  })
}

/**
 * 取得處理任務狀態 Hook
 */
export function useProcessingStatus(jobId: string | null) {
  return useQuery({
    queryKey: processingKeys.byJob(jobId ?? ''),
    queryFn: () => fetchProcessingStatus(jobId!),
    enabled: !!jobId, // 只有當 jobId 存在時才執行
    refetchInterval: (query) => {
      // 任務完成後停止輪詢
      const status = query.state.data?.status
      if (status === 'done' || status === 'error') {
        return false
      }
      return 1000 // 每秒更新一次
    },
  })
}

// ============================================
// Landcover Query Hooks
// ============================================

/**
 * 取得土地覆蓋狀態 Hook
 */
export function useLandcoverStatus() {
  return useQuery({
    queryKey: landcoverKeys.status,
    queryFn: fetchLandcoverStatus,
    enabled: useFullMock() || !useMock(),
    refetchInterval: useFullMock() ? false : 5000,
  })
}

/**
 * 取得土地覆蓋統計 Hook
 */
export function useLandcoverStats() {
  return useQuery({
    queryKey: landcoverKeys.stats,
    queryFn: fetchLandcoverStats,
    enabled: useFullMock() || !useMock(),
  })
}

/**
 * 執行土地覆蓋分析 Hook
 */
export function useRunLandcover() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: runLandcoverAnalysis,
    onSuccess: () => {
      notify.success('Landcover analysis complete')
      queryClient.invalidateQueries({ queryKey: landcoverKeys.status })
      queryClient.invalidateQueries({ queryKey: landcoverKeys.stats })
    },
    onError: (error) => {
      notify.error('Landcover analysis failed', error instanceof Error ? error.message : 'Unknown error')
    },
  })
}

// ============================================
// Terrain Query Hooks
// ============================================

/**
 * 取得地形分析狀態 Hook
 */
export function useTerrainStatus() {
  return useQuery({
    queryKey: terrainKeys.status,
    queryFn: fetchTerrainStatus,
    enabled: useFullMock() || !useMock(),
    refetchInterval: useFullMock() ? false : 5000,
  })
}

/**
 * 取得地形統計 Hook
 */
export function useTerrainStats() {
  return useQuery({
    queryKey: terrainKeys.stats,
    queryFn: fetchTerrainStats,
    enabled: useFullMock() || !useMock(),
  })
}

/**
 * 執行地形分析 Hook
 */
export function useRunTerrain() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: runTerrainAnalysis,
    onSuccess: () => {
      notify.success('Terrain analysis complete')
      queryClient.invalidateQueries({ queryKey: terrainKeys.status })
      queryClient.invalidateQueries({ queryKey: terrainKeys.stats })
    },
    onError: (error) => {
      notify.error('Terrain analysis failed', error instanceof Error ? error.message : 'Unknown error')
    },
  })
}

// ============================================
// 工具函式
// ============================================

/**
 * 檢查 API 是否可用
 */
export async function checkApiHealth(): Promise<boolean> {
  if (useMock()) return true

  try {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/`)
    return response.ok
  } catch {
    return false
  }
}

/**
 * 取得 API 設定資訊
 */
export function getApiConfig() {
  return {
    baseUrl: getApiBaseUrl(),
    useMock: useMock(),
  }
}
