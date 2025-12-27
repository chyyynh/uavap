'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { PlayIcon, Analytics01Icon } from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import { DashboardCard } from './DashboardCard'
import { useTerrainStats, useTerrainStatus, useRunTerrain } from '@/api/queries'

const SLOPE_CONFIG = [
  { key: 'flat', label: 'Flat', range: '0-5°', color: '#4caf50' },
  { key: 'gentle', label: 'Gentle', range: '5-15°', color: '#8bc34a' },
  { key: 'moderate', label: 'Mod', range: '15-30°', color: '#ffc107' },
  { key: 'steep', label: 'Steep', range: '30°+', color: '#e53935' },
] as const

const ASPECT_CONFIG = [
  { key: 'N', label: 'N', color: '#60a5fa' },
  { key: 'NE', label: 'NE', color: '#818cf8' },
  { key: 'E', label: 'E', color: '#a78bfa' },
  { key: 'SE', label: 'SE', color: '#c084fc' },
  { key: 'S', label: 'S', color: '#e879f9' },
  { key: 'SW', label: 'SW', color: '#f472b6' },
  { key: 'W', label: 'W', color: '#fb7185' },
  { key: 'NW', label: 'NW', color: '#38bdf8' },
] as const

function TerrainStatsCard() {
  const { data: status } = useTerrainStatus()
  const { data: stats, refetch } = useTerrainStats()
  const { mutate: runTerrain, isPending } = useRunTerrain()

  const slopeData = React.useMemo(() => {
    if (!stats?.slope?.distribution) return []
    return SLOPE_CONFIG.map((config) => ({
      ...config,
      value: stats.slope.distribution[config.key]?.percentage || 0,
    }))
  }, [stats])

  const aspectData = React.useMemo(() => {
    if (!stats?.aspect?.distribution) return []
    return ASPECT_CONFIG.map((config) => ({
      ...config,
      value: stats.aspect.distribution[config.key]?.percentage || 0,
    }))
  }, [stats])

  const handleRunAnalysis = () => {
    runTerrain(undefined, { onSuccess: () => refetch() })
  }

  const fmt = (v: number | undefined) => (v === undefined ? '—' : v.toFixed(1))

  return (
    <DashboardCard title="Terrain" helpText="Terrain elevation and slope analysis">
      {status?.computed && stats ? (
        <div className="space-y-3">
          {/* Elevation Stats - Compact Grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'MIN ELEV', value: stats.elevation?.min },
              { label: 'MAX ELEV', value: stats.elevation?.max, accent: true },
              { label: 'MEAN', value: stats.elevation?.mean },
              { label: 'STD DEV', value: stats.elevation?.std },
            ].map((item) => (
              <div key={item.label} className="flex flex-col">
                <span className="text-[7px] font-medium tracking-[0.1em] text-white/30">
                  {item.label}
                </span>
                <div className="flex items-baseline gap-1">
                  <span
                    className={cn(
                      'font-mono text-base font-medium',
                      item.accent ? 'text-[var(--uav-red)]' : 'text-white/90'
                    )}
                    style={item.accent ? { textShadow: '0 0 8px var(--uav-red-glow)' } : undefined}
                  >
                    {fmt(item.value)}
                  </span>
                  <span className="text-[8px] text-white/30">m</span>
                </div>
              </div>
            ))}
          </div>

          {/* Slope Distribution */}
          {slopeData.length > 0 && (
            <div>
              <div className="mb-2 text-[7px] font-medium tracking-[0.1em] text-white/30">
                SLOPE DISTRIBUTION
              </div>
              <div className="space-y-1.5">
                {slopeData.map((item) => (
                  <div key={item.key} className="flex items-center gap-2">
                    <span
                      className="w-10 text-[8px] font-medium"
                      style={{ color: item.color }}
                    >
                      {item.label.toUpperCase()}
                    </span>
                    <div className="relative h-1 flex-1 overflow-hidden bg-white/[0.03]">
                      <div
                        className="absolute inset-y-0 left-0"
                        style={{
                          width: `${Math.min(item.value, 100)}%`,
                          backgroundColor: item.color,
                          boxShadow: `0 0 4px ${item.color}60`,
                        }}
                      />
                    </div>
                    <span
                      className="w-7 text-right font-mono text-[8px]"
                      style={{ color: item.color }}
                    >
                      {item.value.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aspect Distribution */}
          {aspectData.length > 0 && (
            <div>
              <div className="mb-2 text-[7px] font-medium tracking-[0.1em] text-white/30">
                ASPECT DISTRIBUTION
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {aspectData.map((item) => (
                  <div
                    key={item.key}
                    className="flex flex-col items-center rounded-sm bg-white/[0.02] py-1.5"
                  >
                    <span
                      className="text-[9px] font-semibold"
                      style={{
                        color: item.color,
                        textShadow: `0 0 6px ${item.color}50`,
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      className="font-mono text-[10px] font-medium"
                      style={{ color: item.color }}
                    >
                      {item.value.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center py-3">
          <p className="mb-3 text-[10px] tracking-wider text-[var(--uav-text-tertiary)]">
            {!status?.dsm_loaded
              ? 'DSM FILE REQUIRED'
              : status?.computed
                ? 'NO DATA'
                : 'ANALYSIS REQUIRED'}
          </p>
          {status?.dsm_loaded && !status?.computed && (
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

export { TerrainStatsCard }
