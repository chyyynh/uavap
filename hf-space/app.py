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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# 設定
# ============================================
UPLOAD_DIR = Path("/tmp/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ROOT_DIR = Path(__file__).resolve().parents[1]
GIS_OUTPUT_DIR = ROOT_DIR / "GIS_Output"
GIS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

LOCAL_MODEL_DIR = (Path(__file__).resolve().parents[1] / "model")
MODEL_DIR = Path(os.environ.get("UAVAP_MODEL_DIR", str(LOCAL_MODEL_DIR if LOCAL_MODEL_DIR.exists() else "/tmp/models")))
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
        "conf": 0.5,
        "patch_size": 896,
        "overlap": 620,
        "nms_iou": 0.1,
        "area": (4.0, 25.0),
        "ratio": (1.0, 3.0),
    },
    "person": {
        "filename": "human.pt",
        "conf": 0.5,
        "patch_size": 896,
        "overlap": 620,
        "nms_iou": 0.1,
        "area": (0.2, 1.0),
        "ratio": (0.5, 2.0),
    },
    "cone": {
        "filename": "cone.pt",
        "conf": 0.5,
        "patch_size": 896,
        "overlap": 620,
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

# ============================================
# 土地覆蓋設定 (UPerNet)
# ============================================
LANDCOVER_CLASSES = {
    0: "bare-ground",
    1: "tree",
    2: "road",
    3: "pavement",
    4: "grass",
    5: "building",
}

LANDCOVER_COLORS = {
    "bare-ground": [222, 184, 135],
    "tree": [34, 139, 34],
    "road": [128, 128, 128],
    "pavement": [178, 34, 34],
    "grass": [124, 252, 0],
    "building": [255, 140, 0],
}

UPERNET_CONFIG = {
    "filename": "UPerNet_best.pth",
    "num_classes": 6,
    "tile_size": (64, 64),
    "overlap": 0.5,
    "encoder_name": "resnet50",
}

# ImageNet normalization
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

HEIGHT_PRIOR = {
    "person": {"mean": 1.70, "std": 0.08},
    "cone": {"mean": 0.45, "std": 0.10},
    "car": {"mean": 1.60, "std": 0.25},
    "vehicle": {"mean": 1.60, "std": 0.25},
}

CELL_BY_CLASS = {"person": 0.05, "cone": 0.05, "car": 0.10}
MIN_PTS_BY_CLASS = {"person": 8, "cone": 10, "car": 30}
DETECTION_COLORS = {
    "person": (246, 130, 59),
    "vehicle": (94, 197, 34),
    "cone": (22, 115, 249),
    "car": (94, 197, 34),
}

rng = np.random.default_rng(42)

# ============================================
# 全域狀態
# ============================================
uploaded_files = {"ortho": None, "laz": None, "dsm": None, "aoi": None, "ortho_ref": None, "dsm_ref": None}
ortho_cache = {"src": None, "transform": None, "crs": None, "bounds": None, "width": 0, "height": 0, "pixel_w": 0, "pixel_h": 0}
pointcloud_cache = {"X": None, "Y": None, "Z": None, "loaded": False, "sorted_x": None, "sorted_idx": None}
dsm_cache = {"data": None, "transform": None, "crs": None, "loaded": False, "nodata": None}
# AOI cache in ortho CRS + map CRS (EPSG:4326)
aoi_cache = {
    "geom": None,
    "bbox": None,
    "bbox_wgs84": None,
    "geojson": None,
    "crs": None,
    "image_crs": None,
    "input_geom_type": None,
    "used_geom_type": None,
    "buffer_m": None,
    "assumed_crs": False,
    "mode": None,
    "loaded": False,
    "path": None,
}
# 參考期資料（用於變化偵測）
ref_ortho_cache = {"data": None, "transform": None, "loaded": False}
ref_dsm_cache = {"data": None, "transform": None, "loaded": False}
change_detection_cache = {"result": None, "computed": False}
models_cache = {"loaded": False, "models": {}}
upernet_cache = {"loaded": False, "model": None}
landcover_cache = {"mask": None, "stats": None, "computed": False}
terrain_cache = {"stats": None, "computed": False}
processing_state = {"job_id": None, "status": "idle", "progress": 0, "current_step": "", "elapsed_seconds": 0, "results": [], "start_time": None}


def cleanup_all():
    """清除所有快取和刪除上傳的檔案"""
    global uploaded_files, ortho_cache, pointcloud_cache, dsm_cache, aoi_cache
    global ref_ortho_cache, ref_dsm_cache, change_detection_cache
    global landcover_cache, terrain_cache, processing_state

    # 關閉 rasterio 資源
    if ortho_cache["src"] is not None:
        try:
            ortho_cache["src"].close()
        except:
            pass

    # 刪除所有上傳的檔案
    # 重設所有快取
    uploaded_files.update({"ortho": None, "laz": None, "dsm": None, "aoi": None, "ortho_ref": None, "dsm_ref": None})
    ortho_cache.update({"src": None, "transform": None, "crs": None, "bounds": None, "width": 0, "height": 0, "pixel_w": 0, "pixel_h": 0})
    pointcloud_cache.update({"X": None, "Y": None, "Z": None, "loaded": False, "sorted_x": None, "sorted_idx": None})
    dsm_cache.update({"data": None, "transform": None, "crs": None, "loaded": False, "nodata": None})
    aoi_cache.update({
        "geom": None,
        "bbox": None,
        "bbox_wgs84": None,
        "geojson": None,
        "crs": None,
        "image_crs": None,
        "input_geom_type": None,
        "used_geom_type": None,
        "buffer_m": None,
        "assumed_crs": False,
        "mode": None,
        "loaded": False,
        "path": None,
    })
    ref_ortho_cache.update({"data": None, "transform": None, "loaded": False})
    ref_dsm_cache.update({"data": None, "transform": None, "loaded": False})
    change_detection_cache.update({"result": None, "computed": False})
    landcover_cache.update({"mask": None, "stats": None, "computed": False})
    terrain_cache.update({"stats": None, "computed": False})
    processing_state.update({"job_id": None, "status": "idle", "progress": 0, "current_step": "", "elapsed_seconds": 0, "results": [], "start_time": None})

    print("[Cleanup] All caches cleared")

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
    include_landcover: bool = False  # 土地覆蓋偵測（UPerNet）
    aoi_geojson_path: str | None = None
    aoi_geojson_file_id: str | None = None
    aoi_points: list[list[float]] | None = None
    aoi_crs: str | None = None
class LocalUploadRequest(BaseModel):
    project_dir: str | None = None
    ortho_name: str | None = None
    dsm_name: str | None = None
    laz_name: str | None = None
    aoi_name: str | None = None
    clear_aoi: bool = False


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


def run_yolo_detection(classes_to_detect: list[str], progress_callback=None, aoi_geom=None) -> list[dict]:
    import rasterio
    from rasterio.windows import Window, from_bounds
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
    window_col = 0
    window_row = 0

    if aoi_geom is not None:
        minx, miny, maxx, maxy = aoi_geom.bounds
        try:
            window = from_bounds(minx, miny, maxx, maxy, transform=transform)
            window = window.round_offsets().round_lengths()
            window = window.intersection(Window(0, 0, width, height))
            window_col = int(window.col_off)
            window_row = int(window.row_off)
            width = int(window.width)
            height = int(window.height)
        except Exception as e:
            raise ValueError(f"Failed to compute AOI window: {e}")

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

                patch = src.read(window=Window(window_col + x, window_row + y, win_w, win_h))
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
                            "px1": window_col + x + bx[0], "py1": window_row + y + bx[1],
                            "px2": window_col + x + bx[2], "py2": window_row + y + bx[3],
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

        if aoi_geom is not None:
            try:
                from shapely.geometry import Point
                if not aoi_geom.intersects(Point(gx, gy)):
                    continue
            except Exception:
                pass

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
            "volume_m3": None,
            "volume_reason": None,
            "lat": 0.0,
            "lon": 0.0,
        })

    print(f"[YOLO] After OBIA: {len(records)}")
    return records


