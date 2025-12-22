'use client'

import * as React from 'react'
import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible'

import { cn } from '@/lib/utils'

const Collapsible = CollapsiblePrimitive.Root

function CollapsibleTrigger({
  className,
  ...props
}: CollapsiblePrimitive.Trigger.Props & { className?: string }) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn('flex w-full items-center', className)}
      {...props}
    />
  )
}

function CollapsibleContent({
  className,
  ...props
}: CollapsiblePrimitive.Panel.Props & { className?: string }) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className={cn(
        'overflow-hidden transition-all',
        'data-[ending-style]:h-0 data-[ending-style]:opacity-0',
        'data-[starting-style]:h-0 data-[starting-style]:opacity-0',
        className
      )}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
