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
  taskOptions: {
    objectsEnabled: boolean
    personEnabled: boolean
    vehicleEnabled: boolean
    coneEnabled: boolean
    geoEnabled: boolean
    changeEnabled: boolean
    statsEnabled: boolean
    pdfEnabled: boolean
    gpkgEnabled: boolean
  }
  onTaskOptionChange: (key: string, value: boolean) => void
}

function DetectionTaskCard({
  onRun,
  isRunning,
  steps,
  progress,
  elapsed,
  taskOptions,
  onTaskOptionChange,
}: DetectionTaskCardProps) {
  return (
    <DashboardCard
      title="Detection Task"
      helpText="選擇要偵測的物件類別與輸出項目。說明預設不顯示，按圖示才展開。"
    >
      <TaskSelectionSection
        objectsEnabled={taskOptions.objectsEnabled}
        onObjectsChange={(v) => onTaskOptionChange('objectsEnabled', v)}
        personEnabled={taskOptions.personEnabled}
        onPersonChange={(v) => onTaskOptionChange('personEnabled', v)}
        vehicleEnabled={taskOptions.vehicleEnabled}
        onVehicleChange={(v) => onTaskOptionChange('vehicleEnabled', v)}
        coneEnabled={taskOptions.coneEnabled}
        onConeChange={(v) => onTaskOptionChange('coneEnabled', v)}
        geoEnabled={taskOptions.geoEnabled}
        onGeoChange={(v) => onTaskOptionChange('geoEnabled', v)}
        changeEnabled={taskOptions.changeEnabled}
        onChangeChange={(v) => onTaskOptionChange('changeEnabled', v)}
        statsEnabled={taskOptions.statsEnabled}
        onStatsChange={(v) => onTaskOptionChange('statsEnabled', v)}
        pdfEnabled={taskOptions.pdfEnabled}
        onPdfChange={(v) => onTaskOptionChange('pdfEnabled', v)}
        gpkgEnabled={taskOptions.gpkgEnabled}
        onGpkgChange={(v) => onTaskOptionChange('gpkgEnabled', v)}
      />

      <ProcessingSection steps={steps} progress={progress} elapsed={elapsed} />

      <Button
        onClick={onRun}
        disabled={isRunning}
        className="mt-3 w-full rounded-[var(--uav-radius-sm)] bg-[var(--uav-accent)] px-3.5 py-3 text-sm font-bold tracking-[0.5px] text-[#151515] shadow-[0_10px_22px_rgba(255,159,47,0.2)] hover:bg-[var(--uav-accent)]/90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isRunning ? 'RUNNING' : 'RUN'}
      </Button>
    </DashboardCard>
  )
}

export { DetectionTaskCard }
