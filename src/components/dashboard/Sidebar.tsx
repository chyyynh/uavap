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
        'flex flex-col gap-3.5 overflow-auto pr-1',
        'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10',
        className
      )}
    >
      {children}
    </aside>
  )
}

export { Sidebar }
