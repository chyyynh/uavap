# ============================================
# UAV AIP - Colab API Server
# ============================================
#
# 【Cell 1】先執行這個安裝套件：
# !pip install fastapi uvicorn -q
# !wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
# !dpkg -i cloudflared-linux-amd64.deb
#
# 【Cell 2】再執行下面全部程式碼
# ============================================

import threading
import subprocess
import time
import re
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ----- 建立 API -----
app = FastAPI(title="UAV AIP API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ----- 資料模型 -----
class DetectionObject(BaseModel):
    id: int
    cls: str
    score: float
    center_x: float
    center_y: float
    area_m2: float
    aspect_rat: float
    elev_z: float
    height_m: float
    lat: float
    lon: float

# ----- 模擬資料 -----
MOCK_DATA = [
    {"id": 1, "cls": "vehicle", "score": 0.924, "center_x": 214297.4, "center_y": 2558033.75, "area_m2": 13.64, "aspect_rat": 1.48, "elev_z": 36.2, "height_m": 1.4, "lat": 25.04761, "lon": 121.53291},
    {"id": 2, "cls": "vehicle", "score": 0.924, "center_x": 214283.84, "center_y": 2558021.5, "area_m2": 15.61, "aspect_rat": 1.30, "elev_z": 36.0, "height_m": 1.2, "lat": 25.04758, "lon": 121.53274},
    {"id": 3, "cls": "vehicle", "score": 0.914, "center_x": 214276.53, "center_y": 2557982.0, "area_m2": 26.05, "aspect_rat": 1.27, "elev_z": 35.6, "height_m": 1.0, "lat": 25.04722, "lon": 121.5332},
    {"id": 4, "cls": "person", "score": 0.882, "center_x": 214290.12, "center_y": 2558010.24, "area_m2": 0.38, "aspect_rat": 1.1, "elev_z": 36.1, "height_m": 1.7, "lat": 25.04743, "lon": 121.53266},
    {"id": 5, "cls": "cone", "score": 0.801, "center_x": 214289.22, "center_y": 2558008.12, "area_m2": 0.12, "aspect_rat": 0.98, "elev_z": 36.1, "height_m": 0.7, "lat": 25.04745, "lon": 121.53262},
]

# ----- API 端點 -----
@app.get("/")
async def root():
    return {"status": "ok", "message": "UAV AIP API 運行中"}

@app.get("/api/detections/{project_id}")
async def get_detections(project_id: str):
    return MOCK_DATA

@app.get("/api/projects")
async def get_projects():
    return [{"id": "futas", "name": "FUTAS_Test_Field"}, {"id": "harbor", "name": "Harbor_Breakwater"}]

@app.get("/api/gpu/status")
async def get_gpu_status():
    try:
        import torch
        if torch.cuda.is_available():
            return {"name": torch.cuda.get_device_name(0), "status": "online"}
    except:
        pass
    return {"name": "CPU Mode", "status": "offline"}

# ----- 用 thread 跑 uvicorn（避免 Colab event loop 衝突）-----
def run_server():
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="error")

# ----- 用 thread 跑 cloudflared -----
def run_tunnel():
    process = subprocess.Popen(
        ["cloudflared", "tunnel", "--url", "http://localhost:8000"],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
    )
    for line in process.stderr:
        match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
        if match:
            print(f"\n{'='*60}")
            print(f"🚀 API 伺服器已啟動！")
            print(f"📡 公開網址: {match.group()}")
            print(f"{'='*60}")
            print(f"\n👉 把這個網址填入前端 src/api/queries.ts 第 17 行")
            break

# ----- 啟動 -----
print("正在啟動伺服器...")
threading.Thread(target=run_server, daemon=True).start()
time.sleep(2)
print("正在建立 Cloudflare Tunnel...")
threading.Thread(target=run_tunnel, daemon=True).start()

# 保持運行（按 Colab 的停止按鈕結束）
while True:
    time.sleep(1)
