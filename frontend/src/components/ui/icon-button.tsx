'use client'

import * as React from 'react'
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const iconButtonVariants = cva(
  'inline-flex items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'border-white/10 bg-white/6 hover:bg-white/10 active:translate-y-px focus-visible:ring-white/20',
        ghost:
          'border-transparent bg-transparent hover:bg-white/10 active:translate-y-px focus-visible:ring-white/20',
        help: 'border-white/14 bg-white/6 hover:bg-white/10 hover:border-[var(--uav-teal)]/22 hover:shadow-[0_0_0_4px_rgba(45,212,191,0.1)] active:translate-y-px focus-visible:ring-[var(--uav-teal)]/30',
      },
      size: {
        sm: 'size-7 [&_svg]:size-3.5',
        default: 'size-[30px] [&_svg]:size-4',
        lg: 'size-9 [&_svg]:size-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

interface IconButtonProps
  extends ButtonPrimitive.Props,
    VariantProps<typeof iconButtonVariants> {
  className?: string
  children?: React.ReactNode
}

function IconButton({
  className,
  variant,
  size,
  ...props
}: IconButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="icon-button"
      className={cn(iconButtonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { IconButton, iconButtonVariants }
