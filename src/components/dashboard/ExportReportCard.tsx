'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ChartHistogramIcon,
  FileExportIcon,
  Layers01Icon,
  Download04Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DashboardCard } from './DashboardCard'

interface ExportOption {
  id: 'stats' | 'pdf' | 'gpkg'
  label: string
  subtitle?: string
  icon: any
  enabled: boolean
}

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

  const exportOptions: ExportOption[] = [
    { id: 'stats', label: '統計摘要', icon: ChartHistogramIcon, enabled: true },
    { id: 'pdf', label: '報表', subtitle: 'PDF', icon: FileExportIcon, enabled: true },
    { id: 'gpkg', label: 'GIS 圖層', subtitle: 'GeoPackage', icon: Layers01Icon, enabled: true },
  ]

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

  return (
    <DashboardCard
      title="Export Report"
      helpText="選擇匯出的檔案格式並下載報表"
    >
      {/* Format Selection */}
      <div className="mb-4 space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--uav-text-tertiary)]">
          輸出格式
        </span>
        <div className="flex flex-wrap gap-2">
          {exportOptions.map((option) => {
            const isSelected = selectedFormats.has(option.id)
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => option.enabled && toggleFormat(option.id)}
                disabled={!option.enabled}
                className={cn(
                  'relative flex items-center gap-2 rounded-[var(--uav-radius-sm)] border px-3 py-2 text-sm transition-all',
                  isSelected
                    ? 'border-[var(--uav-teal)] bg-[var(--uav-teal)]/15 text-[var(--uav-teal)]'
                    : 'border-[var(--uav-stroke)] bg-[var(--uav-panel-elevated)] text-[var(--uav-text-secondary)] hover:border-[var(--uav-text-tertiary)]',
                  !option.enabled && 'cursor-not-allowed opacity-40'
                )}
              >
                {isSelected && (
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    strokeWidth={2.5}
                    className="size-3.5"
                  />
                )}
                <HugeiconsIcon
                  icon={option.icon}
                  strokeWidth={1.5}
                  className="size-4"
                />
                <span>{option.label}</span>
                {option.subtitle && (
                  <span className="text-xs opacity-60">{option.subtitle}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Status Message */}
      {!hasResults && (
        <div className="mb-3 rounded-[var(--uav-radius-xs)] border border-[var(--uav-warning)]/20 bg-[var(--uav-warning)]/5 px-3 py-2 text-xs text-[var(--uav-warning)]">
          請先執行偵測任務以產生結果
        </div>
      )}

      {/* Export Button */}
      <Button
        onClick={handleExport}
        disabled={!canExport || isExporting || selectedCount === 0}
        className={cn(
          'w-full gap-2 rounded-[var(--uav-radius-sm)] py-2.5 text-sm font-semibold',
          'bg-[var(--uav-teal)] text-[#151515] hover:bg-[var(--uav-teal)]/90',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        <HugeiconsIcon
          icon={Download04Icon}
          strokeWidth={2}
          className={cn('size-4', isExporting && 'animate-bounce')}
        />
        {isExporting ? 'Exporting...' : `Export${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
      </Button>
    </DashboardCard>
  )
}

export { ExportReportCard }
