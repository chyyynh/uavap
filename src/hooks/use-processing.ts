'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ProcessingStep } from '@/types/detection'
import { INITIAL_PROCESSING_STEPS } from '@/api/mock-data'
import { getStoredApiUrl, orthoKeys } from '@/api/queries'

interface UseProcessingReturn {
  isRunning: boolean
  progress: number
  elapsed: number
  steps: ProcessingStep[]
  currentStep: string
  run: () => void
  reset: () => void
}

export function useProcessing(): UseProcessingReturn {
  const queryClient = useQueryClient()
  const [isRunning, setIsRunning] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [elapsed, setElapsed] = React.useState(0)
  const [currentStep, setCurrentStep] = React.useState('')
  const [steps, setSteps] = React.useState<ProcessingStep[]>(
    INITIAL_PROCESSING_STEPS
  )
  const pollingRef = React.useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = React.useRef<number>(0)

  const pollStatus = React.useCallback(async () => {
    const apiUrl = getStoredApiUrl()
    if (!apiUrl) return

    try {
      const response = await fetch(`${apiUrl}/api/process/status`)
      const data = await response.json()

      setProgress(data.progress || 0)
      setCurrentStep(data.current_step || '')
      setElapsed((performance.now() - startTimeRef.current) / 1000)

      // 更新 steps 狀態
      const stepIndex = Math.floor((data.progress / 100) * INITIAL_PROCESSING_STEPS.length)
      setSteps((prev) =>
        prev.map((s, i) => ({
          ...s,
          status:
            i < stepIndex
              ? 'done'
              : i === stepIndex && data.status === 'running'
                ? 'running'
                : 'pending',
        }))
      )

      if (data.status === 'done') {
        setIsRunning(false)
        setSteps((prev) => prev.map((s) => ({ ...s, status: 'done' as const })))
        // 重新抓取偵測結果和正射影像邊界
        queryClient.invalidateQueries({ queryKey: ['detections'] })
        queryClient.invalidateQueries({ queryKey: ['projects'] })
        queryClient.invalidateQueries({ queryKey: orthoKeys.bounds })
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      } else if (data.status === 'error') {
        setIsRunning(false)
        setSteps((prev) =>
          prev.map((s, i) =>
            i === Math.floor((data.progress / 100) * prev.length)
              ? { ...s, status: 'error' as const }
              : s
          )
        )
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      }
    } catch (error) {
      console.error('Failed to poll status:', error)
    }
  }, [queryClient])

  const run = React.useCallback(async () => {
    if (isRunning) return

    const apiUrl = getStoredApiUrl()
    console.log('🚀 Run clicked, API URL:', apiUrl || '(not connected, using mock)')

    // 如果沒有連接 API，使用 mock 模式
    if (!apiUrl) {
      console.log('📝 Using mock mode')
      setIsRunning(true)
      setProgress(0)
      setElapsed(0)
      setSteps(
        INITIAL_PROCESSING_STEPS.map((s) => ({
          ...s,
          status: 'pending' as const,
        }))
      )

      const startTime = performance.now()
      const stepDurations = [0.7, 0.4, 0.5, 0.6, 0.5]

      const runStep = (stepIndex: number) => {
        if (stepIndex >= stepDurations.length) {
          setIsRunning(false)
          return
        }

        setSteps((prev) =>
          prev.map((s, i) =>
            i === stepIndex ? { ...s, status: 'running' as const } : s
          )
        )

        setTimeout(() => {
          setSteps((prev) =>
            prev.map((s, i) =>
              i === stepIndex
                ? { ...s, status: 'done' as const, elapsed: stepDurations[stepIndex] }
                : s
            )
          )
          setProgress(Math.round(((stepIndex + 1) / stepDurations.length) * 100))
          setElapsed((performance.now() - startTime) / 1000)
          runStep(stepIndex + 1)
        }, stepDurations[stepIndex] * 1000)
      }

      runStep(0)
      return
    }

    // 呼叫真實 API
    try {
      console.log('📡 Calling API:', `${apiUrl}/api/process`)
      setIsRunning(true)
      setProgress(0)
      setElapsed(0)
      startTimeRef.current = performance.now()
      setSteps(
        INITIAL_PROCESSING_STEPS.map((s) => ({
          ...s,
          status: 'pending' as const,
        }))
      )

      const response = await fetch(`${apiUrl}/api/process`, {
        method: 'POST',
      })
      const data = await response.json()
      console.log('📡 API response:', data)

      if (data.error) {
        console.error('Process error:', data.error)
        setIsRunning(false)
        return
      }

      console.log('✅ Started polling status...')
      // 開始輪詢狀態
      pollingRef.current = setInterval(pollStatus, 1000)
    } catch (error) {
      console.error('❌ Failed to start process:', error)
      setIsRunning(false)
    }
  }, [isRunning, pollStatus])

  const reset = React.useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setIsRunning(false)
    setProgress(0)
    setElapsed(0)
    setCurrentStep('')
    setSteps(INITIAL_PROCESSING_STEPS)
  }, [])

  // 清理
  React.useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  return { isRunning, progress, elapsed, steps, currentStep, run, reset }
}
