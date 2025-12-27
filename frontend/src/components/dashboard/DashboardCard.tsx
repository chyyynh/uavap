'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { InformationCircleIcon } from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import { IconButton } from '@/components/ui/icon-button'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

interface DashboardCardProps {
  children: React.ReactNode
  title: string
  helpText?: string
  action?: React.ReactNode
  className?: string
}

function DashboardCard({
  children,
  title,
  helpText,
  action,
  className,
}: DashboardCardProps) {
  return (
    <section
      className={cn(
        'bg-neutral-800/90 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.5)] p-3',
        className,
      )}
    >
      <div>
        {/* Header */}
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[9px] font-semibold tracking-[0.15em] text-white/50">
              {title.toUpperCase()}
            </h2>
            {helpText && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <IconButton variant="help" size="sm" aria-label="Help">
                      <HugeiconsIcon
                        icon={InformationCircleIcon}
                        strokeWidth={2}
                        className="size-3 text-[var(--uav-text-tertiary)]"
                      />
                    </IconButton>
                  }
                />
                <TooltipContent className="noir-panel border-[var(--uav-stroke)] bg-[var(--uav-panel)] text-xs text-[var(--uav-text)]">
                  {helpText}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {action}
        </div>

        {/* Content */}
        <div>{children}</div>
      </div>
    </section>
  )
}

export { DashboardCard }
