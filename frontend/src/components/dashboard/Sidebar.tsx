'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

interface SidebarProps {
  children: React.ReactNode
  className?: string
}

function Sidebar({ children, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex w-72 shrink-0 flex-col gap-2 overflow-y-auto overflow-x-hidden',
        'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[var(--uav-teal)]/20',
        'hover:scrollbar-thumb-[var(--uav-teal)]/40',
        className
      )}
    >
      {/* Stagger the boot animation for each child */}
      {React.Children.map(children, (child, index) => (
        <div className={cn('hud-boot', `hud-boot-delay-${Math.min(index + 1, 6)}`)}>
          {child}
        </div>
      ))}
    </aside>
  )
}

export { Sidebar }
