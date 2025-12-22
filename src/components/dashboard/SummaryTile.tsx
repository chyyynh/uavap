import * as React from 'react'

import { cn } from '@/lib/utils'

type TileColor = 'blue' | 'green' | 'orange' | 'teal' | 'default'

interface SummaryTileProps {
  label: string
  value: string | number
  color?: TileColor
  className?: string
}

const colorStyles: Record<TileColor, string> = {
  blue: 'border-blue-500/20 bg-blue-500/8',
  green: 'border-green-500/20 bg-green-500/8',
  orange: 'border-orange-500/20 bg-orange-500/8',
  teal: 'border-[var(--uav-teal)]/20 bg-[var(--uav-teal)]/8',
  default: 'border-[var(--uav-stroke)] bg-[var(--uav-panel-elevated)]',
}

const valueStyles: Record<TileColor, string> = {
  blue: 'text-blue-400',
  green: 'text-green-400',
  orange: 'text-orange-400',
  teal: 'text-[var(--uav-teal)]',
  default: 'text-[var(--uav-text)]',
}

function SummaryTile({ label, value, color = 'default', className }: SummaryTileProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--uav-radius-sm)] border px-3 py-2.5',
        colorStyles[color],
        className
      )}
    >
      <div className="text-xs text-[var(--uav-text-secondary)]">{label}</div>
      <div className={cn('mt-1 text-xl font-semibold', valueStyles[color])}>
        {value}
      </div>
    </div>
  )
}

export { SummaryTile }
