import * as React from 'react'

import { cn } from '@/lib/utils'

interface SummaryTileProps {
  label: string
  value: string | number
  subtitle?: string
  className?: string
}

function SummaryTile({ label, value, subtitle, className }: SummaryTileProps) {
  return (
    <div
      className={cn(
        'min-h-[60px] rounded-2xl border border-white/8 bg-black/18 px-3 py-2.5',
        className
      )}
    >
      <div className="mb-1.5 text-[12.5px] text-[var(--uav-muted)]">{label}</div>
      <div className="text-lg">{value}</div>
      {subtitle && (
        <div className="mt-1 text-xs text-[var(--uav-muted2)]">{subtitle}</div>
      )}
    </div>
  )
}

export { SummaryTile }
