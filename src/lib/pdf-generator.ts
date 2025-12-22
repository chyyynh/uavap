import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { DetectionObject, TiffMetadata } from '@/types/detection'

interface PdfReportOptions {
  metadata: TiffMetadata
  mapImageBase64: string
  objects: DetectionObject[]
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
  const { metadata, mapImageBase64, objects } = options
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

  if (mapImageBase64) {
    const imgWidth = contentWidth
    const imgHeight = 80 // 固定高度

    // 圖片邊框
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.5)
    doc.rect(margin, yPos, imgWidth, imgHeight)

    try {
      doc.addImage(mapImageBase64, 'PNG', margin, yPos, imgWidth, imgHeight)
    } catch (e) {
      // 如果圖片添加失敗，顯示佔位符
      doc.setFillColor(248, 250, 252)
      doc.rect(margin, yPos, imgWidth, imgHeight, 'F')
      doc.setTextColor(148, 163, 184)
      doc.setFontSize(10)
      doc.text('Map image unavailable', margin + imgWidth / 2 - 20, yPos + imgHeight / 2)
    }

    yPos += imgHeight + 10
  }

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

  // ============================================
  // 頁腳
  // ============================================
  const footerY = pageHeight - 10
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(8)
  doc.text('UAV Automated Inspection Platform', margin, footerY)
  doc.text(`Page 1`, pageWidth - margin - 10, footerY)

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

  // 等待一下確保 tiles 載入
  await new Promise((resolve) => setTimeout(resolve, 500))

  const canvas = await html2canvas(mapContainer, {
    useCORS: true,
    allowTaint: false, // 改為 false 避免跨域問題
    backgroundColor: '#1e293b',
    scale: 2,
    logging: false,
    imageTimeout: 15000,
    onclone: (clonedDoc) => {
      // 移除可能造成問題的元素
      const clonedContainer = clonedDoc.body.querySelector('.leaflet-container')
      if (clonedContainer) {
        // 移除控制項避免干擾
        clonedContainer.querySelectorAll('.leaflet-control-container').forEach((el) => {
          (el as HTMLElement).style.display = 'none'
        })
      }
    },
  })

  return canvas.toDataURL('image/png')
}
