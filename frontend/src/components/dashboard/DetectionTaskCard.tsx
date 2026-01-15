'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import { DashboardCard } from './DashboardCard'
import { TaskSelectionSection } from './TaskSelectionSection'
import { ProcessingSection } from './ProcessingSection'
import type { ProcessingStep } from '@/types/detection'

interface DetectionTaskCardProps {
  onRun: () => void
  isRunning: boolean
  steps: ProcessingStep[]
  progress: number
  elapsed: number
  missionElapsedSec: number
  missionStartTs: number | null
  missionPaused: boolean
  missionCompleted: boolean
  hasAoi: boolean
  onStartMission: () => void
  onPauseMission: () => void
  onResumeMission: () => void
  onResetMission: () => void
  currentStep?: string
}

function DetectionTaskCard({
  onRun,
  isRunning,
  steps,
  progress,
  elapsed,
  missionElapsedSec,
  missionStartTs,
  missionPaused,
  missionCompleted,
  hasAoi,
  onStartMission,
  onPauseMission,
  onResumeMission,
  onResetMission,
  currentStep,
}: DetectionTaskCardProps) {
  return (
    <DashboardCard
        title="Detection Task"
        helpText="選擇偵測類別與輸入資料來源"
      >
        <TaskSelectionSection />

        <ProcessingSection
          steps={steps}
          progress={progress}
          elapsed={elapsed}
          missionElapsedSec={missionElapsedSec}
          missionStartTs={missionStartTs}
          missionPaused={missionPaused}
          missionCompleted={missionCompleted}
          onStartMission={onStartMission}
          onPauseMission={onPauseMission}
          onResumeMission={onResumeMission}
          onResetMission={onResetMission}
          currentStep={currentStep}
          isRunning={isRunning}
        />

        <Button
          onClick={onRun}
          disabled={isRunning}
          className="mt-3 w-full rounded-[var(--uav-radius-sm)] bg-[var(--uav-accent)] py-2.5 text-sm font-semibold text-[#151515] hover:bg-[var(--uav-accent)]/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRunning ? 'Processing...' : 'Start Analysis'}
        </Button>
        <div className="mt-1 text-center text-[11px] text-[var(--uav-text-tertiary)]">
          {hasAoi
            ? 'Runs processing within AOI and generates results.'
            : 'Runs processing on the full scene and generates results.'}
        </div>
    </DashboardCard>
  )
}

export { DetectionTaskCard }
