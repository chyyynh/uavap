import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const chipVariants = cva(
  'inline-flex items-center gap-1.5 rounded-[var(--uav-radius-xs)] px-2.5 py-1.5 text-xs',
  {
    variants: {
      variant: {
        default:
          'border border-[var(--uav-stroke)] bg-[var(--uav-panel)] text-[var(--uav-text)]',
        muted:
          'border border-[var(--uav-stroke)] bg-[var(--uav-panel-elevated)] text-[var(--uav-text-secondary)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface ChipProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof chipVariants> {}

function Chip({ className, variant, ...props }: ChipProps) {
  return (
    <div
      data-slot="chip"
      className={cn(chipVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Chip, chipVariants }
