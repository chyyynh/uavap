'use client'

import * as React from 'react'

import { Badge } from '@/components/ui/badge'
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
      title="Detection statistics"
      helpText="類似 QGIS 屬性表：可篩選類型、點選列同步地圖標記。"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2.5">
        <Badge
          variant="outline"
          className="rounded-full border-white/10 bg-white/6 px-2.5 py-1.5 text-xs text-white/85"
        >
          OBJECTS
        </Badge>
        <Select value={filter} onValueChange={(v) => onFilterChange(v as FilterType)}>
          <SelectTrigger className="min-w-[140px] rounded-full border-white/10 bg-white/6 text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="person">person</SelectItem>
            <SelectItem value="vehicle">vehicle</SelectItem>
            <SelectItem value="cone">cone</SelectItem>
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
