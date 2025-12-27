"""
UAV Object Detection API - HuggingFace Spaces Version
"""

import threading
import time
import os
import shutil
import io
from pathlib import Path
from datetime import datetime

import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, Response
from pydantic import BaseModel

# ============================================
# FastAPI App
# ============================================
app = FastAPI(title="UAV Object Detection API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# 設定
# ============================================
UPLOAD_DIR = Path("/tmp/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MODEL_DIR = Path("/tmp/models")
MODEL_DIR.mkdir(parents=True, exist_ok=True)

HF_MODEL_REPO = "chyyynh/uav-yolo-models"

def get_model_path(filename: str) -> Path:
    """從 HuggingFace 下載模型"""
    cached_path = MODEL_DIR / filename
    if cached_path.exists():
        return cached_path

    try:
        from huggingface_hub import hf_hub_download
        print(f"[Model] Downloading {filename}...")
        downloaded = hf_hub_download(repo_id=HF_MODEL_REPO, filename=filename)
        return Path(downloaded)
    except Exception as e:
        print(f"[Model] Failed: {e}")
        return cached_path

# ============================================
# YOLO 設定
# ============================================
MODELS_CONFIG = {
    "car": {
        "filename": "vehicle.pt",
        "conf": 0.75,
        "patch_size": 1024,
        "overlap": 850,
        "nms_iou": 0.1,
        "area": (4.0, 25.0),
        "ratio": (1.0, 3.0),
    },
    "person": {
        "filename": "human.pt",
        "conf": 0.60,
        "patch_size": 1024,
        "overlap": 850,
        "nms_iou": 0.1,
        "area": (0.2, 1.0),
        "ratio": (0.5, 2.0),
    },
    "cone": {
        "filename": "cone.pt",
        "conf": 0.60,
        "patch_size": 1024,
        "overlap": 850,
        "nms_iou": 0.1,
        "area": (0.05, 0.5),
        "ratio": (0.8, 1.4),
    },
}

HEIGHT_RANGE = {
    "person": (1.45, 1.90),
    "cone": (0.25, 0.90),
    "car": (1.0, 2.2),
    "vehicle": (1.0, 2.2),
}

HEIGHT_PRIOR = {
    "person": {"mean": 1.70, "std": 0.08},
    "cone": {"mean": 0.45, "std": 0.10},
    "car": {"mean": 1.60, "std": 0.25},
    "vehicle": {"mean": 1.60, "std": 0.25},
}

CELL_BY_CLASS = {"person": 0.05, "cone": 0.05, "car": 0.10}
MIN_PTS_BY_CLASS = {"person": 8, "cone": 10, "car": 30}

rng = np.random.default_rng(42)

# ============================================
# 全域狀態
# ============================================
uploaded_files = {"ortho": None, "laz": None, "dsm": None, "ortho_ref": None, "dsm_ref": None}
ortho_cache = {"src": None, "transform": None, "crs": None, "bounds": None, "width": 0, "height": 0, "pixel_w": 0, "pixel_h": 0}
pointcloud_cache = {"X": None, "Y": None, "Z": None, "loaded": False}
dsm_cache = {"data": None, "transform": None, "crs": None, "loaded": False, "nodata": None}
# 參考期資料（用於變化偵測）
ref_ortho_cache = {"data": None, "transform": None, "loaded": False}
ref_dsm_cache = {"data": None, "transform": None, "loaded": False}
change_detection_cache = {"result": None, "computed": False}
models_cache = {"loaded": False, "models": {}}
processing_state = {"job_id": None, "status": "idle", "progress": 0, "current_step": "", "elapsed_seconds": 0, "results": [], "start_time": None}

# ============================================
# 資料模型
# ============================================
class ProcessingRequest(BaseModel):
    project_id: str = "current"
    detect_person: bool = True
    detect_vehicle: bool = True
    detect_cone: bool = True
    include_elevation: bool = True
    include_terrain: bool = False  # 地形分析（需要 DSM）
    include_change_detection: bool = False  # 地表變化偵測（需要多期資料）

# ============================================
# 核心函式
# ============================================
def load_yolo_models():
    if models_cache["loaded"]:
        return models_cache["models"]

    try:
        from ultralytics import YOLO
    except ImportError:
        print("[Warning] ultralytics not installed")
        return {}

    models = {}
    for cls_name, cfg in MODELS_CONFIG.items():
        model_path = get_model_path(cfg["filename"])
        if model_path.exists():
            try:
                models[cls_name] = YOLO(str(model_path))
                print(f"[YOLO] Loaded: {cls_name}")
            except Exception as e:
                print(f"[YOLO] Failed {cls_name}: {e}")

    models_cache["models"] = models
    models_cache["loaded"] = True
    return models


def run_yolo_detection(classes_to_detect: list[str], progress_callback=None) -> list[dict]:
    import rasterio
    from rasterio.windows import Window
    import torch
    from torchvision.ops import nms

    if ortho_cache["src"] is None:
        raise ValueError("No ortho image loaded")

    src = ortho_cache["src"]
    transform = ortho_cache["transform"]
    width = ortho_cache["width"]
    height = ortho_cache["height"]
    pixel_w = ortho_cache["pixel_w"]
    pixel_h = ortho_cache["pixel_h"]

    models = load_yolo_models()
    if not models:
        raise ValueError("No YOLO models loaded")

    raw_detections = []
    total_classes = len(classes_to_detect)

    for cls_idx, cls_name in enumerate(classes_to_detect):
        if cls_name not in models:
            continue

        model = models[cls_name]
        cfg = MODELS_CONFIG[cls_name]
        patch_size = cfg["patch_size"]
        step = patch_size - cfg["overlap"]

        rows = list(range(0, height, step))
        total_patches = len(rows) * ((width + step - 1) // step)
        patch_count = 0

        for y in rows:
            for x in range(0, width, step):
                win_w = min(patch_size, width - x)
                win_h = min(patch_size, height - y)

                patch = src.read(window=Window(x, y, win_w, win_h))
                patch = np.moveaxis(patch[:3], 0, -1)

                if patch.shape[0] < patch_size or patch.shape[1] < patch_size:
                    padded = np.zeros((patch_size, patch_size, 3), dtype=patch.dtype)
                    padded[:patch.shape[0], :patch.shape[1]] = patch
                    patch = padded

                results = model(patch, conf=cfg["conf"], verbose=False)

                for result in results:
                    boxes = result.boxes
                    if boxes is None:
                        continue
                    for i in range(len(boxes)):
                        bx = boxes.xyxy[i].cpu().numpy()
                        conf = float(boxes.conf[i].cpu())
                        raw_detections.append({
                            "class": cls_name,
                            "conf": conf,
                            "px1": x + bx[0], "py1": y + bx[1],
                            "px2": x + bx[2], "py2": y + bx[3],
                        })

                patch_count += 1
                if progress_callback and patch_count % 10 == 0:
                    progress = 20 + (cls_idx / total_classes) * 50 + (patch_count / total_patches) * (50 / total_classes)
                    progress_callback(int(progress), f"Detecting {cls_name}...")

    print(f"[YOLO] Raw: {len(raw_detections)}")

    # NMS
    final_detections = []
    for cls_name in classes_to_detect:
        if cls_name not in MODELS_CONFIG:
            continue
        cfg = MODELS_CONFIG[cls_name]
        cls_raw = [r for r in raw_detections if r["class"] == cls_name]
        if not cls_raw:
            continue

        boxes = torch.tensor([[r["px1"], r["py1"], r["px2"], r["py2"]] for r in cls_raw])
        scores = torch.tensor([r["conf"] for r in cls_raw])
        keep = nms(boxes, scores, cfg["nms_iou"])
        final_detections.extend([cls_raw[int(i)] for i in keep])

    print(f"[YOLO] After NMS: {len(final_detections)}")

    # OBIA
    records = []
    id_counter = {k: 0 for k in MODELS_CONFIG}

    for r in final_detections:
        cls_name = r["class"]
        cfg = MODELS_CONFIG[cls_name]

        w_m = (r["px2"] - r["px1"]) * pixel_w
        h_m = (r["py2"] - r["py1"]) * pixel_h
        area = w_m * h_m
        aspect = max(w_m, h_m) / (min(w_m, h_m) + 1e-6)

        if not (cfg["area"][0] <= area <= cfg["area"][1]):
            continue
        if not (cfg["ratio"][0] <= aspect <= cfg["ratio"][1]):
            continue

        id_counter[cls_name] += 1
        cx = (r["px1"] + r["px2"]) / 2
        cy = (r["py1"] + r["py2"]) / 2
        gx, gy = transform * (cx, cy)

        records.append({
            "id": id_counter[cls_name],
            "cls": "vehicle" if cls_name == "car" else cls_name,
            "score": round(r["conf"], 3),
            "center_x": round(gx, 2),
            "center_y": round(gy, 2),
            "area_m2": round(area, 2),
            "aspect_rat": round(aspect, 2),
            "px1": r["px1"], "py1": r["py1"],
            "px2": r["px2"], "py2": r["py2"],
            "elev_z": 0.0,
            "height_m": 0.0,
            "lat": 0.0,
            "lon": 0.0,
        })

    print(f"[YOLO] After OBIA: {len(records)}")
    return records


def sample_trunc_normal(mean, std, low, high):
    for _ in range(60):
        v = rng.normal(mean, std)
        if low <= v <= high:
            return float(v)
    return float(rng.uniform(low, high))


def impute_height_by_class(cls_name, h_raw, n_pts, min_pts):
    hmin, hmax = HEIGHT_RANGE.get(cls_name, (0.0, float('inf')))
    prior = HEIGHT_PRIOR.get(cls_name, {"mean": (hmin + hmax) / 2.0, "std": 0.1})

    def draw():
        return sample_trunc_normal(prior["mean"], prior["std"], hmin, hmax)

    if n_pts == 0 or not np.isfinite(h_raw) or h_raw < hmin or h_raw > hmax:
        return draw(), "imputed"
    return float(h_raw), "ok"


def compute_height_volume(detections, progress_callback=None):
    if not pointcloud_cache["loaded"]:
        for det in detections:
            cls = det["cls"] if det["cls"] != "vehicle" else "car"
            h, _ = impute_height_by_class(cls, np.nan, 0, 100)
            det["height_m"] = round(h, 2)
        return detections

    from shapely.geometry import box
    X, Y, Z = pointcloud_cache["X"], pointcloud_cache["Y"], pointcloud_cache["Z"]
    transform = ortho_cache["transform"]

    for det in detections:
        cls = det["cls"] if det["cls"] != "vehicle" else "car"
        px1, py1 = transform * (det["px1"], det["py1"])
        px2, py2 = transform * (det["px2"], det["py2"])
        geom = box(min(px1, px2), min(py1, py2), max(px1, px2), max(py1, py2))

        minx, miny, maxx, maxy = geom.bounds
        m = (X >= minx) & (X <= maxx) & (Y >= miny) & (Y <= maxy)

        if np.any(m):
            zz = Z[m]
            z0 = float(np.percentile(zz, 5))
            ztop = float(np.percentile(zz, 95))
            h_raw = max(0.0, ztop - z0)
            h_fix, _ = impute_height_by_class(cls, h_raw, len(zz), MIN_PTS_BY_CLASS.get(cls, 30))
            det["height_m"] = round(h_fix, 2)
            det["elev_z"] = round(z0, 1)
        else:
            h, _ = impute_height_by_class(cls, np.nan, 0, 100)
            det["height_m"] = round(h, 2)

    return detections


def add_latlon_to_detections(detections):
    if ortho_cache["crs"] is None:
        return detections
    try:
        from pyproj import Transformer
        transformer = Transformer.from_crs(ortho_cache["crs"], "EPSG:4326", always_xy=True)
        for det in detections:
            lon, lat = transformer.transform(det["center_x"], det["center_y"])
            det["lat"] = round(lat, 6)
            det["lon"] = round(lon, 6)
    except Exception as e:
        print(f"[Coord] Error: {e}")
    return detections


def load_ortho_image(tiff_path):
    import rasterio
    src = rasterio.open(tiff_path)
    ortho_cache["src"] = src
    ortho_cache["transform"] = src.transform
    ortho_cache["crs"] = src.crs
    ortho_cache["width"] = src.width
    ortho_cache["height"] = src.height
    ortho_cache["pixel_w"], ortho_cache["pixel_h"] = src.res

    bounds = src.bounds
    try:
        from pyproj import Transformer
        transformer = Transformer.from_crs(src.crs, "EPSG:4326", always_xy=True)
        west, south = transformer.transform(bounds.left, bounds.bottom)
        east, north = transformer.transform(bounds.right, bounds.top)
        ortho_cache["bounds"] = {"north": north, "south": south, "east": east, "west": west}
    except:
        ortho_cache["bounds"] = {"north": bounds.top, "south": bounds.bottom, "east": bounds.right, "west": bounds.left}

    print(f"[Ortho] Loaded: {src.width}x{src.height}")


def load_point_cloud(laz_path):
    import laspy
    las = laspy.read(laz_path)
    pointcloud_cache["X"] = np.asarray(las.x)
    pointcloud_cache["Y"] = np.asarray(las.y)
    pointcloud_cache["Z"] = np.asarray(las.z)
    pointcloud_cache["loaded"] = True
    print(f"[PointCloud] Loaded {len(pointcloud_cache['Z'])} points")


def load_dsm(dsm_path):
    """載入 DSM GeoTIFF"""
    import rasterio
    src = rasterio.open(dsm_path)
    dsm_cache["data"] = src.read(1)  # 讀取第一個 band
    dsm_cache["transform"] = src.transform
    dsm_cache["crs"] = src.crs
    dsm_cache["nodata"] = src.nodata
    dsm_cache["loaded"] = True
    dsm_cache["resolution"] = src.res[0]  # 假設正方形像素
    print(f"[DSM] Loaded: {src.width}x{src.height}, resolution={src.res[0]}m")
    src.close()


def compute_terrain_analysis():
    """計算坡度和坡向"""
    if not dsm_cache["loaded"]:
        return None

    dem = dsm_cache["data"]
    res = dsm_cache["resolution"]
    nodata = dsm_cache["nodata"]

    # 處理 nodata
    if nodata is not None:
        dem = np.where(dem == nodata, np.nan, dem)

    # 計算梯度 (使用 numpy gradient)
    dy, dx = np.gradient(dem, res)

    # 坡度 (degrees)
    slope_rad = np.arctan(np.sqrt(dx**2 + dy**2))
    slope_deg = np.degrees(slope_rad)

    # 坡向 (degrees, 0=North, 90=East, 180=South, 270=West)
    aspect_rad = np.arctan2(-dx, dy)
    aspect_deg = np.degrees(aspect_rad)
    aspect_deg = np.where(aspect_deg < 0, aspect_deg + 360, aspect_deg)

    return {
        "slope": slope_deg,
        "aspect": aspect_deg,
        "stats": {
            "slope_mean": float(np.nanmean(slope_deg)),
            "slope_max": float(np.nanmax(slope_deg)),
            "slope_min": float(np.nanmin(slope_deg)),
        }
    }


def get_terrain_at_point(x, y):
    """取得特定座標的地形資訊"""
    if not dsm_cache["loaded"]:
        return {"elevation": None, "slope": None, "aspect": None}

    transform = dsm_cache["transform"]
    dem = dsm_cache["data"]

    # 座標轉換為像素
    col = int((x - transform.c) / transform.a)
    row = int((y - transform.f) / transform.e)

    if 0 <= row < dem.shape[0] and 0 <= col < dem.shape[1]:
        elev = float(dem[row, col])
        if dsm_cache["nodata"] is not None and elev == dsm_cache["nodata"]:
            elev = None

        # 計算局部坡度
        terrain = compute_terrain_analysis()
        if terrain and elev is not None:
            slope = float(terrain["slope"][row, col])
            aspect = float(terrain["aspect"][row, col])
            return {"elevation": round(elev, 2), "slope": round(slope, 1), "aspect": round(aspect, 1)}

    return {"elevation": None, "slope": None, "aspect": None}


# ============================================
# API 端點
# ============================================
@app.get("/")
async def root():
    return {"status": "ok", "message": "UAV Object Detection API"}


@app.get("/api/projects")
async def get_projects():
    return [{"id": "current", "name": "Current Project"}]


def convert_numpy(obj):
    """Convert numpy types to Python native types for JSON serialization"""
    if isinstance(obj, dict):
        return {k: convert_numpy(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy(v) for v in obj]
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj


@app.get("/api/detections/{project_id}")
async def get_detections(project_id: str):
    return convert_numpy(processing_state["results"] or [])


@app.get("/api/gpu/status")
async def get_gpu_status():
    try:
        import torch
        if torch.cuda.is_available():
            return {"name": torch.cuda.get_device_name(0), "status": "online"}
    except:
        pass
    return {"name": "CPU Mode", "status": "offline"}


@app.get("/api/ortho/bounds")
async def get_ortho_bounds():
    return ortho_cache["bounds"] or {"error": "No image loaded"}


@app.get("/api/ortho/image")
async def get_ortho_image():
    """取得完整正射影像 (PNG)"""
    if ortho_cache["src"] is None:
        raise HTTPException(status_code=404, detail="No image loaded")

    from PIL import Image
    src = ortho_cache["src"]
    data = src.read([1, 2, 3])
    data = np.moveaxis(data, 0, -1)
    if data.dtype != np.uint8:
        data = ((data - data.min()) / (data.max() - data.min() + 1e-6) * 255).astype(np.uint8)

    img = Image.fromarray(data)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return Response(content=buffer.getvalue(), media_type="image/png")


@app.get("/api/ortho/preview")
async def get_ortho_preview(width: int = 800, height: int = 600):
    if ortho_cache["src"] is None:
        raise HTTPException(status_code=404, detail="No image loaded")

    from PIL import Image
    src = ortho_cache["src"]
    data = src.read([1, 2, 3])
    data = np.moveaxis(data, 0, -1)
    if data.dtype != np.uint8:
        data = ((data - data.min()) / (data.max() - data.min() + 1e-6) * 255).astype(np.uint8)

    img = Image.fromarray(data)
    img.thumbnail((width, height), Image.Resampling.LANCZOS)

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return Response(content=buffer.getvalue(), media_type="image/png")


@app.get("/api/ortho/metadata")
async def get_ortho_metadata():
    if ortho_cache["src"] is None:
        return {"error": "No image loaded"}
    src = ortho_cache["src"]
    return {
        "filename": Path(uploaded_files["ortho"]).name if uploaded_files["ortho"] else None,
        "datetime": datetime.now().isoformat(),
        "width": src.width,
        "height": src.height,
        "crs": str(src.crs) if src.crs else None,
    }


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    filename = file.filename.lower()
    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    if filename.endswith((".tif", ".tiff")):
        uploaded_files["ortho"] = str(file_path)
        load_ortho_image(str(file_path))
        return {"filename": file.filename, "message": "Image uploaded", "type": "ortho"}
    elif filename.endswith((".laz", ".las")):
        uploaded_files["laz"] = str(file_path)
        load_point_cloud(str(file_path))
        return {"filename": file.filename, "message": "Point cloud uploaded", "type": "laz", "points": len(pointcloud_cache["Z"])}
    return {"filename": file.filename, "message": "File uploaded", "type": "unknown"}


@app.post("/api/upload/dsm")
async def upload_dsm(file: UploadFile = File(...)):
    """上傳 DSM GeoTIFF 用於地形分析"""
    filename = file.filename.lower()
    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    if filename.endswith((".tif", ".tiff")):
        uploaded_files["dsm"] = str(file_path)
        load_dsm(str(file_path))
        return {
            "filename": file.filename,
            "message": "DSM uploaded",
            "type": "dsm",
            "resolution": dsm_cache.get("resolution"),
        }
    raise HTTPException(status_code=400, detail="DSM must be a GeoTIFF file")


@app.post("/api/process")
async def start_processing(request: ProcessingRequest = None):
    if request is None:
        request = ProcessingRequest()

    if ortho_cache["src"] is None:
        raise HTTPException(status_code=400, detail="Please upload an image first")

    job_id = f"job_{int(time.time())}"
    processing_state["job_id"] = job_id
    processing_state["status"] = "pending"
    processing_state["progress"] = 0
    processing_state["start_time"] = time.time()
    processing_state["results"] = []

    def update_progress(progress, step):
        processing_state["progress"] = progress
        processing_state["current_step"] = step
        processing_state["elapsed_seconds"] = time.time() - processing_state["start_time"]

    def run():
        try:
            processing_state["status"] = "running"
            classes = []
            if request.detect_vehicle: classes.append("car")
            if request.detect_person: classes.append("person")
            if request.detect_cone: classes.append("cone")

            update_progress(10, "Loading models...")
            detections = run_yolo_detection(classes, update_progress)

            if request.include_elevation:
                update_progress(85, "Height analysis...")
                detections = compute_height_volume(detections, update_progress)

            update_progress(95, "Coordinate transform...")
            detections = add_latlon_to_detections(detections)

            for i, det in enumerate(detections, 1):
                det["id"] = i
                det.pop("px1", None)
                det.pop("py1", None)
                det.pop("px2", None)
                det.pop("py2", None)

            processing_state["results"] = detections
            processing_state["status"] = "done"
            update_progress(100, "Complete")
        except Exception as e:
            processing_state["status"] = "error"
            processing_state["current_step"] = str(e)
            import traceback
            traceback.print_exc()

    threading.Thread(target=run, daemon=True).start()
    return {"job_id": job_id, "status": "started", "message": "Processing started"}


@app.get("/api/process/status")
async def get_current_processing_status():
    """取得目前處理狀態（不需要 job_id）"""
    return {
        "job_id": processing_state["job_id"],
        "status": processing_state["status"],
        "progress": processing_state["progress"],
        "current_step": processing_state["current_step"],
        "elapsed_seconds": time.time() - processing_state["start_time"] if processing_state["start_time"] else 0,
    }


@app.get("/api/process/{job_id}/status")
async def get_processing_status(job_id: str):
    if processing_state["job_id"] != job_id:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "job_id": job_id,
        "status": processing_state["status"],
        "progress": processing_state["progress"],
        "current_step": processing_state["current_step"],
        "elapsed_seconds": time.time() - processing_state["start_time"] if processing_state["start_time"] else 0,
    }


@app.get("/api/terrain/status")
async def get_terrain_status():
    """取得 DSM/地形分析狀態"""
    return {
        "dsm_loaded": dsm_cache["loaded"],
        "resolution": dsm_cache.get("resolution") if dsm_cache["loaded"] else None,
    }


@app.get("/api/terrain/stats")
async def get_terrain_stats():
    """取得地形統計資料"""
    if not dsm_cache["loaded"]:
        raise HTTPException(status_code=400, detail="No DSM loaded")

    terrain = compute_terrain_analysis()
    if terrain is None:
        raise HTTPException(status_code=500, detail="Failed to compute terrain analysis")

    return convert_numpy({
        "resolution": dsm_cache.get("resolution"),
        "stats": terrain["stats"],
    })


@app.get("/api/terrain/point")
async def get_terrain_at_location(x: float, y: float):
    """取得特定座標的地形資訊 (使用投影座標系)"""
    if not dsm_cache["loaded"]:
        raise HTTPException(status_code=400, detail="No DSM loaded")

    result = get_terrain_at_point(x, y)
    return convert_numpy(result)


@app.get("/api/export/stats")
async def export_stats():
    results = convert_numpy(processing_state["results"])
    stats = {
        "total": len(results),
        "person": len([r for r in results if r.get("cls") == "person"]),
        "vehicle": len([r for r in results if r.get("cls") == "vehicle"]),
        "cone": len([r for r in results if r.get("cls") == "cone"]),
    }
    return {"generated_at": datetime.now().isoformat(), "summary": stats, "detections": results}
