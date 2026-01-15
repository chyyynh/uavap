'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon } from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import type { ProcessingStep } from '@/types/detection'

interface ProcessingSectionProps {
  steps: ProcessingStep[]
  progress: number
  elapsed: number
  missionElapsedSec: number
  missionStartTs: number | null
  missionPaused: boolean
  missionCompleted: boolean
  onStartMission: () => void
  onPauseMission: () => void
  onResumeMission: () => void
  onResetMission: () => void
  currentStep?: string
  isRunning?: boolean
}

function ProcessingSection({
  steps,
  progress,
  elapsed,
  missionElapsedSec,
  missionStartTs,
  missionPaused,
  missionCompleted,
  onStartMission,
  onPauseMission,
  onResumeMission,
  onResetMission,
  currentStep,
  isRunning,
}: ProcessingSectionProps) {
  const [open, setOpen] = React.useState(false)

  const formatDuration = (value: number | null) => {
    if (value == null || Number.isNaN(value)) return '--:--:--'
    const total = Math.max(0, Math.floor(value))
    const hours = String(Math.floor(total / 3600)).padStart(2, '0')
    const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
    const seconds = String(total % 60).padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  const missionStateLabel = !missionStartTs
    ? 'Not started'
    : missionCompleted
      ? 'Completed'
      : missionPaused
        ? 'Paused'
        : 'Running'
  const missionStateColor = !missionStartTs
    ? 'bg-[var(--uav-text-tertiary)]'
    : missionCompleted
      ? 'bg-[var(--uav-success)]'
      : missionPaused
        ? 'bg-[var(--uav-warning)]'
        : 'bg-[var(--uav-success)]'
  const missionPrimaryLabel = !missionStartTs
    ? 'Start Mission'
    : missionPaused
      ? 'Resume'
      : 'Pause'
  const STEP_COLS = 'grid grid-cols-[28px_1fr_92px_72px] items-center gap-x-3'

  return (
    <div className="mt-3 border-t border-[var(--uav-stroke)] pt-3">
      <div className="mb-3 rounded-[var(--uav-radius-sm)] border border-[var(--uav-stroke)] bg-[var(--uav-panel-elevated)] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-[var(--uav-text-tertiary)]">Mission elapsed</div>
            <div className="mt-1 font-mono text-2xl text-[var(--uav-text)] tabular-nums">
              {missionStartTs ? formatDuration(missionElapsedSec) : '00:00:00'}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-[var(--uav-text-secondary)]">
              <span className={`h-2 w-2 rounded-full ${missionStateColor}`} />
              <span>{missionStateLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!missionStartTs) return onStartMission()
                if (missionPaused) return onResumeMission()
                return onPauseMission()
              }}
              className="rounded-[var(--uav-radius-xs)] border border-transparent bg-[var(--uav-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#151515] hover:bg-[var(--uav-accent)]/90"
            >
              {missionPrimaryLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset mission timer?')) onResetMission()
              }}
              className="rounded-[var(--uav-radius-xs)] border border-[var(--uav-stroke)] px-3 py-1 text-[11px] uppercase tracking-wide text-[var(--uav-text-secondary)] hover:text-[var(--uav-text)]"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-[var(--uav-text-tertiary)]">
          Start time:{' '}
          <span className="text-[var(--uav-text-secondary)]">
            {missionStartTs ? new Date(missionStartTs).toLocaleString() : '--'}
          </span>
        </div>
      </div>

      <div className="mb-3">
        <div className="mb-2 grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-[var(--uav-radius-xs)] border border-[var(--uav-stroke)] bg-[var(--uav-panel)] px-2 py-2">
            <div className="text-[var(--uav-text-tertiary)]">Progress</div>
            <div className="mt-1 text-lg font-semibold text-[var(--uav-text)]">{progress}%</div>
            <div className="text-[var(--uav-text-secondary)]">{progress >= 100 ? 'Complete' : 'In progress'}</div>
          </div>
          <div className="rounded-[var(--uav-radius-xs)] border border-[var(--uav-stroke)] bg-[var(--uav-panel)] px-2 py-2">
            <div className="text-[var(--uav-text-tertiary)]">Analysis time</div>
            <div className="mt-1 text-lg font-semibold text-[var(--uav-text)]">{elapsed ? `${elapsed.toFixed(1)}s` : '—'}</div>
            <div className="text-[var(--uav-text-secondary)]">From Start Analysis</div>
          </div>
        </div>
        {isRunning && currentStep && (
          <div className="mb-1.5 text-xs text-[var(--uav-text-secondary)]">
            Current step: <span className="text-[var(--uav-teal)]">{currentStep}</span>
          </div>
        )}
        <Progress value={progress} />
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-[var(--uav-radius-sm)] border border-[var(--uav-stroke)] bg-[var(--uav-panel-elevated)] px-3 py-2">
          <span className="text-sm font-medium text-[var(--uav-text)]">Steps</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className={cn(
              'size-4 text-[var(--uav-text-secondary)] transition-transform duration-200',
              !open && '-rotate-90'
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-2">
          <div className="rounded-[var(--uav-radius-sm)] border border-[var(--uav-stroke)] bg-[var(--uav-panel-elevated)] text-xs">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col style={{ width: '32px' }} />
                <col />
                <col style={{ width: '80px' }} />
                <col style={{ width: '64px' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--uav-stroke)] text-[var(--uav-text-tertiary)]">
                  <th className="px-2 py-2 text-left font-medium">#</th>
                  <th className="px-2 py-2 text-left font-medium">Step</th>
                  <th className="px-2 py-2 text-left font-medium">Status</th>
                  <th className="px-2 py-2 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step) => (
                  <tr
                    key={step.id}
                    className="border-b border-[var(--uav-stroke)] last:border-b-0"
                  >
                    <td className="px-2 py-2 text-[var(--uav-text-secondary)]">{step.id}</td>
        <td className="px-2 py-2 text-[13px] leading-[1.35] text-[var(--uav-text)] whitespace-normal break-normal [overflow-wrap:normal] [word-break:normal] [hyphens:none]">
          {step.name}
        </td>
                    <td className="px-2 py-2">
                      <StatusBadge status={step.status} />
                    </td>
                    <td className="px-2 py-2 text-right text-[var(--uav-text-secondary)] whitespace-nowrap tabular-nums">
                      {step.status === 'running' && step.elapsed != null
                        ? `${step.elapsed.toFixed(1)}s`
                        : step.status === 'done' && step.elapsed != null
                          ? `${step.elapsed.toFixed(1)}s`
                          : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function StatusBadge({ status }: { status: ProcessingStep['status'] }) {
  const styles = {
    pending: 'border-[var(--uav-stroke)] text-[var(--uav-text-tertiary)]',
    running: 'border-[var(--uav-teal)]/40 text-[var(--uav-teal)]',
    done: 'border-[var(--uav-success)]/40 text-[var(--uav-success)]',
    error: 'border-[var(--uav-error)]/40 text-[var(--uav-error)]',
  }

  return (
    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide', styles[status])}>
      {status}
    </span>
  )
}

export { ProcessingSection }
