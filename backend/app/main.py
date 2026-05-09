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
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .prompts import (
    ESSAY_SYSTEM,
    SUBJECTIVE_SYSTEM,
    SUBJECTIVE_USER_NO_REF,
    SUBJECTIVE_USER_TEMPLATE,
    TOPIC_OCR_SYSTEM,
    TOPIC_OCR_USER,
    build_essay_user_prompt,
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

# CORS：通过 ALLOWED_ORIGINS 环境变量控制（多个用逗号分隔），未配置时允许所有
_origins_env = os.getenv("ALLOWED_ORIGINS", "").strip()
_allow_origins = [o.strip() for o in _origins_env.split(",") if o.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 访问令牌校验：通过 ACCESS_TOKEN 环境变量配置一个共享密码
# 前端请求需在 X-Access-Token 头里带相同的值；未配置时跳过（方便本地开发）
def require_access_token(
    x_access_token: Optional[str] = Header(default=None),
) -> None:
    expected = os.getenv("ACCESS_TOKEN", "").strip()
    if not expected:
        return
    if x_access_token != expected:
        raise HTTPException(401, "无效的访问令牌（X-Access-Token）")


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


@app.post("/api/ocr/topic")
async def ocr_topic(
    image: UploadFile = File(...),
    _: None = Depends(require_access_token),
):
    """从图片中识别作文题目和写作要求。返回 title / requirements / combined 三个字段。"""
    data = await image.read()
    mime = _validate_image(image, data)

    try:
        raw = call_qwen_vl(
            image_bytes=data,
            system_prompt=TOPIC_OCR_SYSTEM,
            user_prompt=TOPIC_OCR_USER,
            mime=mime,
        )
    except QwenError as e:
        raise HTTPException(502, str(e))

    return {
        "title": str(raw.get("title", "")).strip(),
        "requirements": str(raw.get("requirements", "")).strip(),
        "combined": str(raw.get("combined", "")).strip(),
    }


@app.post("/api/correct/essay", response_model=EssayResult)
async def correct_essay(
    image: UploadFile = File(...),
    topic: Optional[str] = Form(None),
    grade: Optional[str] = Form(None),
    target_word_count: Optional[int] = Form(None),
    _: None = Depends(require_access_token),
):
    """批改作文：双产出（修改稿 + 过关范文）+ 错别字/病句/评分。

    可选参数：
    - topic：作文题目/主旨要求（如需严格按题生成范文）
    - grade：学生年级（如 “小学三年级”），决定语言难度
    - target_word_count：范文目标字数
    """
    data = await image.read()
    mime = _validate_image(image, data)

    user_prompt = build_essay_user_prompt(
        topic=topic,
        grade=grade,
        target_word_count=target_word_count,
    )

    try:
        raw = call_qwen_vl(
            image_bytes=data,
            system_prompt=ESSAY_SYSTEM,
            user_prompt=user_prompt,
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
