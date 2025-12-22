'use client'

import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { cva, type VariantProps } from 'class-variance-authority'
import { HugeiconsIcon } from '@hugeicons/react'
import { Tick02Icon } from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'

const checkboxVariants = cva(
  'peer size-[18px] shrink-0 rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border-input bg-input/20 data-[checked]:bg-primary data-[checked]:border-primary data-[checked]:text-primary-foreground focus-visible:ring-ring',
        teal: 'border-[var(--uav-stroke)] bg-white/5 data-[checked]:bg-[var(--uav-teal)] data-[checked]:border-[var(--uav-teal)] data-[checked]:text-[#151515] focus-visible:ring-[var(--uav-teal)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface CheckboxProps
  extends Omit<CheckboxPrimitive.Root.Props, 'className'>,
    VariantProps<typeof checkboxVariants> {
  className?: string
}

function Checkbox({ className, variant, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(checkboxVariants({ variant, className }))}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={3} className="size-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox, checkboxVariants }
