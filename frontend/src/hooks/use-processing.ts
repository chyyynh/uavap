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
  missionElapsedSec: number
  missionStartTs: number | null
  missionPaused: boolean
  missionCompleted: boolean
  hasAoi: boolean
  steps: ProcessingStep[]
  currentStep: string
  run: () => void
  reset: () => void
  startMission: () => void
  pauseMission: () => void
  resumeMission: () => void
  resetMission: () => void
  downloadLog: (projectName?: string) => void
}

export function useProcessing(): UseProcessingReturn {
  const MISSION_START_KEY = 'mission_start_ts'
  const MISSION_STATE_KEY = 'mission_state'
  const MISSION_ELAPSED_KEY = 'mission_elapsed_sec'
  const queryClient = useQueryClient()
  const { options, fileMode, uploadedFiles, aoiPoints, aoiCrs } = useTaskOptionsContext()
  const [isRunning, setIsRunning] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [elapsed, setElapsed] = React.useState(0)
  const [missionStartTs, setMissionStartTs] = React.useState<number | null>(null)
  const [missionPaused, setMissionPaused] = React.useState(false)
  const [missionCompleted, setMissionCompleted] = React.useState(false)
  const [missionElapsedSec, setMissionElapsedSec] = React.useState(0)
  const [currentStep, setCurrentStep] = React.useState('')
  const [steps, setSteps] = React.useState<ProcessingStep[]>([])
  const pollingRef = React.useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = React.useRef<number>(0)
  const stepsRef = React.useRef<ProcessingStep[]>([])
  const stepTimingRef = React.useRef<Record<number, { start: number | null; elapsed: number | null }>>({})
  const missionPausedAtRef = React.useRef<number | null>(null)
  const logRef = React.useRef<ProcessingLogEntry[]>([])
  const lastLogKeyRef = React.useRef<string>('')

  const appendLog = React.useCallback((entry: Omit<ProcessingLogEntry, 'timestamp'>) => {
    logRef.current.push({ ...entry, timestamp: new Date().toISOString() })
  }, [])

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(MISSION_START_KEY)
    const storedState = localStorage.getItem(MISSION_STATE_KEY)
    if (!stored || !storedState) {
      localStorage.removeItem(MISSION_START_KEY)
      localStorage.removeItem(MISSION_ELAPSED_KEY)
      return
    }
    const parsed = Number(stored)
    if (!Number.isNaN(parsed) && parsed > 0) {
      setMissionStartTs(parsed)
      if (storedState === 'paused') {
        setMissionPaused(true)
      } else if (storedState === 'completed') {
        setMissionCompleted(true)
        setMissionPaused(true)
        const elapsedStored = localStorage.getItem(MISSION_ELAPSED_KEY)
        if (elapsedStored) {
          const elapsedNum = Number(elapsedStored)
          if (!Number.isNaN(elapsedNum)) setMissionElapsedSec(elapsedNum)
        }
      }
    }
  }, [])

  React.useEffect(() => {
    if (!missionStartTs || missionPaused || missionCompleted) {
      if (!missionStartTs) setMissionElapsedSec(0)
      return
    }
    const tick = () => setMissionElapsedSec((Date.now() - missionStartTs) / 1000)
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [missionStartTs, missionPaused, missionCompleted])

  const startMission = React.useCallback(() => {
    if (missionStartTs && !missionPaused) return
    const now = Date.now()
    if (typeof window !== 'undefined') {
      localStorage.setItem(MISSION_START_KEY, String(now))
      localStorage.setItem(MISSION_STATE_KEY, 'running')
      localStorage.removeItem(MISSION_ELAPSED_KEY)
    }
    setMissionStartTs(now)
    setMissionPaused(false)
    setMissionCompleted(false)
    missionPausedAtRef.current = null
  }, [missionStartTs, missionPaused])

  const pauseMission = React.useCallback(() => {
    if (!missionStartTs || missionPaused) return
    missionPausedAtRef.current = Date.now()
    setMissionPaused(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem(MISSION_STATE_KEY, 'paused')
    }
  }, [missionStartTs, missionPaused])

  const resumeMission = React.useCallback(() => {
    if (!missionStartTs || !missionPaused) return
    const pausedAt = missionPausedAtRef.current
    if (pausedAt) {
      const delta = Date.now() - pausedAt
      const nextStart = missionStartTs + delta
      setMissionStartTs(nextStart)
      if (typeof window !== 'undefined') {
        localStorage.setItem(MISSION_START_KEY, String(nextStart))
        localStorage.setItem(MISSION_STATE_KEY, 'running')
      }
    }
    missionPausedAtRef.current = null
    setMissionPaused(false)
  }, [missionStartTs, missionPaused])

  const resetMission = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(MISSION_START_KEY)
      localStorage.removeItem(MISSION_STATE_KEY)
      localStorage.removeItem(MISSION_ELAPSED_KEY)
    }
    setMissionStartTs(null)
    setMissionPaused(false)
    setMissionCompleted(false)
    missionPausedAtRef.current = null
    setElapsed(0)
    setMissionElapsedSec(0)
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

      const now = Date.now()
      const nextSteps = stepsRef.current.map((s, i) => {
        const totalSteps = Math.max(stepsRef.current.length, 1)
        const stepIndex = Math.floor((data.progress / 100) * totalSteps)
        const status =
          i < stepIndex
            ? 'done'
            : i === stepIndex && data.status === 'running'
              ? 'running'
              : 'pending'
        const timing = stepTimingRef.current[s.id] || { start: null, elapsed: null }
        if (status === 'running' && timing.start == null) {
          timing.start = now
          timing.elapsed = 0
        }
        if (status === 'done' && timing.elapsed == null) {
          const start = timing.start ?? now
          timing.elapsed = Math.max(0, (now - start) / 1000)
        }
        if (status === 'running' && timing.start != null) {
          timing.elapsed = Math.max(0, (now - timing.start) / 1000)
        }
        if (status === 'pending') {
          timing.start = null
          timing.elapsed = null
        }
        stepTimingRef.current[s.id] = timing
        return { ...s, status, elapsed: timing.elapsed ?? s.elapsed }
      })

      setProgress(data.progress || 0)
      setCurrentStep(data.current_step || '')
      setElapsed(data.processing_elapsed_sec ?? data.elapsed_seconds ?? 0)
      setSteps(nextSteps)

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
        setMissionCompleted(true)
        setMissionPaused(true)
        if (data.total_elapsed_sec !== undefined && data.total_elapsed_sec !== null) {
          setMissionElapsedSec(data.total_elapsed_sec)
          if (typeof window !== 'undefined') {
            localStorage.setItem(MISSION_ELAPSED_KEY, String(data.total_elapsed_sec))
            localStorage.setItem(MISSION_STATE_KEY, 'completed')
          }
        }
        setSteps((prev) =>
          prev.map((s) => {
            const timing = stepTimingRef.current[s.id]
            if (timing && timing.elapsed == null && timing.start != null) {
              timing.elapsed = Math.max(0, (Date.now() - timing.start) / 1000)
            }
            return { ...s, status: 'done' as const, elapsed: timing?.elapsed ?? s.elapsed }
          })
        )
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
    const aoiPayloadCrs = aoiPoints ? aoiCrs : null
    const missionStartIso = missionStartTs ? new Date(missionStartTs).toISOString() : null
    const aoiGeojsonPath = fileMode === 'local' && uploadedFiles.aoi?.uploaded ? uploadedFiles.aoi?.name : null
    const aoiGeojsonFileId = fileMode === 'upload' && uploadedFiles.aoi?.uploaded ? uploadedFiles.aoi?.name : null
    setMissionCompleted(false)
    if (missionStartTs) {
      setMissionPaused(false)
      if (typeof window !== 'undefined') {
        localStorage.setItem(MISSION_STATE_KEY, 'running')
      }
    }
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
        aoi_geojson_path: aoiGeojsonPath,
        aoi_geojson_file_id: aoiGeojsonFileId,
        aoi_points: aoiPoints,
        aoi_crs: aoiPayloadCrs,
        mission_start_ts: missionStartIso,
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
      stepTimingRef.current = {}
      setElapsed(0)

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

        setSteps((prev) => {
          const now = Date.now()
          return prev.map((s, i) => {
            if (i !== stepIndex) return s
            stepTimingRef.current[s.id] = { start: now, elapsed: 0 }
            return { ...s, status: 'running' as const, elapsed: 0 }
          })
        })
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
          aoi_geojson_path: aoiGeojsonPath,
          aoi_geojson_file_id: aoiGeojsonFileId,
          aoi_points: aoiPoints,
          aoi_crs: aoiPayloadCrs,
          mission_start_ts: missionStartIso,
        }),
      })
      const data = await response.json()
      console.log('??? API response:', data)
      if (data?.aoi_mode !== undefined) {
        console.log('[AOI] mode:', data.aoi_mode, 'aoi_crs:', data.aoi_crs, 'image_crs:', data.image_crs)
      }
      if (data?.total_elapsed_sec !== undefined && data?.total_elapsed_sec !== null) {
        setTotalElapsedSec(data.total_elapsed_sec)
      }

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
  }, [appendLog, buildSteps, fileMode, isRunning, options.changeEnabled, options.coneEnabled, options.geoEnabled, options.geojsonEnabled, options.pdfEnabled, options.personEnabled, options.statsEnabled, options.vehicleEnabled, pollStatus, uploadedFiles, aoiPoints, aoiCrs, missionStartTs])

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
    stepTimingRef.current = {}
    logRef.current = []
    lastLogKeyRef.current = ''
  }, [buildSteps])

  React.useEffect(() => {
    const nextSteps = buildSteps()
    stepsRef.current = nextSteps
    setSteps(nextSteps)
    stepTimingRef.current = {}
  }, [buildSteps])

  React.useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  return {
    isRunning,
    progress,
    elapsed,
    missionElapsedSec,
    missionStartTs,
    missionPaused,
    missionCompleted,
    hasAoi: Boolean((aoiPoints && aoiPoints.length) || (fileMode === 'local' && uploadedFiles.aoi?.uploaded) || (fileMode === 'upload' && uploadedFiles.aoi?.uploaded)),
    steps,
    currentStep,
    run,
    reset,
    startMission,
    pauseMission,
    resumeMission,
    resetMission,
    downloadLog,
  }
}
