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
  currentStep?: string
  isRunning?: boolean
}

function ProcessingSection({
  steps,
  progress,
  elapsed,
  currentStep,
  isRunning,
}: ProcessingSectionProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="mt-3 border-t border-[var(--uav-stroke)] pt-3">
      {/* Progress Bar - Always visible */}
      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[var(--uav-text-secondary)]">
              Progress: <span className="text-[var(--uav-text)]">{progress}%</span>
            </span>
            {isRunning && currentStep && (
              <span className="animate-pulse rounded-[var(--uav-radius-xs)] bg-[var(--uav-teal)]/15 px-2 py-0.5 text-xs text-[var(--uav-teal)]">
                {currentStep}
              </span>
            )}
          </div>
          <span className="text-[var(--uav-text-secondary)]">
            Elapsed: <span className="text-[var(--uav-text)]">{elapsed.toFixed(1)}s</span>
          </span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Steps Table - Collapsible */}
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
          <div className="overflow-hidden rounded-[var(--uav-radius-sm)] border border-[var(--uav-stroke)] bg-[var(--uav-panel-elevated)]">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--uav-stroke)]">
                  <th className="w-8 px-2.5 py-2 text-left font-medium text-[var(--uav-text-tertiary)]">
                    #
                  </th>
                  <th className="px-2.5 py-2 text-left font-medium text-[var(--uav-text-tertiary)]">
                    Step
                  </th>
                  <th className="w-24 px-2.5 py-2 text-left font-medium text-[var(--uav-text-tertiary)]">
                    Status
                  </th>
                  <th className="w-20 px-2.5 py-2 text-left font-medium text-[var(--uav-text-tertiary)]">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step) => (
                  <tr
                    key={step.id}
                    className="border-b border-[var(--uav-stroke)] last:border-b-0"
                  >
                    <td className="px-2.5 py-2 text-[var(--uav-text-secondary)]">{step.id}</td>
                    <td className="px-2.5 py-2 text-[var(--uav-text)]">{step.name}</td>
                    <td className="px-2.5 py-2">
                      <StatusBadge status={step.status} />
                    </td>
                    <td className="px-2.5 py-2 text-[var(--uav-text-secondary)]">
                      {step.elapsed != null ? `${step.elapsed.toFixed(2)}s` : '—'}
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
    pending: 'text-[var(--uav-text-tertiary)]',
    running: 'text-[var(--uav-teal)]',
    done: 'text-[var(--uav-success)]',
    error: 'text-[var(--uav-error)]',
  }

  return (
    <span className={cn('capitalize', styles[status])}>
      {status}
    </span>
  )
}

export { ProcessingSection }
