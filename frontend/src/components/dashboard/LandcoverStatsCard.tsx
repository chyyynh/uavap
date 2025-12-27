'use client'

import * as React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

import { cn } from '@/lib/utils'
import { useLandcoverStats, useLandcoverStatus, useRunLandcover } from '@/api/queries'
import { Button } from '@/components/ui/button'

// Landcover class colors (matching backend LANDCOVER_COLORS)
const LANDCOVER_COLORS: Record<string, string> = {
  'bare-ground': '#deb887',
  'tree': '#228b22',
  'road': '#808080',
  'pavement': '#b22222',
  'grass': '#7cfc00',
  'building': '#ff8c00',
}

const LANDCOVER_LABELS: Record<string, string> = {
  'bare-ground': 'Bare Ground',
  'tree': 'Tree',
  'road': 'Road',
  'pavement': 'Pavement',
  'grass': 'Grass',
  'building': 'Building',
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
        name: LANDCOVER_LABELS[name] || name,
        value: value.percentage,
        fill: LANDCOVER_COLORS[name] || '#888888',
      }))
      .sort((a, b) => b.value - a.value)
  }, [stats])

  const handleRunAnalysis = () => {
    runLandcover(undefined, {
      onSuccess: () => {
        refetch()
      },
    })
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
          Land Cover Analysis
        </h3>
        {!status?.computed && (
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

      {status?.computed && chartData.length > 0 ? (
        <>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${value.toFixed(1)}%`}
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Coverage']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 space-y-1.5">
            {chartData.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-[var(--uav-text-secondary)]">
                    {item.name}
                  </span>
                </div>
                <span className="font-medium text-[var(--uav-text)]">
                  {item.value.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex h-32 items-center justify-center text-sm text-[var(--uav-text-secondary)]">
          {status?.computed
            ? 'No landcover data available'
            : 'Run analysis to see landcover distribution'}
        </div>
      )}
    </div>
  )
}

export { LandcoverStatsCard }
