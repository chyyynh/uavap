'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ProcessingLogEntry, ProcessingStep } from '@/types/detection'
import { getStoredApiUrl, orthoKeys } from '@/api/queries'
import { useTaskOptionsContext } from '@/contexts/TaskOptionsContext'

interface UseProcessingReturn {
  isRunning: boolean
  progress: number
  elapsed: number
  steps: ProcessingStep[]
  currentStep: string
  run: () => void
  reset: () => void
  downloadLog: (projectName?: string) => void
}

export function useProcessing(): UseProcessingReturn {
  const queryClient = useQueryClient()
  const { options, fileMode } = useTaskOptionsContext()
  const [isRunning, setIsRunning] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [elapsed, setElapsed] = React.useState(0)
  const [currentStep, setCurrentStep] = React.useState('')
  const [steps, setSteps] = React.useState<ProcessingStep[]>([])
  const pollingRef = React.useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = React.useRef<number>(0)
  const stepsRef = React.useRef<ProcessingStep[]>([])
  const logRef = React.useRef<ProcessingLogEntry[]>([])
  const lastLogKeyRef = React.useRef<string>('')

  const appendLog = React.useCallback((entry: Omit<ProcessingLogEntry, 'timestamp'>) => {
    logRef.current.push({ ...entry, timestamp: new Date().toISOString() })
  }, [])

  const formatTimestamp = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, '0')
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  }

  const downloadLog = React.useCallback((projectName?: string) => {
    const safeProjectName = (projectName || 'project').trim().replace(/\s+/g, '-')
    const stamp = formatTimestamp(new Date())
    const filename = `${safeProjectName}_${stamp}_log.json`
    const payload = logRef.current.length
      ? logRef.current
      : [{ timestamp: new Date().toISOString(), event: 'no_log', status: 'pending' as const }]
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const buildSteps = React.useCallback((): ProcessingStep[] => {
    const items: ProcessingStep[] = []
    let id = 1
    items.push({ id: id++, name: 'Object detection', status: 'pending' })
    if (options.geoEnabled) {
      items.push({ id: id++, name: 'Height / volume analysis', status: 'pending' })
    }
    if (options.changeEnabled) {
      items.push({ id: id++, name: 'Semantic segmentation', status: 'pending' })
    }
    return items
  }, [options.changeEnabled, options.geoEnabled])

  const pollStatus = React.useCallback(async () => {
    const apiUrl = getStoredApiUrl()
    if (!apiUrl) return

    try {
      const response = await fetch(`${apiUrl}/api/process/status`)
      const data = await response.json()
      const logKey = `${data.status || ''}|${data.current_step || ''}|${data.progress || 0}`
      if (logKey !== lastLogKeyRef.current) {
        lastLogKeyRef.current = logKey
        appendLog({
          event: 'step_status',
          status: data.status || 'running',
          step: data.current_step || undefined,
        })
      }

      setProgress(data.progress || 0)
      setCurrentStep(data.current_step || '')
      setElapsed((performance.now() - startTimeRef.current) / 1000)

      const totalSteps = Math.max(stepsRef.current.length, 1)
      const stepIndex = Math.floor((data.progress / 100) * totalSteps)
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
        appendLog({
          event: 'run_done',
          status: 'done',
          outputs: [
            options.statsEnabled ? 'stats.json' : null,
            options.pdfEnabled ? 'report.pdf' : null,
            options.geojsonEnabled ? 'detections.geojson' : null,
          ].filter(Boolean) as string[],
        })
        setIsRunning(false)
        setSteps((prev) => prev.map((s) => ({ ...s, status: 'done' as const })))
        queryClient.invalidateQueries({ queryKey: ['detections'] })
        queryClient.invalidateQueries({ queryKey: ['projects'] })
        queryClient.invalidateQueries({ queryKey: orthoKeys.bounds })
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      } else if (data.status === 'error') {
        appendLog({ event: 'run_error', status: 'error', step: data.current_step || undefined })
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
    console.log('?? Run clicked, API URL:', apiUrl || '(not connected, using mock)')
    logRef.current = []
    lastLogKeyRef.current = ''
    appendLog({
      event: 'run_start',
      status: 'running',
      inputs: {
        file_mode: fileMode,
        detect_person: options.personEnabled,
        detect_vehicle: options.vehicleEnabled,
        detect_cone: options.coneEnabled,
        include_elevation: options.geoEnabled,
        include_landcover: options.changeEnabled,
        output_stats: options.statsEnabled,
        output_pdf: options.pdfEnabled,
        output_geojson: options.geojsonEnabled,
      },
    })

    if (!apiUrl) {
      console.log('?? Using mock mode')
      setIsRunning(true)
      setProgress(0)
      setElapsed(0)
      const nextSteps = buildSteps().map((s) => ({ ...s, status: 'pending' as const }))
      stepsRef.current = nextSteps
      setSteps(nextSteps)

      const startTime = performance.now()
      const stepDurations = nextSteps.map(() => 0.6)

      const runStep = (stepIndex: number) => {
        if (stepIndex >= stepDurations.length) {
          appendLog({
            event: 'run_done',
            status: 'done',
            outputs: [
              options.statsEnabled ? 'stats.json' : null,
              options.pdfEnabled ? 'report.pdf' : null,
              options.geojsonEnabled ? 'detections.geojson' : null,
            ].filter(Boolean) as string[],
          })
          setIsRunning(false)
          return
        }

        setSteps((prev) =>
          prev.map((s, i) =>
            i === stepIndex ? { ...s, status: 'running' as const } : s
          )
        )
        appendLog({ event: 'step_status', status: 'running', step: nextSteps[stepIndex]?.name })

        setTimeout(() => {
          setSteps((prev) =>
            prev.map((s, i) =>
              i === stepIndex
                ? { ...s, status: 'done' as const, elapsed: stepDurations[stepIndex] }
                : s
            )
          )
          appendLog({ event: 'step_status', status: 'done', step: nextSteps[stepIndex]?.name })
          setProgress(Math.round(((stepIndex + 1) / stepDurations.length) * 100))
          setElapsed((performance.now() - startTime) / 1000)
          runStep(stepIndex + 1)
        }, stepDurations[stepIndex] * 1000)
      }

      runStep(0)
      return
    }

    try {
      console.log('??? Calling API:', `${apiUrl}/api/process`)
      setIsRunning(true)
      setProgress(0)
      setElapsed(0)
      setCurrentStep('')
      startTimeRef.current = performance.now()
      const nextSteps = buildSteps().map((s) => ({ ...s, status: 'pending' as const }))
      stepsRef.current = nextSteps
      setSteps(nextSteps)

      const response = await fetch(`${apiUrl}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: 'current',
          detect_person: options.personEnabled,
          detect_vehicle: options.vehicleEnabled,
          detect_cone: options.coneEnabled,
          include_elevation: options.geoEnabled,
          include_terrain: false,
          include_landcover: options.changeEnabled,
          output_stats: options.statsEnabled,
          output_pdf: options.pdfEnabled,
          output_geojson: options.geojsonEnabled,
        }),
      })
      const data = await response.json()
      console.log('??? API response:', data)

      if (data.error) {
        console.error('Process error:', data.error)
        appendLog({ event: 'run_error', status: 'error' })
        setIsRunning(false)
        return
      }

      console.log('??Started polling status...')
      pollingRef.current = setInterval(pollStatus, 1000)
    } catch (error) {
      console.error('??Failed to start process:', error)
      appendLog({ event: 'run_error', status: 'error' })
      setIsRunning(false)
    }
  }, [appendLog, buildSteps, fileMode, isRunning, options.changeEnabled, options.coneEnabled, options.geoEnabled, options.geojsonEnabled, options.pdfEnabled, options.personEnabled, options.statsEnabled, options.vehicleEnabled, pollStatus])

  const reset = React.useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setIsRunning(false)
    setProgress(0)
    setElapsed(0)
    setCurrentStep('')
    const nextSteps = buildSteps()
    stepsRef.current = nextSteps
    setSteps(nextSteps)
    logRef.current = []
    lastLogKeyRef.current = ''
  }, [buildSteps])

  React.useEffect(() => {
    const nextSteps = buildSteps()
    stepsRef.current = nextSteps
    setSteps(nextSteps)
  }, [buildSteps])

  React.useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  return { isRunning, progress, elapsed, steps, currentStep, run, reset, downloadLog }
}
