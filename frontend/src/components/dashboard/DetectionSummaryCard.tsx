'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { UserIcon, Car01Icon, ConeIcon, GridIcon } from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import type { DetectionObject } from '@/types/detection'

interface DetectionSummaryCardProps {
  objects: DetectionObject[]
}

const stats = [
  { key: 'person', label: 'Person', icon: UserIcon, color: 'blue' },
  { key: 'vehicle', label: 'Vehicle', icon: Car01Icon, color: 'green' },
  { key: 'cone', label: 'Cone', icon: ConeIcon, color: 'orange' },
] as const

const colorMap = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: 'text-blue-400' },
  green: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: 'text-emerald-400' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: 'text-orange-400' },
  teal: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', icon: 'text-cyan-400' },
}

function DetectionSummaryCard({ objects }: DetectionSummaryCardProps) {
  const counts = {
    person: objects.filter((o) => o.cls === 'person').length,
    vehicle: objects.filter((o) => o.cls === 'vehicle').length,
    cone: objects.filter((o) => o.cls === 'cone').length,
  }
  const total = objects.length

  return (
    <div className="rounded-xl border border-[var(--uav-stroke)] bg-[var(--uav-panel)] p-3">
      {/* 橫向統計列 */}
      <div className="flex items-center gap-1">
        {stats.map(({ key, label, icon, color }) => {
          const c = colorMap[color]
          const count = counts[key]
          return (
            <div
              key={key}
              className={cn(
                'flex flex-1 items-center gap-2 rounded-lg px-3 py-2',
                c.bg
              )}
            >
              <HugeiconsIcon icon={icon} className={cn('size-4', c.icon)} strokeWidth={2} />
              <div className="flex flex-col">
                <span className={cn('text-lg font-semibold leading-none', c.text)}>
                  {count}
                </span>
                <span className="text-[10px] text-[var(--uav-text-tertiary)]">{label}</span>
              </div>
            </div>
          )
        })}

        {/* Total */}
        <div className={cn('flex flex-1 items-center gap-2 rounded-lg px-3 py-2', colorMap.teal.bg)}>
          <HugeiconsIcon icon={GridIcon} className={cn('size-4', colorMap.teal.icon)} strokeWidth={2} />
          <div className="flex flex-col">
            <span className={cn('text-lg font-semibold leading-none', colorMap.teal.text)}>
              {total}
            </span>
            <span className="text-[10px] text-[var(--uav-text-tertiary)]">Total</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export { DetectionSummaryCard }
