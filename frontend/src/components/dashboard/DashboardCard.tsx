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
        'rounded-[var(--uav-radius)] border border-[var(--uav-stroke)] bg-[var(--uav-panel)] p-4',
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-[var(--uav-text)]">
            {title}
          </h2>
          {helpText && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <IconButton variant="help" size="sm" aria-label="Help">
                    <HugeiconsIcon
                      icon={InformationCircleIcon}
                      strokeWidth={2}
                      className="size-3.5"
                    />
                  </IconButton>
                }
              />
              <TooltipContent>{helpText}</TooltipContent>
            </Tooltip>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export { DashboardCard }
