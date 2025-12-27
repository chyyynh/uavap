'use client'

import * as React from 'react'
import { Progress as ProgressPrimitive } from '@base-ui/react/progress'

import { cn } from '@/lib/utils'

interface ProgressProps extends Omit<ProgressPrimitive.Root.Props, 'className'> {
  className?: string
  indicatorClassName?: string
}

function Progress({
  className,
  indicatorClassName,
  value = 0,
  ...props
}: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-[var(--uav-radius-xs)] bg-white/6',
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Track className="h-full w-full">
        <ProgressPrimitive.Indicator
          className={cn(
            'h-full bg-[var(--uav-teal)] transition-all duration-300 ease-out',
            indicatorClassName
          )}
          style={{ width: `${value}%` }}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
