'use client'

import * as React from 'react'
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

import { cn } from '@/lib/utils'

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

function TooltipContent({
  className,
  sideOffset = 10,
  ...props
}: TooltipPrimitive.Popup.Props & {
  className?: string
  sideOffset?: number
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner sideOffset={sideOffset}>
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            'z-[9999] max-w-[300px] rounded-[14px] border border-white/12 bg-[rgba(10,16,28,0.96)] px-3 py-2.5 text-[12.5px] leading-relaxed text-white/84 shadow-[0_18px_40px_rgba(0,0,0,0.45)]',
            'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
            'data-[starting-style]:scale-95 data-[ending-style]:scale-95',
            className
          )}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

function TooltipArrow({ className, ...props }: TooltipPrimitive.Arrow.Props & { className?: string }) {
  return (
    <TooltipPrimitive.Arrow
      data-slot="tooltip-arrow"
      className={cn(
        'size-2.5 rotate-45 border-l border-t border-white/12 bg-[rgba(10,16,28,0.96)]',
        className
      )}
      {...props}
    />
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipArrow }
