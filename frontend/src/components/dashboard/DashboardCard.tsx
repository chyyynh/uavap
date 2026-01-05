import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { InformationCircleIcon, ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons'

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
  const [isCollapsed, setIsCollapsed] = React.useState(false)

  const toggleCollapsed = React.useCallback(() => {
    setIsCollapsed((prev) => !prev)
  }, [])

  return (
    <section
      className={cn(
        'rounded-[var(--uav-radius)] border border-[var(--uav-stroke)] bg-[var(--uav-panel)] p-4',
        className
      )}
    >
      <div className={cn('flex items-center justify-between', !isCollapsed && 'mb-3')}>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-[var(--uav-text)]">
            {title}
          </h2>
          {helpText && !isCollapsed && (
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
        <div className="flex items-center gap-2">
          {!isCollapsed && action}
          <IconButton
            variant="ghost"
            size="sm"
            onClick={toggleCollapsed}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
          >
            <HugeiconsIcon
              icon={isCollapsed ? ArrowDown01Icon : ArrowUp01Icon}
              strokeWidth={2}
              className="size-3.5"
            />
          </IconButton>
        </div>
      </div>
      {!isCollapsed && children}
    </section>
  )
}

export { DashboardCard }
