import * as React from 'react'

import { cn } from '@/lib/utils'
import type { DetectionObject } from '@/types/detection'

interface HoverCardProps {
  object: DetectionObject
  position: { x: number; y: number }
}

function fmt(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined) return '—'
  return v.toFixed(decimals)
}

const classColors: Record<string, string> = {
  person: 'text-blue-400',
  vehicle: 'text-green-400',
  cone: 'text-orange-400',
}

function HoverCard({ object, position }: HoverCardProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute z-[900] min-w-48 rounded-[var(--uav-radius-sm)]',
        'border border-[var(--uav-stroke)] bg-[var(--uav-panel)] p-2.5 text-xs',
        'shadow-[var(--uav-shadow-md)]'
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className={cn('mb-2 font-semibold capitalize', classColors[object.cls] || 'text-[var(--uav-text)]')}>
        {object.cls}
      </div>
      <div className="space-y-1">
        <HoverRow label="ID" value={String(object.id)} />
        <HoverRow label="Score" value={fmt(object.score, 3)} />
        <HoverRow label="Area" value={`${fmt(object.area_m2, 2)} m²`} />
        <HoverRow label="Elevation" value={`${fmt(object.elev_z, 2)} m`} />
        <HoverRow label="Height" value={`${fmt(object.height_m, 2)} m`} />
      </div>
    </div>
  )
}

interface HoverRowProps {
  label: string
  value: string
}

function HoverRow({ label, value }: HoverRowProps) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[var(--uav-text-tertiary)]">{label}</span>
      <span className="text-[var(--uav-text)]">{value}</span>
    </div>
  )
}

export { HoverCard }
