import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { DetectionObject, Project, GpuStatus } from '@/types/detection'
import { MOCK_OBJECTS, MOCK_PROJECTS, MOCK_GPU_STATUS } from './mock-data'

// ============================================
// API 設定
// ============================================

/**
 * API 基礎網址
 *
 * 開發模式：使用 mock 資料（設為 null）
 * 生產模式：填入 Cloudflare Tunnel 產生的網址
 *
 * 範例：'https://xxx-xxx-xxx.trycloudflare.com'
 */
const API_BASE_URL: string | null = 'https://wrap-twelve-howto-fate.trycloudflare.com'

/**
 * 是否使用 mock 資料
 * 當 API_BASE_URL 為 null 時，自動使用 mock 資料
 */
const USE_MOCK = API_BASE_URL === null

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

// ============================================
// API 請求函式
// ============================================

/**
 * 通用 API 請求函式
 * 處理錯誤和 JSON 解析
 */
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

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
  if (USE_MOCK) {
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
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 50))
    return MOCK_PROJECTS
  }

  return apiRequest<Project[]>('/api/projects')
}

/**
 * 取得 GPU 狀態
 */
async function fetchGpuStatus(): Promise<GpuStatus> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 50))
    return MOCK_GPU_STATUS
  }

  return apiRequest<GpuStatus>('/api/gpu/status')
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
 * 啟動處理任務
 */
async function startProcessing(
  request: ProcessingRequest
): Promise<ProcessingResponse> {
  if (USE_MOCK) {
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
  jobId: string
): Promise<ProcessingStatusResponse> {
  if (USE_MOCK) {
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
 * 啟動處理任務 Hook
 */
export function useStartProcessing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: startProcessing,
    onSuccess: (data) => {
      console.log('處理任務已啟動:', data.job_id)
    },
    onError: (error) => {
      console.error('啟動處理任務失敗:', error)
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
  if (USE_MOCK) return true

  try {
    const response = await fetch(`${API_BASE_URL}/`)
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
    baseUrl: API_BASE_URL,
    useMock: USE_MOCK,
  }
}
