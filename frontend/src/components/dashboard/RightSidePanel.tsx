'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { GridViewIcon, Menu01Icon } from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import { DetectionSummaryCard } from './DetectionSummaryCard'
import { TerrainStatsCard } from './TerrainStatsCard'
import { LandcoverStatsCard } from './LandcoverStatsCard'
import { ExportReportCard } from './ExportReportCard'
import { DetectionTable } from './DetectionTable'
import type { DetectionObject, ObjectClass } from '@/types/detection'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type FilterType = ObjectClass | 'all'
type ViewMode = 'terrain' | 'detail'

interface RightSidePanelProps {
  objects: DetectionObject[]
  selectedObjectId: number | null
  onSelectObject: (id: number) => void
  filter: FilterType
  onFilterChange: (filter: FilterType) => void
  onExportPdf: () => void
  isExporting: boolean
  canExport: boolean
}

function RightSidePanel({
  objects,
  selectedObjectId,
  onSelectObject,
  filter,
  onFilterChange,
  onExportPdf,
  isExporting,
  canExport,
}: RightSidePanelProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>('terrain')

  const filteredObjects = React.useMemo(
    () =>
      filter === 'all' ? objects : objects.filter((o) => o.cls === filter),
    [objects, filter],
  )

  return (
    <div className="flex h-full flex-col gap-2">
      {/* 1. Detection Summary - Fixed Top */}
      <div className="shrink-0">
        <DetectionSummaryCard objects={objects} />
      </div>

      {/* 2. Toggle Section - Terrain/Landcover or Detail */}
      <div
        className={cn(
          'flex flex-col overflow-hidden border border-white/[0.12] bg-neutral-800/90 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.5)]',
          viewMode === 'detail' ? 'min-h-0 flex-1' : '',
        )}
      >
        {/* Toggle Header */}
        <div className="shrink-0 flex items-center border-b border-white/[0.06]">
          <button
            type="button"
            onClick={() => setViewMode('terrain')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 px-3 py-2 transition-all',
              viewMode === 'terrain'
                ? 'bg-white/[0.03] text-[var(--uav-red)]'
                : 'text-white/30 hover:text-white/50',
            )}
          >
            <HugeiconsIcon
              icon={GridViewIcon}
              className="size-3"
              strokeWidth={1.5}
            />
            <span className="text-[8px] font-medium tracking-[0.1em]">
              TERRAIN
            </span>
          </button>
          <div className="h-5 w-px bg-white/[0.06]" />
          <button
            type="button"
            onClick={() => setViewMode('detail')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 px-3 py-2 transition-all',
              viewMode === 'detail'
                ? 'bg-white/[0.03] text-[var(--uav-red)]'
                : 'text-white/30 hover:text-white/50',
            )}
          >
            <HugeiconsIcon
              icon={Menu01Icon}
              className="size-3"
              strokeWidth={1.5}
            />
            <span className="text-[8px] font-medium tracking-[0.1em]">
              DETAIL
            </span>
            <span className="font-mono text-[9px] text-[var(--uav-red)]">
              {filteredObjects.length.toString().padStart(2, '0')}
            </span>
          </button>
        </div>

        {/* Content Area - Scrollable */}
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          {viewMode === 'terrain' ? (
            <div className="flex flex-col">
              <TerrainStatsCard />
              <LandcoverStatsCard />
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Filter */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-neutral-800/85 px-3 py-2">
                <span className="text-[7px] font-medium tracking-[0.15em] text-white/30">
                  FILTER
                </span>
                <Select
                  value={filter}
                  onValueChange={(v) => onFilterChange(v as FilterType)}
                >
                  <SelectTrigger className="h-5 w-20 gap-1 border-white/[0.12] bg-transparent px-2 text-[8px] font-medium uppercase tracking-wider text-white/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/[0.12] bg-neutral-800/85 backdrop-blur-md">
                    <SelectItem
                      value="all"
                      className="text-[9px] uppercase text-white/80"
                    >
                      All
                    </SelectItem>
                    <SelectItem
                      value="person"
                      className="text-[9px] uppercase text-white/80"
                    >
                      Person
                    </SelectItem>
                    <SelectItem
                      value="vehicle"
                      className="text-[9px] uppercase text-white/80"
                    >
                      Vehicle
                    </SelectItem>
                    <SelectItem
                      value="cone"
                      className="text-[9px] uppercase text-white/80"
                    >
                      Cone
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <DetectionTable
                objects={filteredObjects}
                selectedId={selectedObjectId}
                onSelectRow={onSelectObject}
              />
            </div>
          )}
        </div>
      </div>

      {/* Spacer to push export to bottom when terrain mode */}
      {viewMode === 'terrain' && <div className="flex-1" />}

      {/* 3. Export Button - Fixed Bottom */}
      <div className="shrink-0">
        <ExportReportCard
          onExportPdf={onExportPdf}
          isExporting={isExporting}
          canExport={canExport}
          hasResults={objects.length > 0}
        />
      </div>
    </div>
  )
}

export { RightSidePanel }
