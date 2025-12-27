'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { UserIcon, Car01Icon, Cone01Icon, Search01Icon } from '@hugeicons/core-free-icons'

import type { DetectionObject } from '@/types/detection'

interface DetectionSummaryCardProps {
  objects: DetectionObject[]
}

const STAT_CONFIG = [
  { key: 'person', label: 'PERSONS', color: '#3b82f6', icon: UserIcon },
  { key: 'vehicle', label: 'VEHICLES', color: '#22c55e', icon: Car01Icon },
  { key: 'cone', label: 'CONES', color: '#f97316', icon: Cone01Icon },
] as const

function DetectionSummaryCard({ objects }: DetectionSummaryCardProps) {
  const counts = React.useMemo(() => ({
    person: objects.filter((o) => o.cls === 'person').length,
    vehicle: objects.filter((o) => o.cls === 'vehicle').length,
    cone: objects.filter((o) => o.cls === 'cone').length,
    total: objects.length,
  }), [objects])

  return (
    <div className="flex items-center gap-3 border border-white/[0.12] bg-neutral-800/90 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.5)] px-3 py-2">
      {/* Total */}
      <div className="flex items-center gap-2 border-r border-white/[0.08] pr-3">
        <HugeiconsIcon
          icon={Search01Icon}
          className="size-4 text-[var(--uav-red)]"
          strokeWidth={1.5}
        />
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-lg font-semibold text-[var(--uav-red)]">
            {counts.total}
          </span>
          <span className="text-[8px] text-white/30">OBJ</span>
        </div>
      </div>

      {/* Individual counts */}
      <div className="flex flex-1 items-center justify-around">
        {STAT_CONFIG.map((stat) => {
          const count = counts[stat.key]
          const hasItems = count > 0
          return (
            <div key={stat.key} className="flex items-center gap-2">
              <HugeiconsIcon
                icon={stat.icon}
                className="size-6"
                style={{ color: hasItems ? stat.color : 'rgba(255,255,255,0.25)' }}
                strokeWidth={1.5}
              />
              <span
                className="font-mono text-xl font-semibold"
                style={{ color: hasItems ? stat.color : 'rgba(255,255,255,0.3)' }}
              >
                {count}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { DetectionSummaryCard }
