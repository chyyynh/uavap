'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ChartHistogramIcon,
  FileExportIcon,
  Layers01Icon,
  Download04Icon,
} from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import { DashboardCard } from './DashboardCard'

const EXPORT_OPTIONS = [
  { id: 'stats', label: 'Stats', icon: ChartHistogramIcon },
  { id: 'pdf', label: 'PDF', icon: FileExportIcon },
  { id: 'gpkg', label: 'GPKG', icon: Layers01Icon },
] as const

interface ExportReportCardProps {
  onExportPdf: () => void
  isExporting: boolean
  canExport: boolean
  hasResults: boolean
}

function ExportReportCard({
  onExportPdf,
  isExporting,
  canExport,
  hasResults,
}: ExportReportCardProps) {
  const [selectedFormats, setSelectedFormats] = React.useState<Set<string>>(
    new Set(['stats', 'pdf'])
  )

  const toggleFormat = (id: string) => {
    setSelectedFormats((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleExport = () => {
    if (selectedFormats.has('pdf')) {
      onExportPdf()
    }
  }

  const selectedCount = selectedFormats.size
  const isDisabled = !canExport || isExporting || selectedCount === 0

  return (
    <DashboardCard title="Export" helpText="Select export formats and download report">
      <div className="space-y-3">
        {/* Format Selection */}
        <div className="flex gap-2">
          {EXPORT_OPTIONS.map((option) => {
            const isSelected = selectedFormats.has(option.id)
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleFormat(option.id)}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 border py-2 transition-all',
                  isSelected
                    ? 'border-[var(--uav-red)]/30 bg-[var(--uav-red)]/10'
                    : 'border-[var(--uav-stroke)] bg-transparent hover:border-[var(--uav-stroke-strong)]'
                )}
              >
                <HugeiconsIcon
                  icon={option.icon}
                  strokeWidth={1.5}
                  className={cn(
                    'size-3.5 transition-colors',
                    isSelected ? 'text-[var(--uav-red)]' : 'text-[var(--uav-text-tertiary)]'
                  )}
                />
                <span
                  className={cn(
                    'text-[9px] font-medium tracking-wider transition-colors',
                    isSelected ? 'text-[var(--uav-red)]' : 'text-[var(--uav-text-secondary)]'
                  )}
                >
                  {option.label.toUpperCase()}
                </span>
              </button>
            )
          })}
        </div>

        {/* Warning Message */}
        {!hasResults && (
          <div className="border border-[var(--uav-warning)]/20 bg-[var(--uav-warning)]/5 px-3 py-2 text-[9px] text-[var(--uav-warning)]">
            Run detection first to generate exportable results
          </div>
        )}

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isDisabled}
          className={cn(
            'group relative w-full overflow-hidden py-2.5 font-medium tracking-wider transition-all duration-300',
            isDisabled
              ? 'cursor-not-allowed border border-[var(--uav-stroke)] bg-transparent text-[var(--uav-text-tertiary)]'
              : 'border border-[var(--uav-stroke)] bg-white/[0.02] text-[var(--uav-text)] hover:border-[var(--uav-red)]/30 hover:text-[var(--uav-red)]'
          )}
        >
          <span className="relative flex items-center justify-center gap-2 text-[10px]">
            <HugeiconsIcon
              icon={Download04Icon}
              strokeWidth={2}
              className={cn('size-3.5', isExporting && 'animate-bounce')}
            />
            {isExporting ? 'EXPORTING...' : `DOWNLOAD${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
          </span>
        </button>
      </div>
    </DashboardCard>
  )
}

export { ExportReportCard }
