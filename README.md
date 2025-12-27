# UAV AIP Dashboard

無人機自動巡檢平台 (UAV Automated Inspection Platform) - 物件偵測與土地覆蓋分析儀表板

## 功能特色

- **物件偵測** - YOLO 模型偵測人員、車輛、交通錐
- **土地覆蓋分析** - UPerNet 語意分割 (樹木、道路、建物等 6 類)
- **地形分析** - DSM 計算坡度、坡向統計
- **高程估算** - 點雲資料計算物件高度
- **PDF 報告匯出** - 含圓餅圖、土地覆蓋圖、面積統計
- **互動式地圖** - 多圖層切換、物件標註

## 技術架構

### 前端

- **Framework**: TanStack React Start + Router
- **UI**: Base-UI + shadcn/ui 風格元件
- **Styling**: Tailwind CSS v4
- **Map**: react-leaflet
- **State**: TanStack Query
- **PDF**: jspdf + jspdf-autotable

### 後端

- **Framework**: FastAPI
- **Hosting**: HuggingFace Spaces (Docker) 或 Google Colab (GPU)
- **Models**: HuggingFace Hub
- **圖片優化**: JPEG/PNG 壓縮 + HTTP 快取

## HuggingFace 資源

| 資源          | 連結                                                                                 | 說明                    |
| ------------- | ------------------------------------------------------------------------------------ | ----------------------- |
| **API Space** | [chyyynh/uav-detection-api](https://huggingface.co/spaces/chyyynh/uav-detection-api) | FastAPI 後端服務        |
| **Models**    | [chyyynh/uav-yolo-models](https://huggingface.co/chyyynh/uav-yolo-models)            | YOLO + UPerNet 模型權重 |

### 模型清單

| 模型               | 用途                              | 大小   |
| ------------------ | --------------------------------- | ------ |
| `vehicle.pt`       | 車輛偵測 (YOLO)                   | ~6MB   |
| `human.pt`         | 人員偵測 (YOLO)                   | ~6MB   |
| `cone.pt`          | 交通錐偵測 (YOLO)                 | ~6MB   |
| `UPerNet_best.pth` | 土地覆蓋分割 (UPerNet + ResNet50) | ~149MB |

## 快速開始

### 方式一：使用 HuggingFace Spaces (CPU)

```bash
cd frontend
pnpm install
pnpm dev
```

前往 http://localhost:3000，預設連接 `https://chyyynh-uav-detection-api.hf.space`

### 方式二：使用 Google Colab (GPU，推薦)

1. 開啟 `notebooks/uavap_colab.ipynb`
2. 執行所有 Cell，等待 Cloudflare Tunnel URL
3. 在前端 Dashboard 貼上 URL 連線

> Colab GPU 版本推論速度更快，適合大型正射影像

## API 端點

### 基本

| 端點              | 方法 | 說明          |
| ----------------- | ---- | ------------- |
| `/`               | GET  | 健康檢查      |
| `/api/projects`   | GET  | 取得專案列表  |
| `/api/gpu/status` | GET  | 取得 GPU 狀態 |

### 上傳

| 端點              | 方法 | 說明                             |
| ----------------- | ---- | -------------------------------- |
| `/api/upload`     | POST | 上傳正射影像 (TIFF) 或點雲 (LAZ) |
| `/api/upload/dsm` | POST | 上傳 DSM (GeoTIFF)               |

### 正射影像

| 端點                  | 方法 | 參數                      | 說明                             |
| --------------------- | ---- | ------------------------- | -------------------------------- |
| `/api/ortho/bounds`   | GET  | -                         | 取得影像邊界 (WGS84)             |
| `/api/ortho/image`    | GET  | `max_width`, `quality=85` | 取得正射影像 (JPEG，含壓縮快取)  |
| `/api/ortho/preview`  | GET  | `width`, `height`, `quality` | 取得縮圖預覽 (JPEG)           |
| `/api/ortho/metadata` | GET  | -                         | 取得 TIFF 元資料 (含 pixel_w/h)  |

### 處理任務

| 端點                           | 方法 | 說明             |
| ------------------------------ | ---- | ---------------- |
| `/api/process`                 | POST | 啟動處理任務     |
| `/api/process/status`          | GET  | 取得目前處理狀態 |
| `/api/process/{job_id}/status` | GET  | 取得指定任務狀態 |
| `/api/detections/{project_id}` | GET  | 取得偵測結果     |

#### ProcessingRequest 參數

```json
{
  "project_id": "current",
  "detect_person": true,
  "detect_vehicle": true,
  "detect_cone": true,
  "include_elevation": true,
  "include_terrain": false,
  "include_landcover": false
}
```

### 地形分析

| 端點                  | 方法 | 參數         | 說明                          |
| --------------------- | ---- | ------------ | ----------------------------- |
| `/api/terrain/status` | GET  | -            | DSM 載入狀態                  |
| `/api/terrain/stats`  | GET  | -            | 地形統計 (坡度、坡向)         |
| `/api/terrain/slope`  | GET  | `max_width`  | 坡度彩色圖 (PNG，terrain cmap)|
| `/api/terrain/aspect` | GET  | `max_width`  | 坡向彩色圖 (PNG，HSV cmap)    |
| `/api/terrain/run`    | POST | -            | 執行地形分析                  |

### 土地覆蓋 (UPerNet)

| 端點                   | 方法 | 參數                            | 說明                        |
| ---------------------- | ---- | ------------------------------- | --------------------------- |
| `/api/landcover/status`| GET  | -                               | 土地覆蓋計算狀態            |
| `/api/landcover/stats` | GET  | -                               | 各類別統計 (像素數、百分比) |
| `/api/landcover/image` | GET  | `max_width`                     | 彩色分割圖 (PNG，含快取)    |
| `/api/landcover/overlay`| GET | `alpha=0.5`, `max_width`, `quality` | 正射影像疊加分割圖 (JPEG) |
| `/api/landcover/run`   | POST | -                               | 單獨執行土地覆蓋偵測        |

#### 土地覆蓋類別

| ID  | 類別               | 顏色 (RGB)      |
| --- | ------------------ | --------------- |
| 0   | bare-ground (裸地) | [222, 184, 135] |
| 1   | tree (樹木)        | [34, 139, 34]   |
| 2   | road (道路)        | [128, 128, 128] |
| 3   | pavement (鋪面)    | [178, 34, 34]   |
| 4   | grass (草地)       | [124, 252, 0]   |
| 5   | building (建物)    | [255, 140, 0]   |

### 匯出

| 端點                | 方法 | 說明              |
| ------------------- | ---- | ----------------- |
| `/api/export/stats` | GET  | 匯出偵測統計 JSON |

## 專案結構

```
uavap/
├── frontend/                  # React 前端
│   └── src/
│       ├── api/               # TanStack Query hooks
│       ├── components/        # UI 元件
│       │   ├── dashboard/     # Dashboard 專用元件
│       │   └── ui/            # 通用 UI 元件
│       ├── hooks/             # Custom hooks (PDF export 等)
│       ├── lib/               # 工具函式 (PDF generator)
│       ├── types/             # TypeScript 型別定義
│       └── routes/            # 頁面路由
├── hf-space/                  # HuggingFace Spaces 後端
│   ├── app.py                 # FastAPI 應用 (CPU 版)
│   ├── Dockerfile             # Docker 設定
│   └── requirements.txt       # Python 依賴
├── notebooks/
│   └── uavap_colab.ipynb      # Colab GPU 版 API
└── model/                     # 模型權重 (本地開發用)
```

## 檔案需求

根據選擇的任務選項，需要上傳不同的檔案：

| 任務選項       | 需要的檔案                                  |
| -------------- | ------------------------------------------- |
| 基本物件偵測   | `odm_orthophoto.tif`                        |
| + 高程與高度   | + `dsm.tif` + `odm_georeferenced_model.laz` |
| + 地形分析     | + `dsm.tif` (計算坡度、坡向)                |
| + 土地覆蓋     | (使用正射影像，UPerNet 分割)                |

## 圖片優化

所有圖片端點已優化以提升載入速度：

| 圖片類型     | 格式 | 優化策略                                |
| ------------ | ---- | --------------------------------------- |
| 正射影像     | JPEG | `quality` 參數 (1-95)，LANCZOS 縮放     |
| 土地覆蓋遮罩 | PNG  | NEAREST 重採樣 (保留類別值)             |
| 地形圖       | PNG  | NEAREST 重採樣 + colormap               |
| 所有端點     | -    | `Cache-Control: public, max-age=3600`   |

## License

MIT