def write_combined_detection_image(detections: list[dict]) -> Path | None:
    if ortho_cache["src"] is None:
        print("[Combined] No ortho image loaded")
        return None

    try:
        import cv2
    except ImportError:
        print("[Combined] Missing OpenCV; skipping combined image output")
        return None

    try:
        src = ortho_cache["src"]
        data = src.read([1, 2, 3])
        vis = np.transpose(data, (1, 2, 0))
        if vis.dtype != np.uint8:
            vis = ((vis - vis.min()) / (vis.max() - vis.min() + 1e-6) * 255).astype(np.uint8)
        vis = cv2.cvtColor(vis, cv2.COLOR_RGB2BGR)

        h, w = vis.shape[:2]
        for det in detections:
            cls_name = det.get("cls") or det.get("class") or "object"
            x1, y1, x2, y2 = det.get("px1"), det.get("py1"), det.get("px2"), det.get("py2")
            if None in (x1, y1, x2, y2):
                continue
            x1, y1, x2, y2 = map(int, [x1, y1, x2, y2])
            x1 = max(0, min(x1, w - 1))
            x2 = max(0, min(x2, w - 1))
            y1 = max(0, min(y1, h - 1))
            y2 = max(0, min(y2, h - 1))
            color = DETECTION_COLORS.get(cls_name, (160, 174, 192))
            cv2.rectangle(vis, (x1, y1), (x2, y2), color, 2)
            cv2.circle(vis, ((x1 + x2) // 2, (y1 + y2) // 2), 3, color, -1)
            score = det.get("score", det.get("conf", 0.0))
            label = f"{cls_name}-{det.get('id', '')} {score:.2f}"
            cv2.putText(
                vis,
                label,
                (x1, max(y1 - 5, 15)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                color,
                1,
            )

        out_png = GIS_OUTPUT_DIR / "all_objects_combined.png"
        GIS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        if not cv2.imwrite(str(out_png), vis):
            print("[Combined] Failed to write combined image")
            return None
        print(f"[Combined] Wrote {out_png}")
        return out_png
    except Exception as e:
        print(f"[Combined] Failed to generate combined image: {e}")
        return None


# ============================================
# UPerNet 土地覆蓋函式
# ============================================
def load_upernet_model():
    """載入 UPerNet 模型"""
    if upernet_cache["loaded"]:
        return upernet_cache["model"]

    try:
        import torch
        import segmentation_models_pytorch as smp
    except ImportError as e:
        print(f"[UPerNet] Missing dependency: {e}")
        return None

    model_path = get_model_path(UPERNET_CONFIG["filename"])
    if not model_path.exists():
        print(f"[UPerNet] Model not found: {model_path}")
        return None

    try:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model = smp.UPerNet(
            encoder_name=UPERNET_CONFIG["encoder_name"],
            encoder_weights=None,
            in_channels=3,
            classes=UPERNET_CONFIG["num_classes"]
        ).to(device)

        state_dict = torch.load(str(model_path), map_location=device)
        model.load_state_dict(state_dict, strict=False)
        model.eval()

        upernet_cache["model"] = model
        upernet_cache["loaded"] = True
        upernet_cache["device"] = device
        print(f"[UPerNet] Loaded on {device}")
        return model
    except Exception as e:
        print(f"[UPerNet] Failed to load: {e}")
        import traceback
        traceback.print_exc()
        return None


def run_landcover_segmentation(progress_callback=None) -> dict:
    """執行土地覆蓋分割"""
    import torch
    import torchvision.transforms as T
    import cv2

    if ortho_cache["src"] is None:
        raise ValueError("No ortho image loaded")

    model = load_upernet_model()
    if model is None:
        raise ValueError("Failed to load UPerNet model")

    device = upernet_cache["device"]
    src = ortho_cache["src"]

    # Read image
    data = src.read([1, 2, 3])
    img = np.moveaxis(data, 0, -1)

    # Normalize to uint8 if needed
    if img.dtype != np.uint8:
        img = img.astype(np.float32)
        img = (img - img.min()) / max(img.max() - img.min(), 1e-6) * 255
        img = img.astype(np.uint8)

    H, W = img.shape[:2]
    th, tw = UPERNET_CONFIG["tile_size"]
    overlap = UPERNET_CONFIG["overlap"]
    num_classes = UPERNET_CONFIG["num_classes"]

    stride_h = max(1, int(th * (1 - overlap)))
    stride_w = max(1, int(tw * (1 - overlap)))

    # Padding
    pad_h = max(((H - th) // stride_h + 1) * stride_h + th - H, 0)
    pad_w = max(((W - tw) // stride_w + 1) * stride_w + tw - W, 0)
    img_pad = cv2.copyMakeBorder(img, 0, pad_h, 0, pad_w, cv2.BORDER_REFLECT_101)
    Hp, Wp = img_pad.shape[:2]

    # Accumulators
    logit_sum = np.zeros((num_classes, Hp, Wp), np.float32)
    count = np.zeros((Hp, Wp), np.float32)

    to_tensor = T.Compose([
        T.ToTensor(),
        T.Normalize(IMAGENET_MEAN, IMAGENET_STD)
    ])

    # Calculate total tiles for progress
    total_tiles = ((Hp - th) // stride_h + 1) * ((Wp - tw) // stride_w + 1)
    tile_count = 0

    # Sliding window inference
    with torch.no_grad():
        for y in range(0, Hp - th + 1, stride_h):
            for x in range(0, Wp - tw + 1, stride_w):
                tile = img_pad[y:y+th, x:x+tw]
                tin = to_tensor(tile).unsqueeze(0).to(device)
                logits = model(tin)
                logits = logits[0] if isinstance(logits, (list, tuple)) else logits
                logit_sum[:, y:y+th, x:x+tw] += logits.squeeze(0).cpu().numpy()
                count[y:y+th, x:x+tw] += 1

                tile_count += 1
                if progress_callback and tile_count % 100 == 0:
                    progress = int(tile_count / total_tiles * 100)
                    progress_callback(progress, f"Landcover segmentation ({tile_count}/{total_tiles})...")

    # Get prediction
    pred = np.argmax(logit_sum / np.maximum(count, 1e-6), axis=0).astype(np.uint8)
    pred = pred[:H, :W]

    # Handle nodata (black pixels)
    black_mask = np.all(img <= 10, axis=2)
    pred[black_mask] = 255

    # Compute statistics
    stats = {}
    total_valid = np.sum(pred < num_classes)
    for class_id, class_name in LANDCOVER_CLASSES.items():
        class_pixels = np.sum(pred == class_id)
        stats[class_name] = {
            "pixels": int(class_pixels),
            "percentage": round(class_pixels / total_valid * 100, 2) if total_valid > 0 else 0
        }

    # Cache results
    landcover_cache["mask"] = pred
    landcover_cache["stats"] = stats
    landcover_cache["computed"] = True

    print(f"[UPerNet] Segmentation complete: {H}x{W}")
    return {"stats": stats, "shape": (H, W)}


def get_landcover_colorized() -> np.ndarray:
    """取得彩色土地覆蓋圖"""
    if not landcover_cache["computed"] or landcover_cache["mask"] is None:
        return None

    mask = landcover_cache["mask"]
    H, W = mask.shape
    color_img = np.zeros((H, W, 3), dtype=np.uint8)

    for class_id, class_name in LANDCOVER_CLASSES.items():
        color = LANDCOVER_COLORS[class_name]
        color_img[mask == class_id] = color

    # Set nodata to black
    color_img[mask == 255] = [0, 0, 0]

    return color_img


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
            det["volume_m3"] = None
            det["volume_reason"] = "no_pointcloud"
        return detections

    from shapely.geometry import box
    X, Y, Z = pointcloud_cache["X"], pointcloud_cache["Y"], pointcloud_cache["Z"]
    transform = ortho_cache["transform"]
    sorted_x = pointcloud_cache.get("sorted_x")
    sorted_idx = pointcloud_cache.get("sorted_idx")

    for det in detections:
        cls = det["cls"] if det["cls"] != "vehicle" else "car"
        px1, py1 = transform * (det["px1"], det["py1"])
        px2, py2 = transform * (det["px2"], det["py2"])
        geom = box(min(px1, px2), min(py1, py2), max(px1, px2), max(py1, py2))

        minx, miny, maxx, maxy = geom.bounds
        if sorted_x is not None and sorted_idx is not None:
            left = np.searchsorted(sorted_x, minx, side="left")
            right = np.searchsorted(sorted_x, maxx, side="right")
            idx = sorted_idx[left:right]
            m = idx[(Y[idx] >= miny) & (Y[idx] <= maxy)]
        else:
            m = np.where((X >= minx) & (X <= maxx) & (Y >= miny) & (Y <= maxy))[0]

        if m.size:
            zz = Z[m]
            z0 = float(np.percentile(zz, 5))
            ztop = float(np.percentile(zz, 95))
            h_raw = max(0.0, ztop - z0)
            h_fix, _ = impute_height_by_class(cls, h_raw, len(zz), MIN_PTS_BY_CLASS.get(cls, 30))
            det["height_m"] = round(h_fix, 2)
            det["elev_z"] = round(z0, 1)
            det["volume_m3"] = round(det.get("area_m2", 0.0) * h_raw, 3)
            det["volume_reason"] = None
        else:
            h, _ = impute_height_by_class(cls, np.nan, 0, 100)
            det["height_m"] = round(h, 2)
            det["volume_m3"] = None
            det["volume_reason"] = "no_points"

    return detections


def add_latlon_to_detections(detections):
    bounds = ortho_cache.get("bounds")
    width = ortho_cache.get("width", 0)
    height = ortho_cache.get("height", 0)

    # Prefer visual alignment with image bounds when available.
    if bounds and width and height:
        west = bounds.get("west")
        east = bounds.get("east")
        north = bounds.get("north")
        south = bounds.get("south")
        if None not in (west, east, north, south):
            for det in detections:
                px1 = det.get("px1")
                py1 = det.get("py1")
                px2 = det.get("px2")
                py2 = det.get("py2")
                if px1 is None or py1 is None or px2 is None or py2 is None:
                    continue
                cx = (px1 + px2) / 2.0
                cy = (py1 + py2) / 2.0
                lon = west + (cx / width) * (east - west)
                lat = north - (cy / height) * (north - south)
                det["lat"] = round(lat, 6)
                det["lon"] = round(lon, 6)
            return detections

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
    X = np.asarray(las.x)
    Y = np.asarray(las.y)
    Z = np.asarray(las.z)
    pointcloud_cache["X"] = X
    pointcloud_cache["Y"] = Y
    pointcloud_cache["Z"] = Z
    order = np.argsort(X)
    pointcloud_cache["sorted_x"] = X[order]
    pointcloud_cache["sorted_idx"] = order
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


def compute_terrain_stats():
    """Generate terrain statistics in the frontend-expected shape."""
    if not dsm_cache["loaded"]:
        raise ValueError("No DSM loaded. Upload DSM via /api/upload/dsm or /api/upload/local (project_dir + dsm_name).")

    terrain = compute_terrain_analysis()
    if terrain is None:
        raise ValueError("Failed to compute terrain analysis")

    dem = dsm_cache["data"]
    nodata = dsm_cache["nodata"]
    if nodata is not None:
        dem = np.where(dem == nodata, np.nan, dem)

    elevation = {
        "min": float(np.nanmin(dem)),
        "max": float(np.nanmax(dem)),
        "mean": float(np.nanmean(dem)),
        "std": float(np.nanstd(dem)),
    }

    slope = terrain["slope"]
    aspect = terrain["aspect"]
    valid_slope = ~np.isnan(slope)
    valid_aspect = ~np.isnan(aspect)

    def slope_bucket(mask):
        count = int(np.sum(mask))
        total = int(np.sum(valid_slope))
        pct = round((count / total) * 100, 2) if total > 0 else 0
        return {"count": count, "percentage": pct}

    slope_distribution = {
        "flat": slope_bucket((slope < 5) & valid_slope),
        "gentle": slope_bucket((slope >= 5) & (slope < 15) & valid_slope),
        "moderate": slope_bucket((slope >= 15) & (slope < 30) & valid_slope),
        "steep": slope_bucket((slope >= 30) & valid_slope),
    }

    def aspect_bucket(lo, hi):
        mask = (aspect >= lo) & (aspect < hi) & valid_aspect
        count = int(np.sum(mask))
        total = int(np.sum(valid_aspect))
        pct = round((count / total) * 100, 2) if total > 0 else 0
        return {"count": count, "percentage": pct}

    aspect_distribution = {
        "N": aspect_bucket(337.5, 360.0),
        "NE": aspect_bucket(22.5, 67.5),
        "E": aspect_bucket(67.5, 112.5),
        "SE": aspect_bucket(112.5, 157.5),
        "S": aspect_bucket(157.5, 202.5),
        "SW": aspect_bucket(202.5, 247.5),
        "W": aspect_bucket(247.5, 292.5),
        "NW": aspect_bucket(292.5, 337.5),
    }
    aspect_distribution["N"]["count"] += int(np.sum((aspect < 22.5) & valid_aspect))
    total_aspect = int(np.sum(valid_aspect))
    if total_aspect > 0:
        aspect_distribution["N"]["percentage"] = round((aspect_distribution["N"]["count"] / total_aspect) * 100, 2)

    return {
        "elevation": elevation,
        "slope": {
            "min": float(np.nanmin(slope)),
            "max": float(np.nanmax(slope)),
            "mean": float(np.nanmean(slope)),
            "distribution": slope_distribution,
        },
        "aspect": {
            "distribution": aspect_distribution,
        },
    }


def get_slope_colorized():
    """取得彩色坡度圖 (terrain colormap)"""
    if not dsm_cache["loaded"]:
        return None

    terrain = compute_terrain_analysis()
    if terrain is None:
        return None

    slope = terrain["slope"]

    # Normalize slope to 0-1 (cap at 60 degrees)
    slope_norm = np.clip(slope / 60.0, 0, 1)

    # Use a terrain-like colormap (green -> yellow -> brown -> white)
    # Create RGB image
    H, W = slope.shape
    colored = np.zeros((H, W, 3), dtype=np.uint8)

    # Green (flat) -> Yellow -> Orange -> Red -> Brown (steep)
    colored[:, :, 0] = np.clip(slope_norm * 2 * 255, 0, 255).astype(np.uint8)  # R
    colored[:, :, 1] = np.clip((1 - slope_norm) * 255, 0, 255).astype(np.uint8)  # G
    colored[:, :, 2] = np.clip((1 - slope_norm * 2) * 128, 0, 128).astype(np.uint8)  # B

    # Handle NaN as black
    nan_mask = np.isnan(slope)
    colored[nan_mask] = [0, 0, 0]

    return colored


def get_aspect_colorized():
    """取得彩色坡向圖 (HSV colormap - direction as hue)"""
    if not dsm_cache["loaded"]:
        return None

    terrain = compute_terrain_analysis()
    if terrain is None:
        return None

    aspect = terrain["aspect"]

    # Convert aspect to hue (0-360 -> 0-1)
    hue = aspect / 360.0

    # Create HSV image (full saturation and value)
    H, W = aspect.shape
    import colorsys

    colored = np.zeros((H, W, 3), dtype=np.uint8)
    for i in range(H):
        for j in range(W):
            if np.isnan(aspect[i, j]):
                colored[i, j] = [0, 0, 0]
            else:
                r, g, b = colorsys.hsv_to_rgb(hue[i, j], 0.8, 0.9)
                colored[i, j] = [int(r * 255), int(g * 255), int(b * 255)]

    return colored


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
async def get_ortho_image(max_width: int = None, quality: int = 85):
    """取得正射影像 (JPEG with compression)

    Args:
        max_width: Optional max width for resizing (maintains aspect ratio)
        quality: JPEG quality (1-95, default 85)
    """
    if ortho_cache["src"] is None:
        raise HTTPException(status_code=404, detail="No image loaded")

    from PIL import Image
    src = ortho_cache["src"]
    data = src.read([1, 2, 3])
    data = np.moveaxis(data, 0, -1)
    if data.dtype != np.uint8:
        data = ((data - data.min()) / (data.max() - data.min() + 1e-6) * 255).astype(np.uint8)

    img = Image.fromarray(data)

    # Resize if max_width specified
    if max_width and img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

    # Use JPEG with compression for photos
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=min(95, max(1, quality)), optimize=True)
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=3600"}
    )


@app.get("/api/ortho/preview")
async def get_ortho_preview(width: int = 800, height: int = 600, quality: int = 85, with_detections: bool = False):
    """取得正射影像預覽 (JPEG with compression)"""
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

    if with_detections and processing_state.get("results"):
        try:
            from PIL import ImageDraw
            draw = ImageDraw.Draw(img)
            colors = {
                "person": (59, 130, 246),
                "vehicle": (34, 197, 94),
                "cone": (249, 115, 22),
            }
            transform = ortho_cache.get("transform")
            inv_transform = ~transform if transform is not None else None
            base_w = max(1, ortho_cache.get("width", 0))
            base_h = max(1, ortho_cache.get("height", 0))
            scale_x = img.width / base_w
            scale_y = img.height / base_h
            if inv_transform is not None and base_w and base_h:
                for det in processing_state["results"]:
                    x = det.get("center_x")
                    y = det.get("center_y")
                    if x is None or y is None:
                        continue
                    px, py = inv_transform * (x, y)
                    px *= scale_x
                    py *= scale_y
                    if px < 0 or py < 0 or px > img.width or py > img.height:
                        continue
                    r = 4
                    color = colors.get(det.get("cls"), (148, 163, 184))
                    draw.ellipse((px - r, py - r, px + r, py + r), fill=color, outline=(255, 255, 255))
        except Exception as e:
            print(f"[Preview] Detection overlay failed: {e}")

    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=min(95, max(1, quality)), optimize=True)
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=3600"}
    )


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
        "pixel_w": ortho_cache["pixel_w"],  # Resolution in meters
        "pixel_h": ortho_cache["pixel_h"],  # Resolution in meters
    }


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    filename = file.filename.lower()
    file_path = UPLOAD_DIR / file.filename

    if filename.endswith((".tif", ".tiff")):
        # 上傳新的 ortho 時，清除所有舊資料
        cleanup_all()

    # 刪除同類型的舊檔案
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

    # 刪除舊的 DSM 檔案
    if uploaded_files.get("dsm"):
        # 重設 DSM 快取
        dsm_cache.update({"data": None, "transform": None, "crs": None, "loaded": False, "nodata": None})

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


@app.post("/api/upload/aoi")
async def upload_aoi(file: UploadFile = File(...)):
    filename = file.filename.lower()
    file_path = UPLOAD_DIR / file.filename

    if not filename.endswith(".geojson"):
        raise HTTPException(status_code=400, detail="AOI must be a GeoJSON file")

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    uploaded_files["aoi"] = str(file_path)
    load_aoi_as_polygon(str(file_path), uploaded_files.get("ortho"))

    minx, miny, maxx, maxy = aoi_cache.get("bbox") or (None, None, None, None)
    wgs84_minx, wgs84_miny, wgs84_maxx, wgs84_maxy = aoi_cache.get("bbox_wgs84") or (None, None, None, None)
    return {
        "filename": file.filename,
        "message": "AOI uploaded",
        "type": "aoi",
        "aoi_bbox": [minx, miny, maxx, maxy],
        "aoi_bbox_wgs84": [wgs84_minx, wgs84_miny, wgs84_maxx, wgs84_maxy],
        "aoi_geojson": aoi_cache.get("geojson"),
        "aoi_mode": aoi_cache.get("mode"),
        "aoi_input_geom_type": aoi_cache.get("input_geom_type"),
        "aoi_used_geom_type": aoi_cache.get("used_geom_type"),
        "aoi_buffer_m": aoi_cache.get("buffer_m"),
        "image_crs": aoi_cache.get("image_crs"),
        "aoi_crs": aoi_cache.get("crs"),
        "aoi_assumed_crs": aoi_cache.get("assumed_crs"),
    }


@app.get("/api/aoi")
async def get_aoi_info():
    if not aoi_cache.get("loaded"):
        return {"loaded": False}
    minx, miny, maxx, maxy = aoi_cache.get("bbox") or (None, None, None, None)
    wgs84_minx, wgs84_miny, wgs84_maxx, wgs84_maxy = aoi_cache.get("bbox_wgs84") or (None, None, None, None)
    return {
        "loaded": True,
        "aoi_bbox": [minx, miny, maxx, maxy],
        "aoi_bbox_wgs84": [wgs84_minx, wgs84_miny, wgs84_maxx, wgs84_maxy],
        "aoi_geojson": aoi_cache.get("geojson"),
        "aoi_mode": aoi_cache.get("mode"),
        "aoi_input_geom_type": aoi_cache.get("input_geom_type"),
        "aoi_used_geom_type": aoi_cache.get("used_geom_type"),
        "aoi_buffer_m": aoi_cache.get("buffer_m"),
        "image_crs": aoi_cache.get("image_crs"),
        "aoi_crs": aoi_cache.get("crs"),
        "aoi_assumed_crs": aoi_cache.get("assumed_crs"),
    }


@app.post("/api/aoi/clear")
async def clear_aoi():
    _clear_aoi_cache()
    return {"status": "ok"}



def _validate_local_path(path_str: str, exts: set[str], label: str) -> str:
    path = Path(path_str)
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=400, detail=f"{label} file not found: {path}")
    if path.suffix.lower() not in exts:
        allowed = ", ".join(sorted(exts))
        raise HTTPException(status_code=400, detail=f"{label} must be one of: {allowed}")
    return str(path)


def _clear_aoi_cache():
    aoi_cache.update({
        "geom": None,
        "bbox": None,
        "bbox_wgs84": None,
        "geojson": None,
        "crs": None,
        "image_crs": None,
        "input_geom_type": None,
        "used_geom_type": None,
        "buffer_m": None,
        "assumed_crs": False,
        "mode": None,
        "loaded": False,
        "path": None,
    })
    uploaded_files["aoi"] = None


def load_aoi_as_polygon(
    aoi_geojson_path: str,
    image_path: str,
    point_buffer_m: float = 50,
    assume_wgs84_if_missing: bool = False,
) -> dict:
    if not aoi_geojson_path:
        raise HTTPException(status_code=400, detail="AOI path is required")
    if not image_path:
        raise HTTPException(status_code=400, detail="Image path is required for AOI alignment")

    try:
        import geopandas as gpd
        from shapely.geometry import MultiPoint, box, mapping
        from shapely.validation import explain_validity
        import rasterio
        from pyproj import CRS
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Missing AOI dependency: {e}")

    try:
        gdf = gpd.read_file(aoi_geojson_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read AOI GeoJSON: {e}")

    if gdf.empty or gdf.geometry.isnull().all():
        raise HTTPException(status_code=400, detail="AOI GeoJSON is empty")

    assumed_crs = False
    if gdf.crs is None:
        if not assume_wgs84_if_missing:
            raise HTTPException(status_code=400, detail="AOI CRS missing; please provide CRS")
        gdf = gdf.set_crs("EPSG:4326")
        assumed_crs = True

    try:
        with rasterio.open(image_path) as src:
            image_crs = src.crs
            image_bounds = src.bounds
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to open image for AOI alignment: {e}")

    if image_crs is None:
        raise HTTPException(status_code=400, detail="Image CRS missing; cannot align AOI")

    aoi_crs = gdf.crs
    try:
        gdf_img = gdf.to_crs(image_crs)
    except Exception:
        raise HTTPException(status_code=400, detail="AOI CRS not recognized; please provide a valid CRS")

    geom_union = gdf_img.unary_union
    if geom_union is None or geom_union.is_empty:
        raise HTTPException(status_code=400, detail="AOI geometry is empty")

    input_geom_type = geom_union.geom_type
    used_geom = geom_union
    used_geom_type = input_geom_type
    buffer_used = None

    mode = "geojson"
    if input_geom_type in {"Point", "MultiPoint"}:
        points = [geom_union] if input_geom_type == "Point" else list(geom_union.geoms)
        if len(points) != 4:
            raise HTTPException(status_code=400, detail="AOI points GeoJSON must contain exactly 4 points")
        used_geom = MultiPoint(points).minimum_rotated_rectangle
        if used_geom.is_empty:
            raise HTTPException(status_code=400, detail="AOI polygon is empty")
        if not used_geom.is_valid:
            raise HTTPException(status_code=400, detail=f"Invalid AOI polygon: {explain_validity(used_geom)}")
        used_geom_type = used_geom.geom_type
        buffer_used = None
        mode = "geojson_points_rect"

    if used_geom_type not in {"Polygon", "MultiPolygon"}:
        raise HTTPException(status_code=400, detail=f"AOI geometry must be Polygon or MultiPolygon (got {used_geom_type})")

    image_bounds_geom = box(image_bounds.left, image_bounds.bottom, image_bounds.right, image_bounds.top)
    if not used_geom.intersects(image_bounds_geom):
        raise HTTPException(status_code=400, detail="AOI does not intersect image bounds; check CRS/coordinates")

    try:
        geom_wgs84 = gpd.GeoSeries([used_geom], crs=image_crs).to_crs("EPSG:4326").iloc[0]
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to project AOI to EPSG:4326")

    info = {
        "geom": used_geom,
        "bbox": used_geom.bounds,
        "bbox_wgs84": geom_wgs84.bounds,
        "geojson": {"type": "Feature", "properties": {}, "geometry": mapping(geom_wgs84)},
        "crs": str(aoi_crs) if aoi_crs else "EPSG:4326",
        "image_crs": str(image_crs),
        "input_geom_type": input_geom_type,
        "used_geom_type": used_geom_type,
        "buffer_m": buffer_used,
        "assumed_crs": assumed_crs,
    }

    aoi_cache.update({
        **info,
        "mode": mode,
        "loaded": True,
        "path": str(aoi_geojson_path),
    })
    return info


def build_aoi_from_points(
    points: list[list[float]],
    aoi_crs: str | None,
    image_crs,
    image_bounds,
) -> dict:
    if not points:
        raise HTTPException(status_code=400, detail="AOI points are required")
    if len(points) not in (4, 5):
        raise HTTPException(status_code=400, detail="AOI points must have 4 points (or 5 with closure)")

    for idx, pt in enumerate(points):
        if not isinstance(pt, (list, tuple)) or len(pt) != 2:
            raise HTTPException(status_code=400, detail=f"AOI point {idx + 1} must be [x, y]")

    if aoi_crs is None:
        raise HTTPException(status_code=400, detail="AOI CRS is required for aoi_points")

    if len(points) == 5 and points[0] != points[-1]:
        raise HTTPException(status_code=400, detail="AOI points closure is invalid (last point must equal first)")

    closed_points = points if len(points) == 5 else points + [points[0]]

    try:
        import geopandas as gpd
        from shapely.geometry import Polygon, box, mapping
        from shapely.validation import explain_validity
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Missing AOI dependency: {e}")

    poly = Polygon(closed_points)
    if poly.is_empty:
        raise HTTPException(status_code=400, detail="AOI polygon is empty")
    if not poly.is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid AOI polygon: {explain_validity(poly)}")

    try:
        poly_series = gpd.GeoSeries([poly], crs=aoi_crs)
    except Exception:
        raise HTTPException(status_code=400, detail="AOI CRS not recognized; please provide a valid CRS")

    try:
        poly_img = poly_series.to_crs(image_crs).iloc[0]
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to project AOI to image CRS")

    image_bounds_geom = box(image_bounds.left, image_bounds.bottom, image_bounds.right, image_bounds.top)
    if not poly_img.intersects(image_bounds_geom):
        raise HTTPException(status_code=400, detail="AOI does not intersect image bounds; check CRS/coordinates")

    try:
        geom_wgs84 = gpd.GeoSeries([poly_img], crs=image_crs).to_crs("EPSG:4326").iloc[0]
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to project AOI to EPSG:4326")

    return {
        "geom": poly_img,
        "bbox": poly_img.bounds,
        "bbox_wgs84": geom_wgs84.bounds,
        "geojson": {"type": "Feature", "properties": {}, "geometry": mapping(geom_wgs84)},
        "crs": str(aoi_crs),
        "image_crs": str(image_crs),
        "input_geom_type": "PointList",
        "used_geom_type": poly_img.geom_type,
        "buffer_m": None,
        "assumed_crs": False,
    }

@app.post("/api/upload/local")
async def upload_local_paths(payload: LocalUploadRequest):
    if not payload.project_dir:
        raise HTTPException(status_code=400, detail="project_dir is required")

    base_dir = Path(payload.project_dir)
    if not base_dir.exists() or not base_dir.is_dir():
        raise HTTPException(status_code=400, detail=f"Project dir not found: {base_dir}")

    def build_path(name: str | None) -> str | None:
        if not name:
            return None
        p = Path(name)
        if p.is_absolute():
            return str(p)
        return str(base_dir / name)

    loaded = {}

    ortho_path = build_path(payload.ortho_name)
    dsm_path = build_path(payload.dsm_name)
    laz_path = build_path(payload.laz_name)
    aoi_path = build_path(payload.aoi_name)

    if ortho_path:
        cleanup_all()
        ortho_path = _validate_local_path(ortho_path, {".tif", ".tiff"}, "Ortho")
        uploaded_files["ortho"] = ortho_path
        load_ortho_image(ortho_path)
        loaded["ortho"] = ortho_path

    if dsm_path:
        dsm_path = _validate_local_path(dsm_path, {".tif", ".tiff"}, "DSM")
        uploaded_files["dsm"] = dsm_path
        load_dsm(dsm_path)
        loaded["dsm"] = dsm_path

    if laz_path:
        laz_path = _validate_local_path(laz_path, {".laz", ".las"}, "LAZ")
        uploaded_files["laz"] = laz_path
        load_point_cloud(laz_path)
        loaded["laz"] = laz_path

    if payload.clear_aoi and not aoi_path:
        _clear_aoi_cache()
        loaded["aoi"] = ""

    if aoi_path:
        aoi_path = _validate_local_path(aoi_path, {".geojson"}, "AOI")
        uploaded_files["aoi"] = aoi_path
        load_aoi_as_polygon(aoi_path, uploaded_files.get("ortho"))
        loaded["aoi"] = aoi_path

    if not loaded:
        raise HTTPException(status_code=400, detail="No valid files to load")

    return {"status": "ok", "loaded": loaded}

@app.post("/api/process")
async def start_processing(request: ProcessingRequest = None):
    if request is None:
        request = ProcessingRequest()

    if ortho_cache["src"] is None:
        raise HTTPException(status_code=400, detail="Please upload an image first")

    aoi_geom = None
    if request.aoi_points is not None:
        src = ortho_cache["src"]
        if src.crs is None:
            raise HTTPException(status_code=400, detail="Image CRS missing; cannot align AOI")
        aoi_info = build_aoi_from_points(
            request.aoi_points,
            request.aoi_crs,
            src.crs,
            src.bounds,
        )
        aoi_cache.update({
            **aoi_info,
            "mode": "points",
            "loaded": True,
            "path": None,
        })
        aoi_geom = aoi_cache.get("geom")
    elif request.aoi_geojson_path:
        load_aoi_as_polygon(request.aoi_geojson_path, uploaded_files.get("ortho"))
        aoi_geom = aoi_cache.get("geom")
    elif request.aoi_geojson_file_id:
        if not uploaded_files.get("aoi"):
            raise HTTPException(status_code=400, detail="AOI file not uploaded")
        load_aoi_as_polygon(uploaded_files["aoi"], uploaded_files.get("ortho"))
        aoi_geom = aoi_cache.get("geom")
    elif aoi_cache.get("loaded"):
        aoi_geom = aoi_cache.get("geom")

    if aoi_geom is not None:
        try:
            src_bounds = ortho_cache["src"].bounds
            img_area = max((src_bounds.right - src_bounds.left) * (src_bounds.top - src_bounds.bottom), 0)
            if img_area > 0 and (aoi_geom.area / img_area) > 0.8:
                print("[AOI] AOI covers most of the image; inference may be slower")
        except Exception:
            pass

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

            # YOLO detection (0-70%)
            update_progress(10, "Loading models...")
            detections = run_yolo_detection(classes, update_progress, aoi_geom=aoi_geom)

            # Height analysis (70-80%)
            if request.include_elevation:
                update_progress(70, "Height analysis...")
                detections = compute_height_volume(detections, update_progress)

            # Export combined visualization
            write_combined_detection_image(detections)

            # Landcover segmentation (80-95%)
            if request.include_landcover:
                update_progress(80, "Loading UPerNet model...")
                def landcover_progress(p, step):
                    update_progress(80 + int(p * 0.15), step)
                run_landcover_segmentation(landcover_progress)

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
    return {
        "job_id": job_id,
        "status": "started",
        "message": "Processing started",
        "aoi_bbox": list(aoi_cache.get("bbox") or (None, None, None, None)),
        "aoi_bbox_wgs84": list(aoi_cache.get("bbox_wgs84") or (None, None, None, None)),
        "aoi_geojson": aoi_cache.get("geojson"),
        "aoi_mode": aoi_cache.get("mode"),
        "aoi_input_geom_type": aoi_cache.get("input_geom_type"),
        "aoi_used_geom_type": aoi_cache.get("used_geom_type"),
        "aoi_buffer_m": aoi_cache.get("buffer_m"),
        "image_crs": aoi_cache.get("image_crs"),
        "aoi_crs": aoi_cache.get("crs"),
        "aoi_assumed_crs": aoi_cache.get("assumed_crs"),
    }


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
        "computed": terrain_cache["computed"],
        "has_stats": terrain_cache["stats"] is not None,
    }


@app.post("/api/terrain/run")
async def run_terrain():
    if not dsm_cache["loaded"]:
        raise HTTPException(status_code=400, detail="No DSM loaded. Upload DSM via /api/upload/dsm or /api/upload/local (project_dir + dsm_name).")

    try:
        stats = compute_terrain_stats()
        terrain_cache["stats"] = stats
        terrain_cache["computed"] = True
        return convert_numpy({"status": "done", "stats": stats})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/api/terrain/stats")
async def get_terrain_stats():
    """取得地形統計資料"""
    if not dsm_cache["loaded"]:
        raise HTTPException(status_code=400, detail="No DSM loaded. Upload DSM via /api/upload/dsm or /api/upload/local (project_dir + dsm_name).")

    if terrain_cache["computed"] and terrain_cache["stats"] is not None:
        return convert_numpy(terrain_cache["stats"])

    stats = compute_terrain_stats()
    terrain_cache["stats"] = stats
    terrain_cache["computed"] = True
    return convert_numpy(stats)


@app.get("/api/terrain/point")
async def get_terrain_at_location(x: float, y: float):
    """取得特定座標的地形資訊 (使用投影座標系)"""
    if not dsm_cache["loaded"]:
        raise HTTPException(status_code=400, detail="No DSM loaded")

    result = get_terrain_at_point(x, y)
    return convert_numpy(result)


@app.get("/api/terrain/slope")
async def get_terrain_slope_image(max_width: int = None):
    """取得坡度彩色圖 (PNG with compression)"""
    if not dsm_cache["loaded"]:
        raise HTTPException(status_code=400, detail="No DSM loaded")

    from PIL import Image
    color_img = get_slope_colorized()
    if color_img is None:
        raise HTTPException(status_code=500, detail="Failed to generate slope image")

    img = Image.fromarray(color_img)

    # Resize if max_width specified
    if max_width and img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.Resampling.NEAREST)

    buffer = io.BytesIO()
    img.save(buffer, format="PNG", optimize=True)
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"}
    )


