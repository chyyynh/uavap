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
  className?: string
}

function DashboardCard({
  children,
  title,
  helpText,
  className,
}: DashboardCardProps) {
  return (
    <section
      className={cn(
        'overflow-visible rounded-[var(--uav-radius)] border border-[var(--uav-stroke)] p-4 shadow-[var(--uav-shadow)]',
        'bg-gradient-to-b from-[rgba(16,28,51,0.92)] to-[rgba(16,28,51,0.78)]',
        className
      )}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2.5">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-[0.2px]">
          {title}
          {helpText && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <IconButton variant="help" size="default" aria-label="Help">
                    <HugeiconsIcon
                      icon={InformationCircleIcon}
                      strokeWidth={2}
                      className="text-white/88"
                    />
                  </IconButton>
                }
              />
              <TooltipContent>{helpText}</TooltipContent>
            </Tooltip>
          )}
        </h2>
      </div>
      {children}
    </section>
  )
}

export { DashboardCard }
