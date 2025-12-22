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

function HoverCard({ object, position }: HoverCardProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute z-[900] min-w-[220px] max-w-[280px] rounded-[var(--uav-radius-sm)] border border-white/10 p-2.5 text-[12.5px] shadow-[0_18px_40px_rgba(0,0,0,0.45)]',
        'bg-[rgba(10,16,28,0.94)]'
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="mb-1.5 font-semibold text-white/92">{object.cls}</div>
      <HoverRow label="ID" value={String(object.id)} />
      <HoverRow label="Score" value={fmt(object.score, 3)} />
      <HoverRow label="Area" value={`${fmt(object.area_m2, 3)} m²`} />
      <HoverRow
        label="Elev / Height"
        value={`${fmt(object.elev_z, 2)} m / ${fmt(object.height_m, 2)} m`}
      />
    </div>
  )
}

interface HoverRowProps {
  label: string
  value: string
}

function HoverRow({ label, value }: HoverRowProps) {
  return (
    <div className="flex justify-between gap-2.5 py-0.5">
      <span className="text-white/55">{label}</span>
      <span className="text-white/88">{value}</span>
    </div>
  )
}

export { HoverCard }
