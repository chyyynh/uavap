# UAV AIP Dashboard

UAV Automated Inspection Platform (UAV AIP) dashboard.

## Highlights

- Object detection: YOLO models for person, vehicle, cone
- Land cover analysis: UPerNet segmentation
- Terrain analysis: DSM slope/aspect statistics
- Height estimation: point cloud/DSM-based object height
- Report export: PDF/summary outputs
- Interactive map: multi-layer display with detections

## Tech Stack

### Frontend

- Framework: TanStack React Start + Router
- UI: Base UI + shadcn/ui
- Styling: Tailwind CSS v4
- Map: react-leaflet
- State: TanStack Query
- PDF: jspdf + jspdf-autotable

### Backend

- Framework: FastAPI
- Hosting: HuggingFace Spaces / Local
- Models: HuggingFace Hub
- Image output: JPEG/PNG compression + HTTP cache

## Architecture (Overview)

- `frontend/`: Web UI (React) for uploading data, running tasks, and viewing results on the map.
- `hf-space/`: FastAPI backend that serves APIs, runs inference, and provides map assets.
- Frontend and backend are started separately during development.

## HuggingFace Resources

| Resource | Link | Notes |
| --- | --- | --- |
| API Space | https://huggingface.co/spaces/chyyynh/uav-detection-api | FastAPI backend |
| Models | https://huggingface.co/chyyynh/uav-yolo-models | YOLO + UPerNet models |

### Model List

| Model | Purpose | Size |
| --- | --- | --- |
| vehicle.pt | Vehicle detection (YOLO) | ~6MB |
| human.pt | Person detection (YOLO) | ~6MB |
| cone.pt | Cone detection (YOLO) | ~6MB |
| UPerNet_best.pth | Land cover segmentation (UPerNet) | ~149MB |

## Quick Start

This project has separate frontend and backend services. Start both for local development.

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Default API: `https://chyyynh-uav-detection-api.hf.space`

### Backend (Local)

```bash
cd hf-space
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

## Local paths

Local mode loads data by folder path + filenames, no upload required.

### Folder Layout

```
project_xxx/
  odm_orthophoto.tif
  dsm.tif
  odm_georeferenced_model.laz
  aoi.geojson
```

### Apply on Backend (Required)

After starting the backend, call `/api/upload/local` to load files:

```bash
curl -X POST http://127.0.0.1:8000/api/upload/local   -H "Content-Type: application/json"   -d '{
    "project_dir": "C:\Users\...\UAVAP_DATA\project_002",
    "ortho_name": "odm_orthophoto.tif",
    "dsm_name": "dsm.tif",
    "laz_name": "odm_georeferenced_model.laz",
    "aoi_name": "aoi.geojson"
  }'
```

### Common Issues

- `/api/ortho/bounds` returns `{"error":"No image loaded"}`: wrong path/filename or local paths not applied.
- After backend restart, call `/api/upload/local` again.

## API Endpoints

### Basics

| Endpoint | Method | Description |
| --- | --- | --- |
| `/` | GET | Health check |
| `/api/projects` | GET | Project list |
| `/api/gpu/status` | GET | GPU status |

### Upload

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/upload` | POST | Upload orthophoto/LAZ |
| `/api/upload/dsm` | POST | Upload DSM |
| `/api/upload/aoi` | POST | Upload AOI GeoJSON |
| `/api/upload/local` | POST | Apply local file paths |
| `/api/aoi` | GET | Get AOI metadata |
| `/api/aoi/clear` | POST | Clear AOI |

### Orthophoto

| Endpoint | Method | Params | Description |
| --- | --- | --- | --- |
| `/api/ortho/bounds` | GET | - | Image bounds (WGS84) |
| `/api/ortho/image` | GET | `max_width`, `quality=85` | Orthophoto (JPEG) |
| `/api/ortho/preview` | GET | `width`, `height`, `quality` | Preview (JPEG) |
| `/api/ortho/metadata` | GET | - | TIFF metadata |

### Processing

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/process` | POST | Start processing |
| `/api/process/{job_id}/status` | GET | Processing status |
| `/api/detections/{project_id}` | GET | Detection results |

### AOI Notes

- AOI GeoJSON supports Polygon/MultiPolygon/Point/MultiPoint.
- Point AOI is buffered in image CRS (meters). If the image CRS is geographic, buffering is rejected.
- AOI is reprojected to image CRS for inference, and exported to WGS84 for map display.

## Project Structure

```
uavap/
  frontend/
    src/
      api/
      components/
      hooks/
      lib/
      routes/
      types/
  hf-space/
    app.py
    Dockerfile
    requirements.txt
  notebooks/
```

## Frontend (Detailed)

### Prerequisites

- Node.js + pnpm installed. (If you don’t have pnpm: `npm install -g pnpm`.)

### Install + Run (Dev)

```bash
cd frontend
pnpm install
pnpm dev
```

### Build + Preview

```bash
cd frontend
pnpm build
pnpm preview
```

### Dev vs Build (Short)

- `pnpm dev`: Development server with fast rebuilds and hot reload.
- `pnpm build` + `pnpm preview`: Production build and local preview of the built output.

## Backend (Detailed)

### Prerequisites

- Python (TODO: confirm exact version; typically 3.10+ for FastAPI/Geo stack).

### Create Virtual Environment

```bash
cd hf-space
python -m venv .venv
.\.venv\Scripts\activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run API

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

Default API URL: `http://127.0.0.1:8000`

## Recommended Dev Flow

- Start backend first (API + model loading).
- Start frontend with `pnpm dev`.
- Use this flow for day-to-day development and demos.

## License

MIT
