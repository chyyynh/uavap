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
import { Badge } from '@/components/ui/badge'
import { useProjects, useGpuStatus } from '@/api/queries'

interface TopbarProps {
  className?: string
  onProjectChange?: (projectId: string) => void
  selectedProjectId?: string
}

function Topbar({ className, onProjectChange, selectedProjectId }: TopbarProps) {
  const { data: projects = [] } = useProjects()
  const { data: gpuStatus } = useGpuStatus()

  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex h-[74px] items-center justify-between border-b border-[var(--uav-stroke)] px-4',
        'bg-gradient-to-b from-[rgba(16,28,51,0.92)] to-[rgba(16,28,51,0.65)]',
        'backdrop-blur-[10px]',
        className
      )}
    >
      <div className="flex min-w-[340px] items-center gap-3.5">
        <div className="grid size-11 place-items-center overflow-hidden rounded-[var(--uav-radius-xs)] border border-[var(--uav-stroke)] bg-gradient-to-br from-white/18 to-white/3 shadow-[var(--uav-shadow)]">
          <HugeiconsIcon
            icon={AirplaneModeIcon}
            className="size-6 text-white/90"
            strokeWidth={1.6}
          />
        </div>
        <div className="leading-tight">
          <div className="text-[22px] font-bold tracking-[0.2px]">Dashboard</div>
          <div className="mt-1 text-sm text-[var(--uav-muted)]">
            UAV AIP Dashboard – Automated Inspection
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-2.5 rounded-full border border-[var(--uav-stroke)] bg-black/22 px-3 py-2.5">
          <label className="text-[13px] text-[var(--uav-muted)] whitespace-nowrap">
            Project
          </label>
          <Select
            value={selectedProjectId}
            onValueChange={onProjectChange}
          >
            <SelectTrigger className="min-w-[180px] rounded-full border-[var(--uav-stroke)] bg-white/6 text-sm text-[var(--uav-text)]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {gpuStatus && (
          <Badge
            variant="outline"
            className="gap-2 rounded-full border-[var(--uav-stroke)] bg-white/6 px-3.5 py-2.5 text-[13px] text-[var(--uav-text)]"
          >
            <span
              className={cn(
                'size-2.5 rounded-full shadow-[0_0_0_4px_rgba(34,197,94,0.14)]',
                gpuStatus.status === 'online' && 'bg-green-500',
                gpuStatus.status === 'offline' && 'bg-red-500',
                gpuStatus.status === 'busy' && 'bg-yellow-500'
              )}
            />
            GPU: {gpuStatus.name}
          </Badge>
        )}
      </div>
    </header>
  )
}

export { Topbar }
