'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { AirplaneModeIcon } from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjects } from '@/api/queries'

interface DashboardLayoutProps {
  children: React.ReactNode
  /** Bottom-left panel (Detection controls) */
  bottomLeftPanel?: React.ReactNode
  /** Right panel (All stats and results) */
  rightPanel?: React.ReactNode
  className?: string
  selectedProjectId?: string
  onProjectChange?: (projectId: string) => void
  isMockMode?: boolean
}

function DashboardLayout({
  children,
  bottomLeftPanel,
  rightPanel,
  className,
  selectedProjectId,
  onProjectChange,
  isMockMode,
}: DashboardLayoutProps) {
  const { data: projects = [] } = useProjects()

  return (
    <div
      className={cn(
        'uav-dashboard relative h-screen overflow-hidden',
        'bg-[var(--uav-bg)]',
        className
      )}
    >
      {/* Map viewport - full screen background */}
      <div className="absolute inset-0 z-0">
        {children}
      </div>

      {/* Top center - Brand & Project */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex justify-center p-3">
        <div
          className={cn(
            'pointer-events-auto',
            'border border-white/[0.08] bg-black/90 backdrop-blur-md',
            'shadow-[0_4px_24px_rgba(0,0,0,0.5)]'
          )}
        >
          <div className="flex items-center">
            {/* Brand Section */}
            <div className="flex items-center gap-2.5 border-r border-white/[0.06] px-3 py-2">
              <div className="relative">
                <HugeiconsIcon
                  icon={AirplaneModeIcon}
                  className="size-4 text-white/50"
                  strokeWidth={1.5}
                />
                <div className="absolute inset-0 blur-sm">
                  <HugeiconsIcon
                    icon={AirplaneModeIcon}
                    className="size-4 text-white/20"
                    strokeWidth={1.5}
                  />
                </div>
              </div>
              <span className="text-[9px] font-semibold tracking-[0.2em] text-white/60">
                UAV AIP
              </span>
            </div>

            {/* Project Selector */}
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="text-[7px] font-medium tracking-[0.15em] text-white/30">
                PROJECT
              </span>
              <Select
                key={selectedProjectId}
                value={selectedProjectId}
                onValueChange={(val) => {
                  if (val) onProjectChange?.(val)
                }}
              >
                <SelectTrigger className="h-auto gap-1.5 border-0 bg-transparent p-0 text-[11px] font-medium text-white/90 hover:text-white [&>svg]:size-2.5 [&>svg]:text-white/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/[0.08] bg-black/95 backdrop-blur-md">
                  {projects.map((project) => (
                    <SelectItem
                      key={project.id}
                      value={project.id}
                      className="text-[11px] text-white/80"
                    >
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Simulation Mode Indicator */}
            {isMockMode && (
              <div className="flex items-center gap-2 border-l border-white/[0.06] px-3 py-2">
                <span
                  className="size-1.5 rounded-full bg-[var(--uav-warning)]"
                  style={{ boxShadow: '0 0 6px var(--uav-warning), 0 0 10px var(--uav-warning)' }}
                />
                <span className="text-[8px] font-medium tracking-[0.1em] text-[var(--uav-warning)]">
                  SIMULATION
                </span>
              </div>
            )}
          </div>

          {/* Bottom accent line */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      </div>

      {/* Bottom-left panel (Detection Task) */}
      {bottomLeftPanel && (
        <div
          className="pointer-events-auto absolute bottom-3 left-3 z-20 w-72 noir-fade-in"
          style={{ animationDelay: '0.1s', opacity: 0 }}
        >
          {bottomLeftPanel}
        </div>
      )}

      {/* Right panel (All stats and results) - Full height */}
      {rightPanel && (
        <div
          className="pointer-events-auto absolute bottom-3 right-3 top-3 z-20 w-72 noir-fade-in"
          style={{ animationDelay: '0.1s', opacity: 0 }}
        >
          {rightPanel}
        </div>
      )}

      {/* Vignette overlay */}
      <div className="noir-vignette" />

      {/* Film grain overlay */}
      <div className="noir-grain" />
    </div>
  )
}

export { DashboardLayout }
