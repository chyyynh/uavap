import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { DetectionObject, Project, GpuStatus, OrthoBounds, TiffMetadata } from '@/types/detection'
import { MOCK_OBJECTS, MOCK_PROJECTS, MOCK_GPU_STATUS } from './mock-data'
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
 * 是否使用 mock 資料
 */
function useMock(): boolean {
  return !getApiBaseUrl()
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
  if (useMock()) {
    await new Promise((resolve) => setTimeout(resolve, 50))
    return MOCK_PROJECTS
  }

  return apiRequest<Project[]>('/api/projects')
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
 * 取得正射影像 URL
 */
export function getOrthoImageUrl(): string | null {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) return null
  return `${baseUrl}/api/ortho/image`
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
 * 上傳檔案（自動判斷類型：TIFF/DSM/LAZ）
 */
async function uploadFile(
  file: File,
): Promise<{ filename: string; message: string; type: string }> {
  if (useMock()) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const ext = file.name.split('.').pop()?.toLowerCase()
    let type = 'ortho'
    if (ext === 'laz' || ext === 'las') type = 'laz'
    else if (ext === 'dsm') type = 'dsm'
    return { filename: file.name, message: '模擬上傳成功', type }
  }

  const formData = new FormData()
  formData.append('file', file)

  const baseUrl = getApiBaseUrl()
  const response = await fetch(`${baseUrl}/api/upload`, {
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
    enabled: !useMock(),
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
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
      queryClient.invalidateQueries({ queryKey: orthoKeys.bounds })
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
