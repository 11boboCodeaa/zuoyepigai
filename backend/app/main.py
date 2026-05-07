"""FastAPI 入口。

提供两个端点：
- POST /api/correct/essay      作文批改
- POST /api/correct/subjective 主观题查重批改
"""
from __future__ import annotations

import os
from typing import Optional

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .prompts import (
    ESSAY_SYSTEM,
    ESSAY_USER,
    SUBJECTIVE_SYSTEM,
    SUBJECTIVE_USER_NO_REF,
    SUBJECTIVE_USER_TEMPLATE,
)
from .qwen_client import QwenError, call_qwen_vl
from .schemas import EssayResult, SubjectiveResult

# 兼容三种 .env 放置位置：当前工作目录 / backend/ / 项目根目录
# touch: trigger reload to pick up .env changes
_HERE = Path(__file__).resolve()
for candidate in (
    Path.cwd() / ".env",
    _HERE.parent.parent / ".env",  # backend/.env
    _HERE.parent.parent.parent / ".env",  # 项目根目录/.env
):
    if candidate.is_file():
        load_dotenv(candidate, override=False)

app = FastAPI(title="作业批改助手 API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_BYTES = 10 * 1024 * 1024  # 10MB


def _validate_image(file: UploadFile, data: bytes) -> str:
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(400, f"不支持的图片类型：{file.content_type}")
    if len(data) > MAX_BYTES:
        raise HTTPException(400, "图片过大，请压缩到 10MB 以内")
    if len(data) == 0:
        raise HTTPException(400, "空文件")
    # jpg 统一映射到 jpeg
    return "image/jpeg" if file.content_type == "image/jpg" else file.content_type


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "model": os.getenv("QWEN_VL_MODEL", "qwen-vl-max-latest"),
        "key_configured": bool(os.getenv("DASHSCOPE_API_KEY", "").strip()),
    }


@app.post("/api/correct/essay", response_model=EssayResult)
async def correct_essay(
    image: UploadFile = File(...),
    _: None = Depends(require_access_token),
):
    """批改作文：识别原文、找错别字病句、给评语和分数。"""
    data = await image.read()
    mime = _validate_image(image, data)

    try:
        raw = call_qwen_vl(
            image_bytes=data,
            system_prompt=ESSAY_SYSTEM,
            user_prompt=ESSAY_USER,
            mime=mime,
        )
    except QwenError as e:
        raise HTTPException(502, str(e))

    try:
        return EssayResult(**raw)
    except Exception as e:
        # 模型返回字段不全时给个兜底，把原始 JSON 透传给前端便于调试
        raise HTTPException(
            502,
            f"模型输出字段不完整：{e}。原始输出：{raw}",
        )


@app.post("/api/correct/subjective", response_model=SubjectiveResult)
async def correct_subjective(
    image: UploadFile = File(...),
    reference: Optional[str] = Form(None),
    _: None = Depends(require_access_token),
):
    """批改主观题：判断意思对错 + 是否照搬参考答案。

    reference 为可选的参考答案文本，多题时可在不同题目间用换行或编号分隔。
    """
    data = await image.read()
    mime = _validate_image(image, data)

    if reference and reference.strip():
        user_prompt = SUBJECTIVE_USER_TEMPLATE.format(reference=reference.strip())
    else:
        user_prompt = SUBJECTIVE_USER_NO_REF

    try:
        raw = call_qwen_vl(
            image_bytes=data,
            system_prompt=SUBJECTIVE_SYSTEM,
            user_prompt=user_prompt,
            mime=mime,
        )
    except QwenError as e:
        raise HTTPException(502, str(e))

    try:
        return SubjectiveResult(**raw)
    except Exception as e:
        raise HTTPException(
            502,
            f"模型输出字段不完整：{e}。原始输出：{raw}",
        )
