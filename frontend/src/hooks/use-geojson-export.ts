'use client'

import * as React from 'react'
import type { DetectionObject } from '@/types/detection'
import { notify } from '@/components/ui/sonner'
import { getStoredApiUrl } from '@/api/queries'

function toGeojson(objects: DetectionObject[], crsName?: string) {
  return {
    type: 'FeatureCollection',
    features: objects
      .filter((o) => o.center_x != null && o.center_y != null)
      .map((o) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [o.center_x, o.center_y] },
        properties: {
          id: o.id,
          cls: o.cls,
          score: o.score,
          center_x: o.center_x,
          center_y: o.center_y,
          elev_z: o.elev_z,
          height_m: o.height_m,
          volume_m3: o.volume_m3 ?? null,
          volume_reason: o.volume_reason ?? null,
        },
      })),
    ...(crsName ? { crs: { type: 'name', properties: { name: crsName } } } : {}),
  }
}

function download(filename: string, data: string) {
  const blob = new Blob([data], { type: 'application/geo+json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function useGeojsonExport(objects: DetectionObject[], crsName?: string) {
  const [isExporting, setIsExporting] = React.useState(false)

  const exportGeojson = React.useCallback(async () => {
    if (objects.length === 0) {
      notify.error('Export failed', 'No detection results to export')
      return
    }

    setIsExporting(true)
    try {
      const apiUrl = getStoredApiUrl()
      const response = await fetch(`${apiUrl}/api/export/geojson`)
      if (response.ok) {
        const payload = await response.json()
        // Ensure exported GeoJSON does not include area_m2.
        if (payload?.features?.length) {
          payload.features = payload.features.map((feature: any) => {
            const props = { ...(feature.properties || {}) }
            delete props.area_m2
            return { ...feature, properties: props }
          })
        }
        download('detections.geojson', JSON.stringify(payload, null, 2))
      } else {
        const local = JSON.stringify(toGeojson(objects, crsName), null, 2)
        download('detections.geojson', local)
      }
      notify.success('GeoJSON exported', 'detections.geojson')
    } catch (error) {
      const local = JSON.stringify(toGeojson(objects, crsName), null, 2)
      download('detections.geojson', local)
      notify.success('GeoJSON exported', 'detections.geojson')
    } finally {
      setIsExporting(false)
    }
  }, [crsName, objects])

  return { exportGeojson, isExporting }
}
