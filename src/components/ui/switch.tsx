'use client'

import * as React from 'react'
import { Switch as SwitchPrimitive } from '@base-ui/react/switch'

import { cn } from '@/lib/utils'

interface SwitchProps extends Omit<SwitchPrimitive.Root.Props, 'className'> {
  className?: string
}

function Switch({ className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'relative h-[22px] w-10 shrink-0 cursor-pointer rounded-full border border-white/12 bg-white/6 transition-colors',
        'data-[checked]:border-[var(--uav-teal)]/25 data-[checked]:bg-[var(--uav-teal)]/14',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--uav-teal)]/30',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none absolute left-0.5 top-0.5 size-4 rounded-full bg-white/75 transition-transform',
          'data-[checked]:translate-x-[18px] data-[checked]:bg-[var(--uav-teal)]/85'
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
