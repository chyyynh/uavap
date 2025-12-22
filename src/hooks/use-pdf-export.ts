import * as React from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { generatePdfReport, captureMapImage } from '@/lib/pdf-generator'
import type { DetectionObject, TiffMetadata } from '@/types/detection'
import { notify } from '@/components/ui/sonner'
import { getOrthoImageUrl } from '@/api/queries'

interface UsePdfExportOptions {
  mapRef: React.MutableRefObject<LeafletMap | null>
  objects: DetectionObject[]
  metadata: TiffMetadata | null | undefined
}

/**
 * 將圖片 URL 轉為 Base64
 */
async function imageUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function usePdfExport({ mapRef, objects, metadata }: UsePdfExportOptions) {
  const [isExporting, setIsExporting] = React.useState(false)

  const exportPdf = React.useCallback(async () => {
    if (objects.length === 0) {
      notify.error('Export failed', 'No detection results to export')
      return
    }

    setIsExporting(true)

    try {
      let mapImageBase64 = ''

      // 優先嘗試使用 ortho image URL
      const orthoUrl = getOrthoImageUrl()
      if (orthoUrl) {
        try {
          mapImageBase64 = await imageUrlToBase64(orthoUrl)
        } catch (e) {
          console.warn('Failed to fetch ortho image:', e)
        }
      }

      // 如果沒有 ortho，嘗試截取地圖
      if (!mapImageBase64) {
        const mapContainer = mapRef.current?.getContainer()
        if (mapContainer) {
          try {
            mapImageBase64 = await captureMapImage(mapContainer)
          } catch (e) {
            console.warn('Failed to capture map image:', e)
          }
        }
      }

      // 使用實際 metadata 或預設值
      const effectiveMetadata: TiffMetadata = metadata ?? {
        filename: `detection_report_${new Date().toISOString().slice(0, 10)}`,
        datetime: new Date().toISOString(),
        width: 0,
        height: 0,
      }

      // 生成 PDF
      await generatePdfReport({
        metadata: effectiveMetadata,
        mapImageBase64,
        objects,
      })

      notify.success('PDF exported', `${effectiveMetadata.filename.replace(/\.[^/.]+$/, '')}_report.pdf`)
    } catch (error) {
      console.error('PDF export error:', error)
      notify.error('Export failed', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsExporting(false)
    }
  }, [mapRef, objects, metadata])

  return {
    exportPdf,
    isExporting,
    canExport: objects.length > 0,
  }
}
