'use client'

import * as React from 'react'

import { DashboardCard } from './DashboardCard'
import { SummaryTile } from './SummaryTile'
import type { DetectionObject } from '@/types/detection'

interface DetectionSummaryCardProps {
  objects: DetectionObject[]
  outputText: string
  fieldText: string
}

function DetectionSummaryCard({
  objects,
  outputText,
  fieldText,
}: DetectionSummaryCardProps) {
  const personCount = objects.filter((o) => o.cls === 'person').length
  const vehicleCount = objects.filter((o) => o.cls === 'vehicle').length
  const coneCount = objects.filter((o) => o.cls === 'cone').length

  return (
    <DashboardCard
      title="Detection summary"
      helpText="顯示本次偵測的類別數量。詳細屬性請看 statistics。"
    >
      <div className="grid grid-cols-2 gap-2.5">
        <SummaryTile
          label="Persons"
          value={personCount}
          subtitle="class: person"
        />
        <SummaryTile
          label="Vehicles"
          value={vehicleCount}
          subtitle="class: vehicle"
        />
        <SummaryTile label="Cones" value={coneCount} subtitle="class: cone" />
        <SummaryTile
          label="Outputs"
          value={outputText}
          subtitle={fieldText}
        />
      </div>
    </DashboardCard>
  )
}

export { DetectionSummaryCard }
