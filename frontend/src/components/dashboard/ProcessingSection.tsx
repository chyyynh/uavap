'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, CheckmarkCircle02Icon, Loading03Icon } from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
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
    <div className="space-y-3">
      {/* Progress Bar */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isRunning && currentStep && (
              <span className="flex items-center gap-1.5 text-xs text-[var(--uav-teal)]">
                <HugeiconsIcon
                  icon={Loading03Icon}
                  strokeWidth={2}
                  className="size-3 animate-spin"
                />
                {currentStep}
              </span>
            )}
            {!isRunning && progress === 100 && (
              <span className="flex items-center gap-1.5 text-xs text-[var(--uav-success)]">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  strokeWidth={2}
                  className="size-3"
                />
                Complete
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[var(--uav-text-tertiary)]">
            <span>
              <span className="tabular-nums text-[var(--uav-text)]">{progress}</span>%
            </span>
            <span>
              <span className="tabular-nums text-[var(--uav-text)]">{elapsed.toFixed(1)}</span>s
            </span>
          </div>
        </div>

        {/* Custom Progress Bar */}
        <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-all duration-300',
              progress === 100
                ? 'bg-[var(--uav-success)]'
                : 'bg-gradient-to-r from-[var(--uav-teal)] to-[var(--uav-teal)]/60'
            )}
            style={{ width: `${progress}%` }}
          />
          {isRunning && progress < 100 && (
            <div
              className="absolute inset-y-0 animate-pulse rounded-full bg-white/20"
              style={{ left: `${Math.max(0, progress - 10)}%`, width: '10%' }}
            />
          )}
        </div>
      </div>

      {/* Steps - Collapsible */}
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-lg bg-white/[0.02] px-3 py-2 transition-colors hover:bg-white/[0.04]">
          <span className="text-xs text-[var(--uav-text-secondary)]">
            處理步驟
          </span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className={cn(
              'size-3.5 text-[var(--uav-text-tertiary)] transition-transform duration-200',
              !open && '-rotate-90'
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-2">
          <div className="space-y-0.5">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-1.5 transition-colors',
                  step.status === 'running' && 'bg-[var(--uav-teal)]/5'
                )}
              >
                {/* Step number */}
                <span className="w-4 text-center text-[10px] tabular-nums text-[var(--uav-text-tertiary)]">
                  {idx + 1}
                </span>

                {/* Step name */}
                <span
                  className={cn(
                    'flex-1 text-xs',
                    step.status === 'done' && 'text-[var(--uav-text-secondary)]',
                    step.status === 'running' && 'text-[var(--uav-teal)]',
                    step.status === 'pending' && 'text-[var(--uav-text-tertiary)]',
                    step.status === 'error' && 'text-[var(--uav-error)]'
                  )}
                >
                  {step.name}
                </span>

                {/* Status indicator */}
                <div className="flex items-center gap-2">
                  {step.elapsed != null && (
                    <span className="text-[10px] tabular-nums text-[var(--uav-text-tertiary)]">
                      {step.elapsed.toFixed(1)}s
                    </span>
                  )}
                  <div
                    className={cn(
                      'size-1.5 rounded-full',
                      step.status === 'done' && 'bg-[var(--uav-success)]',
                      step.status === 'running' && 'animate-pulse bg-[var(--uav-teal)]',
                      step.status === 'pending' && 'bg-[var(--uav-text-tertiary)]/30',
                      step.status === 'error' && 'bg-[var(--uav-error)]'
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export { ProcessingSection }
