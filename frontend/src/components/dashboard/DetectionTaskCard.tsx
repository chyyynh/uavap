'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import { DashboardCard } from './DashboardCard'
import { TaskSelectionSection } from './TaskSelectionSection'
import { ProcessingSection } from './ProcessingSection'
import { TaskOptionsProvider } from '@/contexts/TaskOptionsContext'
import type { ProcessingStep } from '@/types/detection'

interface DetectionTaskCardProps {
  onRun: () => void
  isRunning: boolean
  steps: ProcessingStep[]
  progress: number
  elapsed: number
  currentStep?: string
}

function DetectionTaskCard({
  onRun,
  isRunning,
  steps,
  progress,
  elapsed,
  currentStep,
}: DetectionTaskCardProps) {
  return (
    <TaskOptionsProvider>
      <DashboardCard
        title="Detection Task"
        helpText="選擇要偵測的物件類別與輸出項目"
      >
        <TaskSelectionSection />

        <ProcessingSection
          steps={steps}
          progress={progress}
          elapsed={elapsed}
          currentStep={currentStep}
          isRunning={isRunning}
        />

        <Button
          onClick={onRun}
          disabled={isRunning}
          className="mt-3 w-full rounded-[var(--uav-radius-sm)] bg-[var(--uav-accent)] py-2.5 text-sm font-semibold text-[#151515] hover:bg-[var(--uav-accent)]/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRunning ? 'RUNNING' : 'RUN'}
        </Button>
      </DashboardCard>
    </TaskOptionsProvider>
  )
}

export { DetectionTaskCard }
