'use client'

import * as React from 'react'
import type { ProcessingStep } from '@/types/detection'
import { INITIAL_PROCESSING_STEPS } from '@/api/mock-data'

interface UseProcessingReturn {
  isRunning: boolean
  progress: number
  elapsed: number
  steps: ProcessingStep[]
  run: () => void
  reset: () => void
}

const STEP_DURATIONS = [0.7, 0.4, 0.5, 0.6, 0.5]

export function useProcessing(): UseProcessingReturn {
  const [isRunning, setIsRunning] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [elapsed, setElapsed] = React.useState(0)
  const [steps, setSteps] = React.useState<ProcessingStep[]>(
    INITIAL_PROCESSING_STEPS
  )

  const run = React.useCallback(() => {
    if (isRunning) return

    setIsRunning(true)
    setProgress(0)
    setElapsed(0)
    setSteps(
      INITIAL_PROCESSING_STEPS.map((s) => ({ ...s, status: 'pending' as const }))
    )

    const startTime = performance.now()
    let currentStep = 0

    const runStep = (stepIndex: number) => {
      if (stepIndex >= STEP_DURATIONS.length) {
        setIsRunning(false)
        return
      }

      setSteps((prev) =>
        prev.map((s, i) =>
          i === stepIndex ? { ...s, status: 'running' as const } : s
        )
      )

      setTimeout(() => {
        const stepElapsed = STEP_DURATIONS[stepIndex]

        setSteps((prev) =>
          prev.map((s, i) =>
            i === stepIndex
              ? { ...s, status: 'done' as const, elapsed: stepElapsed }
              : s
          )
        )

        const totalDone = stepIndex + 1
        setProgress(Math.round((totalDone / STEP_DURATIONS.length) * 100))
        setElapsed((performance.now() - startTime) / 1000)

        runStep(stepIndex + 1)
      }, STEP_DURATIONS[stepIndex] * 1000)
    }

    runStep(0)
  }, [isRunning])

  const reset = React.useCallback(() => {
    setIsRunning(false)
    setProgress(0)
    setElapsed(0)
    setSteps(INITIAL_PROCESSING_STEPS)
  }, [])

  return { isRunning, progress, elapsed, steps, run, reset }
}
