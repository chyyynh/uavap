---
title: UAV Object Detection API
emoji: 🛩️
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
license: mit
---

# UAV Object Detection API

Detect objects (vehicles, persons, cones) in orthophoto images using YOLO.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/docs` | GET | Swagger UI |
| `/api/upload` | POST | Upload TIFF/LAZ file |
| `/api/process` | POST | Start detection |
| `/api/process/{job_id}/status` | GET | Get job status |
| `/api/detections/{project_id}` | GET | Get detection results |
| `/api/ortho/bounds` | GET | Get image bounds |
| `/api/ortho/preview` | GET | Get preview image |
| `/api/export/stats` | GET | Export statistics |
| `/api/export/pdf` | GET | Export PDF report |
| `/api/export/gpkg` | GET | Export GeoPackage |

## Usage

```python
import requests

# Upload image
with open("ortho.tif", "rb") as f:
    r = requests.post("https://YOUR-SPACE.hf.space/api/upload", files={"file": f})

# Start detection
r = requests.post("https://YOUR-SPACE.hf.space/api/process", json={
    "detect_person": True,
    "detect_vehicle": True,
    "detect_cone": True
})
job_id = r.json()["job_id"]

# Poll status
r = requests.get(f"https://YOUR-SPACE.hf.space/api/process/{job_id}/status")
```
