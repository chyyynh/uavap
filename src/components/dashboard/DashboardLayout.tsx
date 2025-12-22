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
        'bg-[radial-gradient(1200px_600px_at_30%_-10%,rgba(70,120,255,0.18),transparent_60%),radial-gradient(1000px_700px_at_90%_20%,rgba(45,212,191,0.12),transparent_55%),var(--uav-bg)]',
        'text-[var(--uav-text)]',
        className
      )}
    >
      <Topbar
        selectedProjectId={selectedProjectId}
        onProjectChange={onProjectChange}
      />
      <main className="grid h-[calc(100vh-74px)] gap-4 p-4 md:grid-cols-[360px_1fr]">
        <Sidebar>{sidebar}</Sidebar>
        <section className="relative overflow-hidden rounded-[var(--uav-radius)] border border-[var(--uav-stroke)] shadow-[var(--uav-shadow)]">
          {children}
        </section>
      </main>
    </div>
  )
}

export { DashboardLayout }
