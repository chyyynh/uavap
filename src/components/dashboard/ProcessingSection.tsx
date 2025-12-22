'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, InformationCircleIcon } from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import { IconButton } from '@/components/ui/icon-button'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import type { ProcessingStep } from '@/types/detection'

interface ProcessingSectionProps {
  steps: ProcessingStep[]
  progress: number
  elapsed: number
}

function ProcessingSection({
  steps,
  progress,
  elapsed,
}: ProcessingSectionProps) {
  const [open, setOpen] = React.useState(true)

  return (
    <div className="mt-2.5 border-t border-white/6 pt-3">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full cursor-pointer select-none items-center justify-between gap-2.5 rounded-[var(--uav-radius-sm)] border border-white/6 bg-black/12 px-2.5 py-2">
          <div className="flex items-center gap-2.5">
            <span className="text-base text-white/88">Processing</span>
            <Tooltip>
              <TooltipTrigger
                render={
                  <IconButton
                    variant="help"
                    size="sm"
                    aria-label="Help"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <HugeiconsIcon
                      icon={InformationCircleIcon}
                      strokeWidth={2}
                      className="text-white/88"
                    />
                  </IconButton>
                }
              />
              <TooltipContent>
                顯示目前步驟、進度與耗時（示意）。可串接後端 log / websocket。
              </TooltipContent>
            </Tooltip>
          </div>
          <IconButton variant="default" size="sm" aria-label="Toggle">
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              strokeWidth={2}
              className={cn(
                'text-white/88 transition-transform',
                !open && '-rotate-90'
              )}
            />
          </IconButton>
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-2.5">
          <p className="mb-2.5 text-[13px] text-[var(--uav-muted)]">
            Progress: <span className="text-[var(--uav-text)]">{progress}%</span>{' '}
            • Elapsed:{' '}
            <span className="text-[var(--uav-text)]">{elapsed.toFixed(1)}s</span>
          </p>

          <div className="overflow-hidden rounded-[var(--uav-radius-sm)] border border-white/8 bg-black/18">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-white/6 bg-white/4">
                  <th className="w-9 px-2.5 py-2 text-left font-normal text-[var(--uav-muted)]">
                    #
                  </th>
                  <th className="px-2.5 py-2 text-left font-normal text-[var(--uav-muted)]">
                    Step
                  </th>
                  <th className="w-[120px] px-2.5 py-2 text-left font-normal text-[var(--uav-muted)]">
                    Status
                  </th>
                  <th className="w-[90px] px-2.5 py-2 text-left font-normal text-[var(--uav-muted)]">
                    Elapsed
                  </th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step) => (
                  <tr
                    key={step.id}
                    className="border-b border-white/6 last:border-b-0"
                  >
                    <td className="px-2.5 py-2">{step.id}</td>
                    <td className="px-2.5 py-2">{step.name}</td>
                    <td className="px-2.5 py-2">
                      <span
                        className={cn(
                          step.status === 'running' && 'text-[var(--uav-teal)]',
                          step.status === 'done' && 'text-green-400',
                          step.status === 'error' && 'text-red-400'
                        )}
                      >
                        {step.status.charAt(0).toUpperCase() +
                          step.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-2.5 py-2">
                      {step.elapsed != null
                        ? `${step.elapsed.toFixed(2)}s`
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

export { ProcessingSection }
