'use client'

import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { Map as LeafletMap } from 'leaflet'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { DetectionTaskCard } from '@/components/dashboard/DetectionTaskCard'
import { RightSidePanel } from '@/components/dashboard/RightSidePanel'

// Dynamic import to avoid SSR issues with leaflet
const MapView = React.lazy(() => import('@/components/dashboard/MapView').then(mod => ({ default: mod.MapView })))
import { useQueryClient } from '@tanstack/react-query'
import {
  useDetections,
  useOrthoBounds,
  getOrthoImageUrl,
  useTiffMetadata,
  getLandcoverOverlayUrl,
  getSlopeImageUrl,
  getAspectImageUrl,
  useLandcoverStatus,
  useLandcoverStats,
  useTerrainStatus,
  useTerrainStats,
  setForceFullMock,
  isForceFullMock,
} from '@/api/queries'
import { useProcessing } from '@/hooks/use-processing'
import { useLayerVisibility } from '@/hooks/use-layer-visibility'
import { usePdfExport } from '@/hooks/use-pdf-export'
import type { ObjectClass } from '@/types/detection'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const [selectedProjectId, setSelectedProjectId] = React.useState('current')
  const [selectedObjectId, setSelectedObjectId] = React.useState<number | null>(null)
  const [filter, setFilter] = React.useState<ObjectClass | 'all'>('all')

  const mapRef = React.useRef<LeafletMap | null>(null)
  const queryClient = useQueryClient()

  const isMockMode = selectedProjectId === 'mock'

  if (isMockMode !== isForceFullMock()) {
    setForceFullMock(isMockMode)
  }

  const prevMockModeRef = React.useRef(isMockMode)
  React.useLayoutEffect(() => {
    if (prevMockModeRef.current !== isMockMode) {
      prevMockModeRef.current = isMockMode
      queryClient.resetQueries()
    }
  }, [isMockMode, queryClient])

  const { data: objects = [] } = useDetections(selectedProjectId)
  const { data: orthoBounds } = useOrthoBounds()
  const { data: tiffMetadata } = useTiffMetadata()
  const { data: landcoverStatus } = useLandcoverStatus()
  const { data: landcoverStats } = useLandcoverStats()
  const { data: terrainStatus } = useTerrainStatus()
  const { data: terrainStats } = useTerrainStats()
  const orthoUrl = getOrthoImageUrl()
  const landcoverUrl = landcoverStatus?.computed ? getLandcoverOverlayUrl() : null
  const slopeUrl = terrainStatus?.computed ? getSlopeImageUrl() : null
  const aspectUrl = terrainStatus?.computed ? getAspectImageUrl() : null
  const { isRunning, progress, elapsed, steps, currentStep, run } = useProcessing()
  const { visibility, toggle, enable } = useLayerVisibility()
  const { exportPdf, isExporting, canExport } = usePdfExport({
    mapRef,
    objects,
    metadata: tiffMetadata,
    landcoverStats,
    terrainStats,
  })

  const handleRun = React.useCallback(() => {
    run()
  }, [run])

  const handleSelectObject = React.useCallback(
    (id: number) => {
      setSelectedObjectId(id)

      const obj = objects.find((o) => o.id === id)
      if (obj && mapRef.current) {
        if (obj.cls === 'person') enable('person')
        if (obj.cls === 'vehicle') enable('vehicle')
        if (obj.cls === 'cone') enable('cone')

        mapRef.current.panTo([obj.lat, obj.lon], { animate: true })
      }
    },
    [objects, enable]
  )

  return (
    <DashboardLayout
      selectedProjectId={selectedProjectId}
      onProjectChange={setSelectedProjectId}
      isMockMode={isMockMode}
      bottomLeftPanel={
        <DetectionTaskCard
          onRun={handleRun}
          isRunning={isRunning}
          steps={steps}
          progress={progress}
          elapsed={elapsed}
          currentStep={currentStep}
        />
      }
      rightPanel={
        <RightSidePanel
          objects={objects}
          selectedObjectId={selectedObjectId}
          onSelectObject={handleSelectObject}
          filter={filter}
          onFilterChange={setFilter}
          onExportPdf={exportPdf}
          isExporting={isExporting}
          canExport={canExport}
        />
      }
    >
      <React.Suspense fallback={<div className="flex h-full w-full items-center justify-center bg-[var(--uav-bg)]"><span className="text-[var(--uav-text-tertiary)]">Loading map...</span></div>}>
        <MapView
          objects={objects}
          layerVisibility={visibility}
          onLayerToggle={toggle}
          selectedObjectId={selectedObjectId}
          onSelectObject={handleSelectObject}
          mapRef={mapRef}
          orthoBounds={orthoBounds}
          orthoUrl={orthoUrl}
          landcoverUrl={landcoverUrl}
          slopeUrl={slopeUrl}
          aspectUrl={aspectUrl}
        />
      </React.Suspense>
    </DashboardLayout>
  )
}
