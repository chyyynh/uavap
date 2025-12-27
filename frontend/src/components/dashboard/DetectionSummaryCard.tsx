'use client'

import * as React from 'react'

import type { DetectionObject } from '@/types/detection'

interface DetectionSummaryCardProps {
  objects: DetectionObject[]
}

const STAT_CONFIG = [
  { key: 'person', label: 'PERSONS', color: '#3b82f6' },
  { key: 'vehicle', label: 'VEHICLES', color: '#f97316' },
  { key: 'cone', label: 'CONES', color: '#eab308' },
] as const

function DetectionSummaryCard({ objects }: DetectionSummaryCardProps) {
  const counts = React.useMemo(() => ({
    person: objects.filter((o) => o.cls === 'person').length,
    vehicle: objects.filter((o) => o.cls === 'vehicle').length,
    cone: objects.filter((o) => o.cls === 'cone').length,
    total: objects.length,
  }), [objects])

  return (
    <div className="border border-white/[0.08] bg-black/90 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.5)] p-3">
      {/* Total count - prominent display */}
      <div className="mb-3 flex items-baseline justify-between border-b border-white/[0.06] pb-2.5">
        <div>
          <span className="text-[7px] font-medium tracking-[0.15em] text-white/30">
            DETECTIONS
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-[var(--uav-red)]">
              {counts.total}
            </span>
            <span className="text-[9px] text-white/30">
              objects
            </span>
          </div>
        </div>
      </div>

      {/* Individual counts */}
      <div className="grid grid-cols-3 gap-3">
        {STAT_CONFIG.map((stat) => {
          const count = counts[stat.key]
          return (
            <div key={stat.key} className="flex flex-col">
              <span className="text-[7px] font-medium tracking-[0.1em] text-white/30">
                {stat.label}
              </span>
              <div className="flex items-baseline gap-1">
                <span
                  className="font-mono text-lg font-medium"
                  style={{
                    color: stat.color,
                    textShadow: count > 0 ? `0 0 8px ${stat.color}40` : undefined
                  }}
                >
                  {count}
                </span>
                {counts.total > 0 && (
                  <span className="text-[8px] text-white/25">
                    {Math.round((count / counts.total) * 100)}%
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { DetectionSummaryCard }
