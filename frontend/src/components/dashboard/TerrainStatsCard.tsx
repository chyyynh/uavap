'use client'

import * as React from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'

import { cn } from '@/lib/utils'
import { useTerrainStats, useTerrainStatus, useRunTerrain } from '@/api/queries'
import { Button } from '@/components/ui/button'

// Slope category colors
const SLOPE_COLORS: Record<string, string> = {
  flat: '#22c55e',
  gentle: '#84cc16',
  moderate: '#eab308',
  steep: '#ef4444',
}

const SLOPE_LABELS: Record<string, string> = {
  flat: 'Flat (0-5°)',
  gentle: 'Gentle (5-15°)',
  moderate: 'Moderate (15-30°)',
  steep: 'Steep (30°+)',
}

// Aspect direction colors (using HSV-like colors)
const ASPECT_COLORS: Record<string, string> = {
  N: '#3b82f6',
  NE: '#6366f1',
  E: '#8b5cf6',
  SE: '#a855f7',
  S: '#d946ef',
  SW: '#ec4899',
  W: '#f43f5e',
  NW: '#f97316',
}

function TerrainStatsCard() {
  const { data: status } = useTerrainStatus()
  const { data: stats, refetch } = useTerrainStats()
  const { mutate: runTerrain, isPending } = useRunTerrain()

  const slopeData = React.useMemo(() => {
    if (!stats?.slope?.distribution) return []

    return Object.entries(stats.slope.distribution).map(([name, value]) => ({
      name: SLOPE_LABELS[name] || name,
      key: name,
      value: value.percentage,
      fill: SLOPE_COLORS[name] || '#888888',
    }))
  }, [stats])

  const aspectData = React.useMemo(() => {
    if (!stats?.aspect?.distribution) return []

    const order = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    return order.map((dir) => ({
      name: dir,
      value: stats.aspect.distribution[dir]?.percentage || 0,
      fill: ASPECT_COLORS[dir] || '#888888',
    }))
  }, [stats])

  const handleRunAnalysis = () => {
    runTerrain(undefined, {
      onSuccess: () => {
        refetch()
      },
    })
  }

  const fmt = (v: number | undefined, decimals = 1) => {
    if (v === undefined) return '—'
    return v.toFixed(decimals)
  }

  return (
    <div
      className={cn(
        'rounded-[var(--uav-radius)] border border-[var(--uav-stroke)]',
        'bg-[var(--uav-panel)] p-4'
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--uav-text)]">
          Terrain Analysis
        </h3>
        {!status?.computed && status?.dsm_loaded && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRunAnalysis}
            disabled={isPending}
          >
            {isPending ? 'Analyzing...' : 'Run Analysis'}
          </Button>
        )}
      </div>

      {status?.computed && stats ? (
        <div className="space-y-4">
          {/* Elevation Stats */}
          <div>
            <h4 className="mb-2 text-xs font-medium text-[var(--uav-text-secondary)]">
              Elevation
            </h4>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="text-center">
                <div className="font-medium text-[var(--uav-text)]">
                  {fmt(stats.elevation?.min)}m
                </div>
                <div className="text-[var(--uav-text-secondary)]">Min</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-[var(--uav-text)]">
                  {fmt(stats.elevation?.max)}m
                </div>
                <div className="text-[var(--uav-text-secondary)]">Max</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-[var(--uav-text)]">
                  {fmt(stats.elevation?.mean)}m
                </div>
                <div className="text-[var(--uav-text-secondary)]">Mean</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-[var(--uav-text)]">
                  {fmt(stats.elevation?.std)}m
                </div>
                <div className="text-[var(--uav-text-secondary)]">Std</div>
              </div>
            </div>
          </div>

          {/* Slope Distribution */}
          {slopeData.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-medium text-[var(--uav-text-secondary)]">
                Slope Distribution
              </h4>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={slopeData} layout="vertical">
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={10} />
                    <YAxis type="category" dataKey="name" width={90} fontSize={10} />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Coverage']} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {slopeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Aspect Distribution */}
          {aspectData.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-medium text-[var(--uav-text-secondary)]">
                Aspect Distribution
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {aspectData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-1 rounded px-2 py-0.5 text-xs"
                    style={{ backgroundColor: item.fill + '20', color: item.fill }}
                  >
                    <span className="font-medium">{item.name}</span>
                    <span>{item.value.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center text-sm text-[var(--uav-text-secondary)]">
          {!status?.dsm_loaded
            ? 'Upload a DSM file to enable terrain analysis'
            : status?.computed
              ? 'No terrain data available'
              : 'Run analysis to see terrain statistics'}
        </div>
      )}
    </div>
  )
}

export { TerrainStatsCard }
