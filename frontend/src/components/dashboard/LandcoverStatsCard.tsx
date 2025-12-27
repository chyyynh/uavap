'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { PlayIcon } from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import { DashboardCard } from './DashboardCard'
import { useLandcoverStats, useLandcoverStatus, useRunLandcover } from '@/api/queries'

const LANDCOVER_CONFIG: Record<string, { color: string; label: string }> = {
  grass: { color: '#7cfc00', label: 'Grass' },
  road: { color: '#808080', label: 'Road' },
  'bare-ground': { color: '#deb887', label: 'Bare' },
  building: { color: '#ff8c00', label: 'Building' },
  tree: { color: '#228b22', label: 'Tree' },
  pavement: { color: '#b22222', label: 'Pavement' },
}

function LandcoverStatsCard() {
  const { data: status } = useLandcoverStatus()
  const { data: stats, refetch } = useLandcoverStats()
  const { mutate: runLandcover, isPending } = useRunLandcover()

  const chartData = React.useMemo(() => {
    if (!stats?.stats) return []

    return Object.entries(stats.stats)
      .filter(([_, value]) => value.percentage > 0)
      .map(([name, value]) => ({
        name,
        label: LANDCOVER_CONFIG[name]?.label || name,
        value: value.percentage,
        color: LANDCOVER_CONFIG[name]?.color || '#888888',
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [stats])

  const handleRunAnalysis = () => {
    runLandcover(undefined, { onSuccess: () => refetch() })
  }

  return (
    <DashboardCard title="Landcover" helpText="Land cover classification analysis">
      {status?.computed && chartData.length > 0 ? (
        <div className="space-y-2">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <span
                className="w-16 text-[9px] font-medium tracking-wide"
                style={{ color: item.color }}
              >
                {item.label.toUpperCase()}
              </span>
              <div className="relative h-1.5 flex-1 overflow-hidden bg-white/[0.03]">
                <div
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${Math.min(item.value, 100)}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <span
                className="w-10 text-right font-mono text-[10px]"
                style={{ color: item.color }}
              >
                {item.value.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-3">
          <p className="mb-3 text-[10px] tracking-wider text-[var(--uav-text-tertiary)]">
            {status?.computed ? 'NO DATA' : 'ANALYSIS REQUIRED'}
          </p>
          {!status?.computed && (
            <button
              onClick={handleRunAnalysis}
              disabled={isPending}
              className={cn(
                'flex items-center gap-2 border px-3 py-1.5 text-[9px] font-medium uppercase tracking-wider transition-all',
                isPending
                  ? 'cursor-not-allowed border-[var(--uav-stroke)] text-[var(--uav-text-tertiary)]'
                  : 'border-[var(--uav-stroke)] text-[var(--uav-text-secondary)] hover:border-[var(--uav-red)]/30 hover:text-[var(--uav-red)]'
              )}
            >
              <HugeiconsIcon icon={PlayIcon} strokeWidth={2} className="size-3" />
              {isPending ? 'Running...' : 'Execute'}
            </button>
          )}
        </div>
      )}
    </DashboardCard>
  )
}

export { LandcoverStatsCard }
