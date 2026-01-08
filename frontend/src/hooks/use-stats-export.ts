'use client'

import * as React from 'react'
import { notify } from '@/components/ui/sonner'
import { getStoredApiUrl } from '@/api/queries'
import type { DetectionObject } from '@/types/detection'

function download(filename: string, data: string) {
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function summarize(objects: DetectionObject[]) {
  return {
    total: objects.length,
    person: objects.filter((o) => o.cls === 'person').length,
    vehicle: objects.filter((o) => o.cls === 'vehicle').length,
    cone: objects.filter((o) => o.cls === 'cone').length,
  }
}

export function useStatsExport(objects: DetectionObject[]) {
  const [isExporting, setIsExporting] = React.useState(false)

  const exportStats = React.useCallback(async () => {
    setIsExporting(true)
    try {
      const apiUrl = getStoredApiUrl()
      const response = await fetch(`${apiUrl}/api/export/stats`)
      if (response.ok) {
        const text = await response.text()
        download('stats.json', text)
        notify.success('Stats exported', 'stats.json')
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      const local = JSON.stringify({
        generated_at: new Date().toISOString(),
        summary: summarize(objects),
        detections: objects,
      }, null, 2)
      download('stats.json', local)
      notify.success('Stats exported', 'stats.json')
    } finally {
      setIsExporting(false)
    }
  }, [objects])

  return { exportStats, isExporting }
}