@app.get("/api/terrain/aspect")
async def get_terrain_aspect_image(max_width: int = None):
    """取得坡向彩色圖 (PNG with compression)"""
    if not dsm_cache["loaded"]:
        raise HTTPException(status_code=400, detail="No DSM loaded")

    from PIL import Image
    color_img = get_aspect_colorized()
    if color_img is None:
        raise HTTPException(status_code=500, detail="Failed to generate aspect image")

    img = Image.fromarray(color_img)

    # Resize if max_width specified
    if max_width and img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.Resampling.NEAREST)

    buffer = io.BytesIO()
    img.save(buffer, format="PNG", optimize=True)
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"}
    )


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


@app.get("/api/export/geojson")
async def export_geojson():
    results = convert_numpy(processing_state["results"])
    features = []
    crs_name = str(ortho_cache["crs"]) if ortho_cache.get("crs") else None
    # GeoJSON properties exclude area_m2; include center_x/center_y and volume.
    allowed_keys = {
        "id",
        "cls",
        "score",
        "center_x",
        "center_y",
        "elev_z",
        "height_m",
        "volume_m3",
        "volume_reason",
    }
    for det in results:
        x = det.get("center_x")
        y = det.get("center_y")
        if x is None or y is None:
            continue
        properties = {k: v for k, v in det.items() if k in allowed_keys}
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [x, y]},
            "properties": properties,
        })

    payload = {
        "type": "FeatureCollection",
        "features": features,
        "generated_at": datetime.now().isoformat(),
    }
    if crs_name:
        payload["crs"] = {"type": "name", "properties": {"name": crs_name}}
    return payload


