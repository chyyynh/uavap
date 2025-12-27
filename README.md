# UAV AIP Dashboard

無人機自動巡檢平台 (UAV Automated Inspection Platform) - 物件偵測與土地覆蓋分析儀表板

## 技術架構

### 前端

- **Framework**: TanStack React Start + Router
- **UI**: Base-UI + shadcn/ui 風格元件
- **Styling**: Tailwind CSS v4
- **Map**: react-leaflet
- **State**: TanStack Query

### 後端 (HuggingFace Spaces)

- **Framework**: FastAPI
- **Hosting**: HuggingFace Spaces (Docker)
- **Models**: HuggingFace Hub

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

### 1. 安裝依賴

```bash
cd frontend
pnpm install
```

### 2. 啟動開發伺服器

```bash
pnpm dev
```

### 3. 開啟瀏覽器

前往 http://localhost:3000

預設會連接 HuggingFace Spaces API：`https://chyyynh-uav-detection-api.hf.space`

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

| 端點                  | 方法 | 說明                   |
| --------------------- | ---- | ---------------------- |
| `/api/ortho/bounds`   | GET  | 取得影像邊界 (WGS84)   |
| `/api/ortho/image`    | GET  | 取得完整正射影像 (PNG) |
| `/api/ortho/preview`  | GET  | 取得縮圖預覽           |
| `/api/ortho/metadata` | GET  | 取得 TIFF 元資料       |

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

| 端點                       | 方法 | 說明                  |
| -------------------------- | ---- | --------------------- |
| `/api/terrain/status`      | GET  | DSM 載入狀態          |
| `/api/terrain/stats`       | GET  | 地形統計 (坡度、坡向) |
| `/api/terrain/point?x=&y=` | GET  | 指定座標的地形資訊    |

### 土地覆蓋 (UPerNet)

| 端點                               | 方法 | 說明                        |
| ---------------------------------- | ---- | --------------------------- |
| `/api/landcover/status`            | GET  | 土地覆蓋計算狀態            |
| `/api/landcover/stats`             | GET  | 各類別統計 (像素數、百分比) |
| `/api/landcover/image`             | GET  | 彩色分割圖 (PNG)            |
| `/api/landcover/overlay?alpha=0.5` | GET  | 正射影像疊加分割圖          |
| `/api/landcover/run`               | POST | 單獨執行土地覆蓋偵測        |

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
├── frontend/              # React 前端
│   └── src/
│       ├── api/           # TanStack Query hooks
│       ├── components/    # UI 元件
│       ├── contexts/      # React Context
│       └── routes/        # 頁面路由
├── hf-space/              # HuggingFace Spaces 後端
│   ├── app.py             # FastAPI 應用
│   ├── Dockerfile         # Docker 設定
│   └── requirements.txt   # Python 依賴
├── model/                 # 模型權重 (本地)
└── notebooks/             # Jupyter notebooks
```

## 檔案需求

根據選擇的任務選項，需要上傳不同的檔案：

| 任務選項       | 需要的檔案                                  |
| -------------- | ------------------------------------------- |
| 基本物件偵測   | `odm_orthophoto.tif`                        |
| + 高程與高度   | + `dsm.tif` + `odm_georeferenced_model.laz` |
| + 地表變化偵測 | + `dsm.tif` (土地覆蓋使用 UPerNet)          |

## License

MIT
