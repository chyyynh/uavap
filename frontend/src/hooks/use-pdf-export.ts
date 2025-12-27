import * as React from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { generatePdfReport, captureMapImage } from '@/lib/pdf-generator'
import type { DetectionObject, TiffMetadata, LandcoverStats, TerrainStats } from '@/types/detection'
import { notify } from '@/components/ui/sonner'
import { getOrthoPreviewUrl } from '@/api/queries'

interface UsePdfExportOptions {
  mapRef: React.MutableRefObject<LeafletMap | null>
  objects: DetectionObject[]
  metadata: TiffMetadata | null | undefined
  landcoverStats?: LandcoverStats | null
  terrainStats?: TerrainStats | null
}

/**
 * 將圖片 URL 轉為 Base64（使用 Image 元素）
 */
async function imageUrlToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0)
      try {
        const dataUrl = canvas.toDataURL('image/png')
        console.log('[PDF Export] Image converted to base64, length:', dataUrl.length)
        resolve(dataUrl)
      } catch (e) {
        reject(e)
      }
    }

    img.onerror = (e) => {
      console.error('[PDF Export] Image load error:', e)
      reject(new Error('Failed to load image'))
    }

    console.log('[PDF Export] Loading image from:', url)
    img.src = url
  })
}

/**
 * 備用：使用 fetch 獲取圖片
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  console.log('[PDF Export] Fetching image via fetch:', url)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  const blob = await response.blob()
  console.log('[PDF Export] Blob type:', blob.type, 'size:', blob.size)

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      console.log('[PDF Export] FileReader result length:', result.length)
      resolve(result)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function usePdfExport({ mapRef, objects, metadata, landcoverStats, terrainStats }: UsePdfExportOptions) {
  const [isExporting, setIsExporting] = React.useState(false)

  const exportPdf = React.useCallback(async () => {
    if (objects.length === 0) {
      notify.error('Export failed', 'No detection results to export')
      return
    }

    setIsExporting(true)
    console.log('[PDF Export] Starting export...')

    try {
      let mapImageBase64 = ''

      // 優先嘗試使用 ortho preview API（含偵測結果）
      const previewUrl = getOrthoPreviewUrl(true, 1200, 900)
      console.log('[PDF Export] Preview URL:', previewUrl)

      if (previewUrl) {
        // 嘗試從 API 獲取預覽圖
        try {
          mapImageBase64 = await fetchImageAsBase64(previewUrl)
          console.log('[PDF Export] Got image via preview API')
        } catch (e) {
          console.warn('[PDF Export] Preview API failed:', e)
          // 備用：用 Image 元素
          try {
            mapImageBase64 = await imageUrlToBase64(previewUrl)
            console.log('[PDF Export] Got image via Image element')
          } catch (e2) {
            console.warn('[PDF Export] Image element also failed:', e2)
          }
        }
      }

      // 如果 API 失敗，嘗試截取地圖
      if (!mapImageBase64) {
        console.log('[PDF Export] No preview image, trying map capture...')
        const mapContainer = mapRef.current?.getContainer()
        if (mapContainer) {
          try {
            mapImageBase64 = await captureMapImage(mapContainer)
            console.log('[PDF Export] Got image via map capture')
          } catch (e) {
            console.warn('[PDF Export] Map capture failed:', e)
          }
        }
      }

      console.log('[PDF Export] Final image base64 length:', mapImageBase64.length)

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
        landcoverStats,
        terrainStats,
      })

      notify.success('PDF exported', `${effectiveMetadata.filename.replace(/\.[^/.]+$/, '')}_report.pdf`)
    } catch (error) {
      console.error('[PDF Export] Error:', error)
      notify.error('Export failed', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsExporting(false)
    }
  }, [mapRef, objects, metadata, landcoverStats, terrainStats])

  return {
    exportPdf,
    isExporting,
    canExport: objects.length > 0,
  }
}
