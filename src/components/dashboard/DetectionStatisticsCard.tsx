'use client'

import * as React from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DashboardCard } from './DashboardCard'
import { DetectionTable } from './DetectionTable'
import type { DetectionObject, ObjectClass } from '@/types/detection'

type FilterType = ObjectClass | 'all'

interface DetectionStatisticsCardProps {
  objects: DetectionObject[]
  selectedId: number | null
  onSelectRow: (id: number) => void
  filter: FilterType
  onFilterChange: (filter: FilterType) => void
}

function DetectionStatisticsCard({
  objects,
  selectedId,
  onSelectRow,
  filter,
  onFilterChange,
}: DetectionStatisticsCardProps) {
  const filteredObjects = React.useMemo(
    () =>
      filter === 'all' ? objects : objects.filter((o) => o.cls === filter),
    [objects, filter]
  )

  return (
    <DashboardCard
      title="Detection Statistics"
      helpText="類似 QGIS 屬性表：可篩選類型、點選列同步地圖標記"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-[var(--uav-text-secondary)]">
          {filteredObjects.length} objects
        </span>
        <Select value={filter} onValueChange={(v) => onFilterChange(v as FilterType)}>
          <SelectTrigger className="h-7 w-32 border-[var(--uav-stroke)] bg-[var(--uav-panel-elevated)] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="person">Person</SelectItem>
            <SelectItem value="vehicle">Vehicle</SelectItem>
            <SelectItem value="cone">Cone</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DetectionTable
        objects={filteredObjects}
        selectedId={selectedId}
        onSelectRow={onSelectRow}
      />
    </DashboardCard>
  )
}

export { DetectionStatisticsCard }
