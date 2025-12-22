# UAV AIP Dashboard

無人機自動巡檢平台 (UAV Automated Inspection Platform) - 物件偵測視覺化儀表板

## 功能特色

- 🗺️ **互動式地圖** - 基於 Leaflet 的地圖，顯示偵測物件標記
- 📊 **即時統計** - 顯示人員、車輛、角錐等物件數量
- 📋 **屬性表格** - 類似 QGIS 的屬性表，支援篩選與點選同步
- 🎛️ **圖層控制** - 可切換顯示不同類別的偵測結果
- ⚡ **處理模擬** - 展示偵測任務的執行進度
- 🔗 **API 整合** - 支援連接 Colab 後端進行即時推論

## 技術架構

### 前端

- **Framework**: TanStack React Start + Router
- **UI**: Base-UI + shadcn/ui 風格元件
- **Styling**: Tailwind CSS v4
- **Map**: react-leaflet
- **State**: TanStack Query

### 後端 (Colab)

- **Framework**: FastAPI
- **Tunnel**: Cloudflare Tunnel (trycloudflare.com)

## 快速開始

### 1. 安裝依賴

```bash
pnpm install
```

### 2. 啟動開發伺服器

```bash
pnpm dev
```

### 3. 開啟瀏覽器

前往 http://localhost:3000

## 連接 Colab API

### Step 1: 在 Colab 執行安裝

```python
!pip install fastapi uvicorn -q
!wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
!dpkg -i cloudflared-linux-amd64.deb
```

### Step 2: 執行 API 伺服器

複製 `colab_server_example.py` 的內容到 Colab 執行，會取得一個公開網址：

```
🚀 API 伺服器已啟動！
📡 公開網址: https://xxx-xxx.trycloudflare.com
```

### Step 3: 設定前端 API 網址

修改 `src/api/queries.ts` 第 17 行：

```typescript
const API_BASE_URL: string | null = 'https://xxx-xxx.trycloudflare.com'
```

### Step 4: 重新啟動前端

```bash
pnpm dev
```

## API 端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/` | GET | 健康檢查 |
| `/api/projects` | GET | 取得專案列表 |
| `/api/gpu/status` | GET | 取得 GPU 狀態 |
| `/api/detections/{project_id}` | GET | 取得偵測結果 |

## 專案結構

```
src/
├── api/
│   ├── queries.ts          # TanStack Query hooks
│   └── mock-data.ts        # 模擬資料
├── components/
│   ├── dashboard/          # Dashboard 元件
│   │   ├── DashboardLayout.tsx
│   │   ├── Topbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── MapView.tsx
│   │   ├── LayerPanel.tsx
│   │   └── ...
│   └── ui/                 # 通用 UI 元件
├── hooks/
│   ├── use-processing.ts
│   ├── use-task-options.ts
│   └── use-layer-visibility.ts
├── types/
│   └── detection.ts        # TypeScript 型別定義
└── routes/
    └── index.tsx           # Dashboard 頁面
```

## 開發模式 vs 生產模式

- **開發模式**: `API_BASE_URL = null`，使用內建 mock 資料
- **生產模式**: `API_BASE_URL = 'https://...'`，連接真實 API

## License

MIT