# ============================================
# 土地覆蓋 API
# ============================================
@app.get("/api/landcover/status")
async def get_landcover_status():
    """取得土地覆蓋偵測狀態"""
    return {
        "computed": landcover_cache["computed"],
        "has_stats": landcover_cache["stats"] is not None,
    }


@app.get("/api/landcover/stats")
async def get_landcover_stats():
    """取得土地覆蓋統計"""
    if not landcover_cache["computed"]:
        raise HTTPException(status_code=400, detail="Landcover not computed yet")

    return convert_numpy({
        "classes": LANDCOVER_CLASSES,
        "colors": LANDCOVER_COLORS,
        "stats": landcover_cache["stats"],
    })


@app.get("/api/landcover/image")
async def get_landcover_image(max_width: int = None):
    """取得土地覆蓋彩色圖 (PNG with compression)

    Args:
        max_width: Optional max width for resizing
    """
    if not landcover_cache["computed"]:
        raise HTTPException(status_code=400, detail="Landcover not computed yet")

    from PIL import Image
    color_img = get_landcover_colorized()
    if color_img is None:
        raise HTTPException(status_code=500, detail="Failed to generate colorized landcover")

    img = Image.fromarray(color_img)

    # Resize if max_width specified
    if max_width and img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.Resampling.NEAREST)  # Use NEAREST for segmentation masks

    buffer = io.BytesIO()
    img.save(buffer, format="PNG", optimize=True)
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"}
    )


