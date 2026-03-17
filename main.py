"""
图片背景去除器后端 - 使用 Remove.bg API
"""
import os
import base64
import uuid
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import requests

app = FastAPI(title="图片背景去除器")

# Remove.bg API 配置 (从环境变量读取)
REMOVE_BG_API_KEY = os.getenv("REMOVE_BG_API_KEY")
if not REMOVE_BG_API_KEY:
    raise ValueError("请设置环境变量 REMOVE_BG_API_KEY")

REMOVE_BG_URL = "https://api.remove.bg/v1.0/removebg"

# 文件存储目录
UPLOAD_DIR = Path("/root/.openclaw/workspace_program/project/static/results")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 挂载静态文件
STATIC_DIR = Path("/root/.openclaw/workspace_program/project/static")
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def root():
    """返回前端页面"""
    from fastapi.responses import FileResponse
    return FileResponse(str(STATIC_DIR / "index.html"))


@app.post("/api/remove-bg")
async def remove_background(file: UploadFile = File(...)):
    """去除图片背景"""
    
    # 验证文件类型
    if file.content_type not in ["image/png", "image/jpeg", "image/webp"]:
        raise HTTPException(status_code=400, detail="只支持 PNG、JPG、WebP 格式")
    
    # 读取图片内容
    image_content = await file.read()
    
    # 检查文件大小 (最大 10MB)
    if len(image_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="图片大小不能超过 10MB")
    
    # 调用 Remove.bg API
    files = {
        "image_file": (file.filename, image_content, file.content_type)
    }
    data = {
        "size": "auto",
        "format": "png"
    }
    headers = {
        "X-Api-Key": REMOVE_BG_API_KEY
    }
    
    try:
        response = requests.post(
            REMOVE_BG_URL,
            files=files,
            data=data,
            headers=headers,
            timeout=60
        )
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="请求超时，请稍后重试")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"API 请求失败: {str(e)}")
    
    if response.status_code == 402:
        raise HTTPException(status_code=402, detail="API 积分不足，请联系管理员充值")
    
    if response.status_code == 403:
        raise HTTPException(status_code=403, detail="API Key 无效")
    
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=f"API 返回错误: {response.text[:200]}")
    
    # 保存结果图片
    result_filename = f"{uuid.uuid4().hex}.png"
    result_path = UPLOAD_DIR / result_filename
    
    with open(result_path, "wb") as f:
        f.write(response.content)
    
    # 返回结果
    image_url = f"/static/results/{result_filename}"
    
    return JSONResponse({
        "success": True,
        "image_url": image_url
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)
