'use client'

import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { Map as LeafletMap } from 'leaflet'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { DetectionTaskCard } from '@/components/dashboard/DetectionTaskCard'
import { DetectionSummaryCard } from '@/components/dashboard/DetectionSummaryCard'
import { DetectionStatisticsCard } from '@/components/dashboard/DetectionStatisticsCard'
import { MapView } from '@/components/dashboard/MapView'
import { useDetections } from '@/api/queries'
import { useProcessing } from '@/hooks/use-processing'
import { useTaskOptions } from '@/hooks/use-task-options'
import { useLayerVisibility } from '@/hooks/use-layer-visibility'
import type { ObjectClass } from '@/types/detection'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const [selectedProjectId, setSelectedProjectId] = React.useState('futas')
  const [selectedObjectId, setSelectedObjectId] = React.useState<number | null>(null)
  const [filter, setFilter] = React.useState<ObjectClass | 'all'>('all')
  const [status, setStatus] = React.useState('Ready')

  const mapRef = React.useRef<LeafletMap | null>(null)

  const { data: objects = [] } = useDetections(selectedProjectId)
  const { isRunning, progress, elapsed, steps, run } = useProcessing()
  const { options, setOption, outputText, fieldText } = useTaskOptions()
  const { visibility, toggle, enable } = useLayerVisibility()

  const handleRun = React.useCallback(() => {
    setStatus('Running...')
    run()
    setTimeout(() => {
      setStatus('Done')
    }, 3200)
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

  const projectName = React.useMemo(() => {
    const names: Record<string, string> = {
      futas: 'FUTAS_Test_Field',
      harbor: 'Harbor_Breakwater',
      bridge: 'Bridge_Inspection',
    }
    return names[selectedProjectId] || selectedProjectId
  }, [selectedProjectId])

  return (
    <DashboardLayout
      selectedProjectId={selectedProjectId}
      onProjectChange={setSelectedProjectId}
      sidebar={
        <>
          <DetectionTaskCard
            onRun={handleRun}
            isRunning={isRunning}
            steps={steps}
            progress={progress}
            elapsed={elapsed}
            taskOptions={options}
            onTaskOptionChange={(key, value) =>
              setOption(key as keyof typeof options, value)
            }
          />
          <DetectionSummaryCard
            objects={objects}
            outputText={outputText}
            fieldText={fieldText}
          />
          <DetectionStatisticsCard
            objects={objects}
            selectedId={selectedObjectId}
            onSelectRow={handleSelectObject}
            filter={filter}
            onFilterChange={setFilter}
          />
        </>
      }
    >
      <MapView
        objects={objects}
        projectName={projectName}
        status={status}
        layerVisibility={visibility}
        onLayerToggle={toggle}
        selectedObjectId={selectedObjectId}
        onSelectObject={handleSelectObject}
        mapRef={mapRef}
      />
    </DashboardLayout>
  )
}
