import * as React from 'react'

import { cn } from '@/lib/utils'
import { Topbar } from './Topbar'
import { Sidebar } from './Sidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
  sidebar: React.ReactNode
  className?: string
  selectedProjectId?: string
  onProjectChange?: (projectId: string) => void
}

function DashboardLayout({
  children,
  sidebar,
  className,
  selectedProjectId,
  onProjectChange,
}: DashboardLayoutProps) {
  return (
    <div
      className={cn(
        'uav-dashboard min-h-screen',
        'bg-[var(--uav-bg)] text-[var(--uav-text)]',
        className
      )}
    >
      <Topbar
        selectedProjectId={selectedProjectId}
        onProjectChange={onProjectChange}
      />
      <main className="grid h-[calc(100vh-56px)] gap-3 p-3 grid-cols-[340px_1fr]">
        <Sidebar>{sidebar}</Sidebar>
        <section className="relative overflow-hidden rounded-[var(--uav-radius-sm)] border border-[var(--uav-stroke)]">
          {children}
        </section>
      </main>
    </div>
  )
}

export { DashboardLayout }