@app.get("/api/landcover/overlay")
async def get_landcover_overlay(alpha: float = 0.5, max_width: int = None, quality: int = 85):
    """取得土地覆蓋疊加圖（正射影像 + 土地覆蓋, JPEG with compression）

    Args:
        alpha: Blend alpha for landcover overlay (0-1)
        max_width: Optional max width for resizing
        quality: JPEG quality (1-95, default 85)
    """
    if not landcover_cache["computed"]:
        raise HTTPException(status_code=400, detail="Landcover not computed yet")
    if ortho_cache["src"] is None:
        raise HTTPException(status_code=400, detail="No ortho image loaded")

    from PIL import Image

    # Get ortho image
    src = ortho_cache["src"]
    data = src.read([1, 2, 3])
    ortho_img = np.moveaxis(data, 0, -1)
    if ortho_img.dtype != np.uint8:
        ortho_img = ((ortho_img - ortho_img.min()) / (ortho_img.max() - ortho_img.min() + 1e-6) * 255).astype(np.uint8)

    # Get landcover colorized
    color_img = get_landcover_colorized()
    if color_img is None:
        raise HTTPException(status_code=500, detail="Failed to generate colorized landcover")

    # Create mask for valid landcover (not nodata)
    mask = landcover_cache["mask"]
    valid_mask = (mask < UPERNET_CONFIG["num_classes"]).astype(np.float32)

    # Blend
    blended = ortho_img.astype(np.float32) * (1 - alpha * valid_mask[:, :, np.newaxis]) + \
              color_img.astype(np.float32) * alpha * valid_mask[:, :, np.newaxis]
    blended = np.clip(blended, 0, 255).astype(np.uint8)

    img = Image.fromarray(blended)

    # Resize if max_width specified
    if max_width and img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=min(95, max(1, quality)), optimize=True)
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=3600"}
    )


@app.post("/api/landcover/run")
async def run_landcover():
    """單獨執行土地覆蓋偵測"""
    if ortho_cache["src"] is None:
        raise HTTPException(status_code=400, detail="Please upload an image first")

    try:
        result = run_landcover_segmentation()
        return convert_numpy({
            "status": "done",
            "stats": result["stats"],
            "shape": result["shape"],
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/cleanup")
async def api_cleanup():
    """清除所有上傳的檔案和快取"""
    cleanup_all()
    return {"status": "ok", "message": "All files and caches cleared"}
