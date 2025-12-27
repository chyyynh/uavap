'use client'

import * as React from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  LayerGroup,
  Popup,
  ImageOverlay,
  useMap,
} from 'react-leaflet'
import type { CircleMarker as LeafletCircleMarker, Map as LeafletMap } from 'leaflet'

import { LayerPanel, type MapTheme } from './LayerPanel'
import { HoverCard } from './HoverCard'
import type { DetectionObject, LayerVisibility, ObjectClass, OrthoBounds } from '@/types/detection'
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from '@/api/mock-data'

interface MapViewProps {
  objects: DetectionObject[]
  layerVisibility: LayerVisibility
  onLayerToggle: (layer: keyof LayerVisibility) => void
  selectedObjectId: number | null
  onSelectObject: (id: number) => void
  mapRef?: React.MutableRefObject<LeafletMap | null>
  orthoBounds?: OrthoBounds | null
  orthoUrl?: string | null
  landcoverUrl?: string | null
  slopeUrl?: string | null
  aspectUrl?: string | null
}

const MARKER_COLORS: Record<ObjectClass, string> = {
  person: '#3b82f6',
  vehicle: '#22c55e',
  cone: '#f97316',
}

const TILE_URLS: Record<MapTheme, { url: string; attribution: string; subdomains?: string }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
  },
  color: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
}

function fmt(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined) return '—'
  return v.toFixed(decimals)
}

function MapView({
  objects,
  layerVisibility,
  onLayerToggle,
  selectedObjectId,
  onSelectObject,
  mapRef,
  orthoBounds,
  orthoUrl,
  landcoverUrl,
  slopeUrl,
  aspectUrl,
}: MapViewProps) {
  const [hoveredObject, setHoveredObject] = React.useState<DetectionObject | null>(null)
  const [hoverPosition, setHoverPosition] = React.useState({ x: 0, y: 0 })
  const [mapTheme, setMapTheme] = React.useState<MapTheme>('dark')
  const containerRef = React.useRef<HTMLDivElement>(null)

  const tileConfig = TILE_URLS[mapTheme]

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
        zoomControl={false}
        attributionControl={false}
        ref={mapRef as any}
      >
        <MapController mapRef={mapRef} objects={objects} />

        {layerVisibility.base && (
          <TileLayer
            key={mapTheme}
            url={tileConfig.url}
            maxZoom={20}
            attribution={tileConfig.attribution}
            subdomains={tileConfig.subdomains || 'abc'}
          />
        )}

        {layerVisibility.ortho && orthoBounds && orthoUrl &&
         orthoBounds.north !== undefined && orthoBounds.south !== undefined &&
         orthoBounds.east !== undefined && orthoBounds.west !== undefined && (
          <ImageOverlay
            url={orthoUrl}
            bounds={[
              [orthoBounds.south, orthoBounds.west],
              [orthoBounds.north, orthoBounds.east],
            ]}
            opacity={0.9}
          />
        )}

        {layerVisibility.landcover && orthoBounds && landcoverUrl &&
         orthoBounds.north !== undefined && orthoBounds.south !== undefined &&
         orthoBounds.east !== undefined && orthoBounds.west !== undefined && (
          <ImageOverlay
            url={landcoverUrl}
            bounds={[
              [orthoBounds.south, orthoBounds.west],
              [orthoBounds.north, orthoBounds.east],
            ]}
            opacity={0.7}
          />
        )}

        {layerVisibility.slope && orthoBounds && slopeUrl &&
         orthoBounds.north !== undefined && orthoBounds.south !== undefined &&
         orthoBounds.east !== undefined && orthoBounds.west !== undefined && (
          <ImageOverlay
            url={slopeUrl}
            bounds={[
              [orthoBounds.south, orthoBounds.west],
              [orthoBounds.north, orthoBounds.east],
            ]}
            opacity={0.7}
          />
        )}

        {layerVisibility.aspect && orthoBounds && aspectUrl &&
         orthoBounds.north !== undefined && orthoBounds.south !== undefined &&
         orthoBounds.east !== undefined && orthoBounds.west !== undefined && (
          <ImageOverlay
            url={aspectUrl}
            bounds={[
              [orthoBounds.south, orthoBounds.west],
              [orthoBounds.north, orthoBounds.east],
            ]}
            opacity={0.7}
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

      </MapContainer>

      <LayerPanel
        visibility={layerVisibility}
        onToggle={onLayerToggle}
        mapTheme={mapTheme}
        onThemeChange={setMapTheme}
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
  objects?: DetectionObject[]
}

function MapController({ mapRef, objects }: MapControllerProps) {
  const map = useMap()
  const hasFittedRef = React.useRef(false)

  React.useEffect(() => {
    if (mapRef) {
      mapRef.current = map
    }
  }, [map, mapRef])

  // 當有偵測結果時，自動移動地圖到結果範圍
  React.useEffect(() => {
    if (objects && objects.length > 0 && !hasFittedRef.current) {
      const lats = objects.map((o) => o.lat)
      const lons = objects.map((o) => o.lon)
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lats), Math.min(...lons)],
        [Math.max(...lats), Math.max(...lons)],
      ]
      map.fitBounds(bounds, { padding: [50, 50] })
      hasFittedRef.current = true
    }
  }, [map, objects])

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
