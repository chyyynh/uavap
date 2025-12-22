'use client'

import * as React from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  LayerGroup,
  ScaleControl,
  Popup,
  GeoJSON,
  useMap,
} from 'react-leaflet'
import type { CircleMarker as LeafletCircleMarker, Map as LeafletMap } from 'leaflet'

import { cn } from '@/lib/utils'
import { Chip } from '@/components/ui/chip'
import { LayerPanel } from './LayerPanel'
import { HoverCard } from './HoverCard'
import type { DetectionObject, LayerVisibility, ObjectClass } from '@/types/detection'
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  LANDCOVER_GEOJSON,
} from '@/api/mock-data'

interface MapViewProps {
  objects: DetectionObject[]
  projectName: string
  status: string
  layerVisibility: LayerVisibility
  onLayerToggle: (layer: keyof LayerVisibility) => void
  selectedObjectId: number | null
  onSelectObject: (id: number) => void
  mapRef?: React.MutableRefObject<LeafletMap | null>
}

const MARKER_COLORS: Record<ObjectClass, string> = {
  person: '#3b82f6',
  vehicle: '#22c55e',
  cone: '#f97316',
}

function fmt(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined) return '—'
  return v.toFixed(decimals)
}

function MapView({
  objects,
  projectName,
  status,
  layerVisibility,
  onLayerToggle,
  selectedObjectId,
  onSelectObject,
  mapRef,
}: MapViewProps) {
  const [hoveredObject, setHoveredObject] = React.useState<DetectionObject | null>(null)
  const [hoverPosition, setHoverPosition] = React.useState({ x: 0, y: 0 })
  const containerRef = React.useRef<HTMLDivElement>(null)

  const personObjects = objects.filter((o) => o.cls === 'person')
  const vehicleObjects = objects.filter((o) => o.cls === 'vehicle')
  const coneObjects = objects.filter((o) => o.cls === 'cone')

  const handleMouseEnter = (obj: DetectionObject, e: L.LeafletMouseEvent) => {
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (containerRect) {
      setHoverPosition({
        x: e.originalEvent.clientX - containerRect.left + 14,
        y: e.originalEvent.clientY - containerRect.top + 14,
      })
    }
    setHoveredObject(obj)
  }

  const handleMouseMove = (obj: DetectionObject, e: L.LeafletMouseEvent) => {
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (containerRect) {
      setHoverPosition({
        x: e.originalEvent.clientX - containerRect.left + 14,
        y: e.originalEvent.clientY - containerRect.top + 14,
      })
    }
  }

  const handleMouseLeave = () => {
    setHoveredObject(null)
  }

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <MapContainer
        center={DEFAULT_MAP_CENTER}
        zoom={DEFAULT_MAP_ZOOM}
        className="h-full w-full"
        ref={mapRef as any}
      >
        <MapController mapRef={mapRef} />

        {layerVisibility.base && (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={20}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        )}

        {layerVisibility.landcover && (
          <GeoJSON
            data={LANDCOVER_GEOJSON as any}
            style={() => ({
              weight: 1,
              opacity: 0.9,
              fillOpacity: 0.15,
              color: '#22c55e',
            })}
          />
        )}

        {layerVisibility.person && (
          <LayerGroup>
            {personObjects.map((obj) => (
              <ObjectMarker
                key={obj.id}
                object={obj}
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={() => onSelectObject(obj.id)}
              />
            ))}
          </LayerGroup>
        )}

        {layerVisibility.vehicle && (
          <LayerGroup>
            {vehicleObjects.map((obj) => (
              <ObjectMarker
                key={obj.id}
                object={obj}
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={() => onSelectObject(obj.id)}
              />
            ))}
          </LayerGroup>
        )}

        {layerVisibility.cone && (
          <LayerGroup>
            {coneObjects.map((obj) => (
              <ObjectMarker
                key={obj.id}
                object={obj}
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={() => onSelectObject(obj.id)}
              />
            ))}
          </LayerGroup>
        )}

        <ScaleControl position="bottomleft" imperial={false} />
      </MapContainer>

      <div className="pointer-events-none absolute right-3.5 top-3.5 z-[600] flex gap-2.5">
        <Chip>Project: {projectName}</Chip>
        <Chip>Status: {status}</Chip>
      </div>

      <LayerPanel
        visibility={layerVisibility}
        onToggle={onLayerToggle}
      />

      {hoveredObject && (
        <HoverCard
          object={hoveredObject}
          position={hoverPosition}
        />
      )}
    </div>
  )
}

interface MapControllerProps {
  mapRef?: React.MutableRefObject<LeafletMap | null>
}

function MapController({ mapRef }: MapControllerProps) {
  const map = useMap()

  React.useEffect(() => {
    if (mapRef) {
      mapRef.current = map
    }
  }, [map, mapRef])

  return null
}

interface ObjectMarkerProps {
  object: DetectionObject
  onMouseEnter: (obj: DetectionObject, e: L.LeafletMouseEvent) => void
  onMouseMove: (obj: DetectionObject, e: L.LeafletMouseEvent) => void
  onMouseLeave: () => void
  onClick: () => void
}

function ObjectMarker({
  object,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  onClick,
}: ObjectMarkerProps) {
  return (
    <CircleMarker
      center={[object.lat, object.lon]}
      radius={7}
      pathOptions={{
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.35,
        color: MARKER_COLORS[object.cls],
        fillColor: MARKER_COLORS[object.cls],
      }}
      eventHandlers={{
        mouseover: (e) => onMouseEnter(object, e),
        mousemove: (e) => onMouseMove(object, e),
        mouseout: onMouseLeave,
        click: onClick,
      }}
    >
      <Popup>
        <div className="text-sm">
          <strong>{object.cls}</strong>
          <br />
          ID: {object.id}
          <br />
          score: {fmt(object.score, 3)}
          <br />
          elev_z: {fmt(object.elev_z, 2)} m
          <br />
          height_m: {fmt(object.height_m, 2)} m
        </div>
      </Popup>
    </CircleMarker>
  )
}

export { MapView }
