'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon } from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
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
  const [open, setOpen] = React.useState(true)

  const filteredObjects = React.useMemo(
    () =>
      filter === 'all' ? objects : objects.filter((o) => o.cls === filter),
    [objects, filter]
  )

  return (
    <div className="noir-panel">
      <div className="noir-panel-inner">
        <Collapsible open={open} onOpenChange={setOpen}>
          {/* Header bar */}
          <div className="flex items-center gap-4 px-4 py-2.5">
            <CollapsibleTrigger className="flex items-center gap-2 transition-colors hover:text-[var(--uav-text)]">
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                strokeWidth={2}
                className={cn(
                  'size-3 text-[var(--uav-text-tertiary)] transition-transform duration-200',
                  !open && '-rotate-90'
                )}
              />
              <span className="text-[10px] font-medium tracking-wider text-[var(--uav-text-secondary)]">
                DETECTION RESULTS
              </span>
            </CollapsibleTrigger>

            <div className="h-px flex-1 bg-[var(--uav-stroke)]" />

            <span className="font-mono text-sm font-medium text-[var(--uav-red)]">
              {filteredObjects.length.toString().padStart(3, '0')}
            </span>

            <span className="text-[9px] tracking-wider text-[var(--uav-text-tertiary)]">
              ITEMS
            </span>

            <div className="h-4 w-px bg-[var(--uav-stroke)]" />

            <Select value={filter} onValueChange={(v) => onFilterChange(v as FilterType)}>
              <SelectTrigger className="h-6 w-24 gap-1 border-[var(--uav-stroke)] bg-transparent px-2 text-[9px] font-medium uppercase tracking-wider text-[var(--uav-text-secondary)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="noir-panel border-[var(--uav-stroke)]">
                <SelectItem value="all" className="text-[10px] uppercase">All</SelectItem>
                <SelectItem value="person" className="text-[10px] uppercase">Person</SelectItem>
                <SelectItem value="vehicle" className="text-[10px] uppercase">Vehicle</SelectItem>
                <SelectItem value="cone" className="text-[10px] uppercase">Cone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <CollapsibleContent>
            <div className="max-h-48 overflow-auto border-t border-[var(--uav-stroke)] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
              <DetectionTable
                objects={filteredObjects}
                selectedId={selectedId}
                onSelectRow={onSelectRow}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
}

export { DetectionStatisticsCard }
