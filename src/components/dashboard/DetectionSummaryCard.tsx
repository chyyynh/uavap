'use client'

import * as React from 'react'

import { DashboardCard } from './DashboardCard'
import { SummaryTile } from './SummaryTile'
import type { DetectionObject } from '@/types/detection'

interface DetectionSummaryCardProps {
  objects: DetectionObject[]
}

function DetectionSummaryCard({ objects }: DetectionSummaryCardProps) {
  const personCount = objects.filter((o) => o.cls === 'person').length
  const vehicleCount = objects.filter((o) => o.cls === 'vehicle').length
  const coneCount = objects.filter((o) => o.cls === 'cone').length
  const totalCount = objects.length

  return (
    <DashboardCard
      title="Detection Summary"
      helpText="顯示本次偵測的類別數量"
    >
      <div className="grid grid-cols-2 gap-2">
        <SummaryTile label="Persons" value={personCount} color="blue" />
        <SummaryTile label="Vehicles" value={vehicleCount} color="green" />
        <SummaryTile label="Cones" value={coneCount} color="orange" />
        <SummaryTile label="Total" value={totalCount} color="teal" />
      </div>
    </DashboardCard>
  )
}

export { DetectionSummaryCard }
