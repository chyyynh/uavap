import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { DetectionObject, TiffMetadata, LandcoverStats, TerrainStats } from '@/types/detection'

interface PdfReportOptions {
  metadata: TiffMetadata
  mapImageBase64: string
  objects: DetectionObject[]
  landcoverStats?: LandcoverStats | null
  terrainStats?: TerrainStats | null
  landcoverImageBase64?: string | null
}

// Landcover color mapping
const LANDCOVER_COLORS: Record<string, string> = {
  'bare-ground': '#deb887',
  'tree': '#228b22',
  'road': '#808080',
  'pavement': '#b22222',
  'grass': '#7cfc00',
  'building': '#ff8c00',
}

const LANDCOVER_LABELS: Record<string, string> = {
  'bare-ground': 'Bare Ground',
  'tree': 'Tree',
  'road': 'Road',
  'pavement': 'Pavement',
  'grass': 'Grass',
  'building': 'Building',
}

/**
 * Generate pie chart SVG for landcover distribution
 */
function generatePieChartSvg(
  data: Array<{ name: string; value: number; fill: string }>,
  width: number,
  height: number
): string {
  const cx = width / 2
  const cy = height / 2 - 20 // Leave space for legend at bottom
  const radius = Math.min(cx, cy) - 10

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`
  svg += `<rect width="${width}" height="${height}" fill="white"/>`

  // Title
  svg += `<text x="${cx}" y="20" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#1e293b">Land Cover Distribution</text>`

  let startAngle = -90 // Start from top
  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (total === 0) {
    svg += `<text x="${cx}" y="${cy}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#64748b">No data</text>`
    svg += `</svg>`
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
  }

  data.forEach((item) => {
    if (item.value <= 0) return

    const angle = (item.value / total) * 360
    const endAngle = startAngle + angle

    // Convert to radians
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    const x1 = cx + radius * Math.cos(startRad)
    const y1 = cy + radius * Math.sin(startRad)
    const x2 = cx + radius * Math.cos(endRad)
    const y2 = cy + radius * Math.sin(endRad)
    const largeArc = angle > 180 ? 1 : 0

    // Draw arc path
    svg += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${item.fill}" stroke="white" stroke-width="1"/>`

    // Add percentage label in the middle of the arc (for large enough slices)
    if (item.value >= 5) {
      const midAngle = ((startAngle + endAngle) / 2 * Math.PI) / 180
      const labelRadius = radius * 0.65
      const labelX = cx + labelRadius * Math.cos(midAngle)
      const labelY = cy + labelRadius * Math.sin(midAngle)
      svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="10" font-weight="bold" fill="white">${item.value.toFixed(0)}%</text>`
    }

    startAngle = endAngle
  })

  // Legend at bottom
  const legendY = height - 45
  const legendItemWidth = width / Math.min(data.length, 3)
  let row = 0
  data.filter(d => d.value > 0).forEach((item, i) => {
    const col = i % 3
    if (i > 0 && col === 0) row++
    const legendX = 10 + col * legendItemWidth
    const y = legendY + row * 18
    svg += `<rect x="${legendX}" y="${y}" width="12" height="12" fill="${item.fill}" rx="2"/>`
    svg += `<text x="${legendX + 16}" y="${y + 10}" font-family="sans-serif" font-size="10" fill="#374151">${item.name}</text>`
  })

  svg += `</svg>`
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
}

/**
 * Format area with appropriate unit (m² or ha)
 */
function formatArea(areaM2: number): string {
  if (areaM2 >= 10000) {
    return `${(areaM2 / 10000).toFixed(2)} ha`
  }
  return `${areaM2.toFixed(2)} m²`
}

/**
 * 生成簡單的偵測點分佈圖（當地圖截圖失敗時使用）
 */
function generateDetectionVisualization(
  objects: DetectionObject[],
  width: number,
  height: number
): string {
  if (objects.length === 0) return ''

  // 計算邊界
  const lats = objects.map((o) => o.lat).filter((v) => v != null) as number[]
  const lons = objects.map((o) => o.lon).filter((v) => v != null) as number[]

  if (lats.length === 0 || lons.length === 0) return ''

  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)

  // 加一點 padding
  const latRange = (maxLat - minLat) * 1.2 || 0.001
  const lonRange = (maxLon - minLon) * 1.2 || 0.001
  const centerLat = (minLat + maxLat) / 2
  const centerLon = (minLon + maxLon) / 2

  const padding = 20
  const effectiveWidth = width - padding * 2
  const effectiveHeight = height - padding * 2

  // 顏色映射
  const colors: Record<string, string> = {
    person: '#3b82f6',
    vehicle: '#22c55e',
    cone: '#f97316',
  }

  // 生成 SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`
  svg += `<rect width="${width}" height="${height}" fill="#1e293b"/>`

  // 添加網格
  svg += `<g stroke="#334155" stroke-width="0.5">`
  for (let i = 0; i <= 4; i++) {
    const y = padding + (effectiveHeight * i) / 4
    const x = padding + (effectiveWidth * i) / 4
    svg += `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}"/>`
    svg += `<line x1="${x}" y1="${padding}" x2="${x}" y2="${height - padding}"/>`
  }
  svg += `</g>`

  // 繪製點
  objects.forEach((obj) => {
    if (obj.lat == null || obj.lon == null) return

    const x = padding + ((obj.lon - (centerLon - lonRange / 2)) / lonRange) * effectiveWidth
    const y = padding + ((centerLat + latRange / 2 - obj.lat) / latRange) * effectiveHeight
    const color = colors[obj.cls] || '#64748b'

    svg += `<circle cx="${x}" cy="${y}" r="4" fill="${color}" opacity="0.8"/>`
  })

  // 添加圖例
  svg += `<g font-family="sans-serif" font-size="10">`
  let legendY = height - 15
  ;['person', 'vehicle', 'cone'].forEach((cls, i) => {
    const count = objects.filter((o) => o.cls === cls).length
    if (count > 0) {
      const legendX = padding + i * 70
      svg += `<circle cx="${legendX}" cy="${legendY}" r="4" fill="${colors[cls]}"/>`
      svg += `<text x="${legendX + 8}" y="${legendY + 3}" fill="#94a3b8">${cls}: ${count}</text>`
    }
  })
  svg += `</g>`

  svg += `</svg>`

  // 轉換為 base64
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
}

/**
 * 將 SVG data URL 轉換為 PNG data URL
 */
async function convertSvgToPng(svgDataUrl: string, width: number, height: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(null)
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = svgDataUrl
  })
}

/**
 * 格式化日期時間
 */
function formatDateTime(isoString: string | null): string {
  if (!isoString) return 'N/A'
  try {
    const date = new Date(isoString)
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return isoString
  }
}

/**
 * 格式化數值
 */
function fmt(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '—'
  return value.toFixed(decimals)
}

/**
 * 計算統計摘要
 */
function calculateSummary(objects: DetectionObject[]) {
  return {
    total: objects.length,
    person: objects.filter((o) => o.cls === 'person').length,
    vehicle: objects.filter((o) => o.cls === 'vehicle').length,
    cone: objects.filter((o) => o.cls === 'cone').length,
  }
}

/**
 * 生成 PDF 報表
 */
export async function generatePdfReport(options: PdfReportOptions): Promise<void> {
  const { metadata, mapImageBase64, objects, landcoverStats, terrainStats, landcoverImageBase64 } = options
  const summary = calculateSummary(objects)

  // 創建 A4 PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2

  let yPos = margin

  // ============================================
  // 標題區塊
  // ============================================
  doc.setFillColor(30, 41, 59) // slate-800
  doc.rect(0, 0, pageWidth, 45, 'F')

  // 主標題
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('UAV Detection Report', margin, 18)

  // 副標題：檔案名稱
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`File: ${metadata.filename}`, margin, 28)

  // 時間資訊
  doc.setFontSize(10)
  doc.setTextColor(200, 200, 200)
  doc.text(`Capture Time: ${formatDateTime(metadata.datetime)}`, margin, 36)

  // 報表生成時間（右上角）
  const reportTime = new Date().toLocaleString('zh-TW')
  doc.setFontSize(8)
  doc.text(`Generated: ${reportTime}`, pageWidth - margin - 50, 36)

  yPos = 55

  // ============================================
  // 摘要統計區塊
  // ============================================
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Detection Summary', margin, yPos)
  yPos += 8

  // 統計卡片
  const cardWidth = (contentWidth - 15) / 4
  const cardHeight = 20
  const summaryItems = [
    { label: 'Total', value: summary.total, color: [100, 116, 139] },
    { label: 'Person', value: summary.person, color: [59, 130, 246] },
    { label: 'Vehicle', value: summary.vehicle, color: [34, 197, 94] },
    { label: 'Cone', value: summary.cone, color: [249, 115, 22] },
  ]

  summaryItems.forEach((item, index) => {
    const x = margin + index * (cardWidth + 5)

    // 卡片背景
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(x, yPos, cardWidth, cardHeight, 2, 2, 'F')

    // 左側色條
    doc.setFillColor(item.color[0], item.color[1], item.color[2])
    doc.rect(x, yPos, 3, cardHeight, 'F')

    // 數值
    doc.setTextColor(30, 41, 59)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(String(item.value), x + 8, yPos + 12)

    // 標籤
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(item.label, x + 8, yPos + 17)
  })

  yPos += cardHeight + 12

  // ============================================
  // 地圖截圖區塊
  // ============================================
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Detection Map', margin, yPos)
  yPos += 5

  const imgWidth = contentWidth
  const imgHeight = 80 // 固定高度

  // 圖片邊框
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.rect(margin, yPos, imgWidth, imgHeight)

  // 準備圖片數據
  let imageToUse = mapImageBase64
  let imageAdded = false

  console.log('[PDF Generator] mapImageBase64 length:', mapImageBase64?.length || 0)

  // 如果沒有地圖圖片或圖片太小（可能是空的），使用備用視覺化
  if (!mapImageBase64 || mapImageBase64.length < 1000) {
    console.log('[PDF Generator] Map image invalid or too small, generating visualization')
    imageToUse = generateDetectionVisualization(objects, imgWidth * 3, imgHeight * 3)
  }

  if (imageToUse && imageToUse.length > 100) {
    console.log('[PDF Generator] Adding image, prefix:', imageToUse.substring(0, 50))

    try {
      // 判斷格式
      let imageFormat: 'PNG' | 'JPEG' = 'PNG'
      let finalImage = imageToUse

      if (imageToUse.startsWith('data:image/jpeg')) {
        imageFormat = 'JPEG'
      } else if (imageToUse.startsWith('data:image/svg')) {
        // jsPDF 不直接支援 SVG，需要先轉換為 PNG
        console.log('[PDF Generator] Converting SVG to PNG...')
        const svgToPng = await convertSvgToPng(imageToUse, imgWidth * 3, imgHeight * 3)
        if (svgToPng) {
          finalImage = svgToPng
          imageFormat = 'PNG'
          console.log('[PDF Generator] SVG converted, new length:', finalImage.length)
        } else {
          throw new Error('SVG conversion failed')
        }
      }

      // 確保圖片數據是有效的
      if (!finalImage.startsWith('data:image/')) {
        throw new Error('Invalid image data format')
      }

      doc.addImage(finalImage, imageFormat, margin, yPos, imgWidth, imgHeight)
      console.log('[PDF Generator] Image added successfully')
      imageAdded = true
    } catch (e) {
      console.error('[PDF Generator] addImage error:', e)
      // 嘗試使用備用視覺化
      if (!imageToUse.startsWith('data:image/svg')) {
        console.log('[PDF Generator] Trying fallback visualization...')
        const fallback = generateDetectionVisualization(objects, imgWidth * 3, imgHeight * 3)
        if (fallback) {
          try {
            const fallbackPng = await convertSvgToPng(fallback, imgWidth * 3, imgHeight * 3)
            if (fallbackPng) {
              doc.addImage(fallbackPng, 'PNG', margin, yPos, imgWidth, imgHeight)
              console.log('[PDF Generator] Fallback image added successfully')
              imageAdded = true
            }
          } catch (e2) {
            console.error('[PDF Generator] Fallback also failed:', e2)
          }
        }
      }
    }
  }

  // 如果圖片添加失敗，顯示佔位符
  if (!imageAdded) {
    console.log('[PDF Generator] Showing placeholder')
    doc.setFillColor(248, 250, 252)
    doc.rect(margin, yPos, imgWidth, imgHeight, 'F')
    doc.setTextColor(148, 163, 184)
    doc.setFontSize(10)
    doc.text('Map image unavailable', margin + imgWidth / 2 - 20, yPos + imgHeight / 2)
  }

  yPos += imgHeight + 10

  // ============================================
  // 詳細資料表格
  // ============================================
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Detection Statistics', margin, yPos)
  yPos += 5

  // 使用 autoTable 生成表格
  autoTable(doc, {
    startY: yPos,
    head: [[
      'ID',
      'Class',
      'Score',
      'Latitude',
      'Longitude',
      'Elev (m)',
      'Height (m)',
      'Area (m²)',
    ]],
    body: objects.map((obj) => [
      obj.id,
      obj.cls,
      fmt(obj.score, 3),
      fmt(obj.lat, 6),
      fmt(obj.lon, 6),
      fmt(obj.elev_z, 2),
      fmt(obj.height_m, 2),
      fmt(obj.area_m2, 2),
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 18 },
      2: { cellWidth: 16 },
      3: { cellWidth: 28 },
      4: { cellWidth: 28 },
      5: { cellWidth: 18 },
      6: { cellWidth: 20 },
      7: { cellWidth: 20 },
    },
    margin: { left: margin, right: margin },
    styles: {
      cellPadding: 2,
      overflow: 'ellipsize',
    },
  })

  // Get the final Y position after the table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currentY = (doc as any).lastAutoTable?.finalY || yPos + 50

  // ============================================
  // Landcover Statistics (if available)
  // ============================================
  if (landcoverStats?.stats && Object.keys(landcoverStats.stats).length > 0) {
    // Always start landcover on a new page for better layout
    doc.addPage()
    currentY = margin

    // Section header with green background
    doc.setFillColor(34, 139, 34) // Forest green
    doc.rect(0, 0, pageWidth, 35, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Land Cover Analysis', margin, 22)
    currentY = 45

    // Calculate pixel area (default to 5cm = 0.05m resolution if not available)
    const pixelW = metadata.pixel_w || 0.05
    const pixelH = metadata.pixel_h || 0.05
    const pixelArea = pixelW * pixelH // m² per pixel

    // Show resolution info
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Resolution: ${(pixelW * 100).toFixed(1)}cm x ${(pixelH * 100).toFixed(1)}cm per pixel`, margin, currentY)
    currentY += 8

    // === Pie Chart (left side) ===
    const chartWidth = 80
    const chartHeight = 90

    // Prepare pie chart data
    const pieData = Object.entries(landcoverStats.stats)
      .filter(([_, v]) => v.percentage > 0)
      .sort((a, b) => b[1].percentage - a[1].percentage)
      .map(([name, v]) => ({
        name: LANDCOVER_LABELS[name] || name,
        value: v.percentage,
        fill: LANDCOVER_COLORS[name] || '#888888',
      }))

    // Generate and add pie chart
    const pieSvg = generatePieChartSvg(pieData, chartWidth * 3, chartHeight * 3)
    try {
      const piePng = await convertSvgToPng(pieSvg, chartWidth * 3, chartHeight * 3)
      if (piePng) {
        doc.addImage(piePng, 'PNG', margin, currentY, chartWidth, chartHeight)
        console.log('[PDF Generator] Pie chart added successfully')
      }
    } catch (e) {
      console.warn('[PDF Generator] Pie chart generation failed:', e)
    }

    // === Landcover Image (right side) ===
    if (landcoverImageBase64) {
      const imgX = margin + chartWidth + 10
      const imgWidth = contentWidth - chartWidth - 10
      const imgHeight = chartHeight

      // Image border
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.5)
      doc.rect(imgX, currentY, imgWidth, imgHeight)

      try {
        doc.addImage(landcoverImageBase64, 'PNG', imgX, currentY, imgWidth, imgHeight)
        console.log('[PDF Generator] Landcover image added successfully')
      } catch (e) {
        console.warn('[PDF Generator] Landcover image failed:', e)
        // Show placeholder
        doc.setFillColor(248, 250, 252)
        doc.rect(imgX, currentY, imgWidth, imgHeight, 'F')
        doc.setTextColor(148, 163, 184)
        doc.setFontSize(10)
        doc.text('Landcover image unavailable', imgX + 20, currentY + imgHeight / 2)
      }
    }

    currentY += chartHeight + 10

    // === Area Statistics Table ===
    doc.setTextColor(30, 41, 59)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Coverage Statistics', margin, currentY)
    currentY += 5

    // Prepare table data with area calculation
    const landcoverTableData = Object.entries(landcoverStats.stats)
      .filter(([_, value]) => value.percentage > 0)
      .sort((a, b) => b[1].percentage - a[1].percentage)
      .map(([name, value]) => {
        const areaM2 = value.pixels * pixelArea
        return [
          LANDCOVER_LABELS[name] || name,
          value.pixels.toLocaleString(),
          `${value.percentage.toFixed(2)}%`,
          formatArea(areaM2),
        ]
      })

    // Add total row
    const totalPixels = Object.values(landcoverStats.stats).reduce((sum, v) => sum + v.pixels, 0)
    const totalAreaM2 = totalPixels * pixelArea
    landcoverTableData.push([
      'Total',
      totalPixels.toLocaleString(),
      '100.00%',
      formatArea(totalAreaM2),
    ])

    autoTable(doc, {
      startY: currentY,
      head: [['Class', 'Pixels', 'Percentage', 'Area']],
      body: landcoverTableData,
      theme: 'striped',
      headStyles: {
        fillColor: [34, 139, 34], // Forest green for landcover
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 40, halign: 'right' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 40, halign: 'right' },
      },
      margin: { left: margin, right: margin },
      styles: {
        cellPadding: 3,
      },
      // Style the last row (Total) differently
      didParseCell: (data) => {
        if (data.row.index === landcoverTableData.length - 1) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [226, 232, 240]
        }
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = (doc as any).lastAutoTable?.finalY || currentY + 40
  }

  // ============================================
  // Terrain Statistics (if available)
  // ============================================
  if (terrainStats) {
    // Check if we need a new page
    if (currentY > pageHeight - 100) {
      doc.addPage()
      currentY = margin
    } else {
      currentY += 10
    }

    doc.setTextColor(30, 41, 59)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Terrain Analysis', margin, currentY)
    currentY += 8

    // Elevation statistics
    if (terrainStats.elevation) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Elevation', margin, currentY)
      currentY += 5

      const elevData = [
        ['Minimum', `${fmt(terrainStats.elevation.min, 1)} m`],
        ['Maximum', `${fmt(terrainStats.elevation.max, 1)} m`],
        ['Mean', `${fmt(terrainStats.elevation.mean, 1)} m`],
        ['Std Dev', `${fmt(terrainStats.elevation.std, 2)} m`],
      ]

      autoTable(doc, {
        startY: currentY,
        body: elevData,
        theme: 'plain',
        bodyStyles: {
          fontSize: 8,
          textColor: [51, 65, 85],
        },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'bold' },
          1: { cellWidth: 40, halign: 'right' },
        },
        margin: { left: margin, right: margin },
        styles: {
          cellPadding: 2,
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentY = (doc as any).lastAutoTable?.finalY || currentY + 30
    }

    // Slope distribution
    if (terrainStats.slope?.distribution) {
      currentY += 5
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Slope Distribution', margin, currentY)
      currentY += 5

      const SLOPE_LABELS: Record<string, string> = {
        flat: 'Flat (0-5°)',
        gentle: 'Gentle (5-15°)',
        moderate: 'Moderate (15-30°)',
        steep: 'Steep (30°+)',
      }

      const slopeData = Object.entries(terrainStats.slope.distribution)
        .map(([name, value]) => [
          SLOPE_LABELS[name] || name,
          `${value.percentage.toFixed(1)}%`,
        ])

      autoTable(doc, {
        startY: currentY,
        body: slopeData,
        theme: 'plain',
        bodyStyles: {
          fontSize: 8,
          textColor: [51, 65, 85],
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 30, halign: 'right' },
        },
        margin: { left: margin, right: margin },
        styles: {
          cellPadding: 2,
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentY = (doc as any).lastAutoTable?.finalY || currentY + 30
    }

    // Aspect distribution
    if (terrainStats.aspect?.distribution) {
      currentY += 5
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Aspect Distribution', margin, currentY)
      currentY += 5

      const aspectOrder = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
      const aspectData = aspectOrder.map((dir) => [
        dir,
        `${(terrainStats.aspect.distribution[dir]?.percentage || 0).toFixed(1)}%`,
      ])

      autoTable(doc, {
        startY: currentY,
        body: aspectData,
        theme: 'plain',
        bodyStyles: {
          fontSize: 8,
          textColor: [51, 65, 85],
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 30, halign: 'right' },
        },
        margin: { left: margin, right: margin },
        styles: {
          cellPadding: 2,
        },
        tableWidth: 80,
      })
    }
  }

  // ============================================
  // 頁腳 (add to all pages)
  // ============================================
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const footerY = pageHeight - 10
    doc.setTextColor(148, 163, 184)
    doc.setFontSize(8)
    doc.text('UAV Automated Inspection Platform', margin, footerY)
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, footerY)
  }

  // ============================================
  // 下載 PDF
  // ============================================
  const filename = metadata.filename.replace(/\.[^/.]+$/, '') // 移除副檔名
  doc.save(`${filename}_report.pdf`)
}

/**
 * 將 Leaflet 地圖截圖轉為 Base64
 */
export async function captureMapImage(
  mapContainer: HTMLElement
): Promise<string> {
  const html2canvas = (await import('html2canvas')).default

  console.log('[Map Capture] Starting capture, container size:', mapContainer.offsetWidth, 'x', mapContainer.offsetHeight)

  // 等待一下確保 tiles 載入
  await new Promise((resolve) => setTimeout(resolve, 500))

  const canvas = await html2canvas(mapContainer, {
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#1e293b',
    scale: 2,
    logging: true, // Enable logging for debugging
    imageTimeout: 15000,
    ignoreElements: (element) => {
      // 忽略可能造成問題的元素
      if (element.classList?.contains('leaflet-control-container')) return true
      if (element.tagName === 'STYLE') return true
      return false
    },
    onclone: (clonedDoc) => {
      // 移除所有 oklch 顏色（html2canvas 不支援）
      const allElements = clonedDoc.querySelectorAll('*')
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement
        const style = htmlEl.style
        if (style) {
          // 清除可能含有 oklch 的樣式
          const computedStyle = window.getComputedStyle(el)
          if (computedStyle.backgroundColor?.includes('oklch')) {
            style.backgroundColor = '#1e293b'
          }
          if (computedStyle.color?.includes('oklch')) {
            style.color = '#ffffff'
          }
          if (computedStyle.borderColor?.includes('oklch')) {
            style.borderColor = '#374151'
          }
        }
      })

      // 移除控制項
      clonedDoc.querySelectorAll('.leaflet-control-container').forEach((el) => {
        (el as HTMLElement).style.display = 'none'
      })
    },
  })

  console.log('[Map Capture] Canvas created:', canvas.width, 'x', canvas.height)

  // 檢查 canvas 是否為空（全部是背景色）
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const imageData = ctx.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height))
    const pixels = imageData.data
    let nonBackgroundPixels = 0
    for (let i = 0; i < pixels.length; i += 4) {
      // 檢查是否不是背景色 (#1e293b = 30, 41, 59)
      if (pixels[i] !== 30 || pixels[i + 1] !== 41 || pixels[i + 2] !== 59) {
        nonBackgroundPixels++
      }
    }
    console.log('[Map Capture] Non-background pixels in sample:', nonBackgroundPixels, '/', pixels.length / 4)
  }

  const dataUrl = canvas.toDataURL('image/png')
  console.log('[Map Capture] Data URL length:', dataUrl.length, 'prefix:', dataUrl.substring(0, 30))

  return dataUrl
}
