import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const chipVariants = cva(
  'inline-flex items-center gap-2 rounded-full px-3 py-2.5 text-[13px] backdrop-blur-[10px]',
  {
    variants: {
      variant: {
        default:
          'border border-[var(--uav-stroke)] bg-[var(--uav-panel)]/75 text-[var(--uav-text)]',
        status:
          'border border-[var(--uav-stroke)] bg-[var(--uav-panel)]/75 text-[var(--uav-text)]',
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
