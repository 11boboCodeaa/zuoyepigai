"""通义千问 VL 调用封装。

使用 dashscope SDK 的 MultiModalConversation。
图片以 base64 data URL 形式传入，避免依赖 OSS。
"""
import base64
import json
import os
import re
from typing import Any, Dict

import dashscope
from dashscope import MultiModalConversation


class QwenError(Exception):
    pass


def _ensure_api_key() -> str:
    key = os.getenv("DASHSCOPE_API_KEY", "").strip()
    if not key:
        raise QwenError("未配置 DASHSCOPE_API_KEY，请在 backend/.env 中填写阿里百炼的 API Key")
    dashscope.api_key = key
    return key


def _image_to_data_url(image_bytes: bytes, mime: str = "image/jpeg") -> str:
    b64 = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{mime};base64,{b64}"


def _extract_json(text: str) -> Dict[str, Any]:
    """从模型输出里抽出第一个 JSON 对象。
    模型偶尔会用 ```json 包裹或在前后加解释文字，做兼容。
    """
    if not text:
        raise QwenError("模型返回为空")

    # 先尝试 markdown 代码块
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence:
        candidate = fence.group(1)
    else:
        # 退化：取第一个 { 到最后一个 }
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise QwenError(f"未在模型输出中找到 JSON：{text[:200]}")
        candidate = text[start : end + 1]

    try:
        return json.loads(candidate)
    except json.JSONDecodeError as e:
        raise QwenError(f"模型输出不是合法 JSON：{e}\n原文片段：{candidate[:300]}")


def call_qwen_vl(
    image_bytes: bytes,
    system_prompt: str,
    user_prompt: str,
    mime: str = "image/jpeg",
    model: str | None = None,
) -> Dict[str, Any]:
    """调用千问 VL，返回解析后的 JSON。"""
    _ensure_api_key()
    model = model or os.getenv("QWEN_VL_MODEL", "qwen-vl-max-latest")

    data_url = _image_to_data_url(image_bytes, mime=mime)

    messages = [
        {"role": "system", "content": [{"text": system_prompt}]},
        {
            "role": "user",
            "content": [
                {"image": data_url},
                {"text": user_prompt},
            ],
        },
    ]

    response = MultiModalConversation.call(
        model=model,
        messages=messages,
        result_format="message",
    )

    if response.status_code != 200:
        raise QwenError(
            f"千问调用失败 status={response.status_code} code={response.code} msg={response.message}"
        )

    try:
        choice = response.output.choices[0]
        content = choice.message.content
        # content 是 list[dict]，取所有 text 段拼接
        if isinstance(content, list):
            text = "\n".join(part.get("text", "") for part in content if isinstance(part, dict))
        else:
            text = str(content)
    except Exception as e:
        raise QwenError(f"无法从响应中提取文本：{e}\n原始响应：{response}")

    return _extract_json(text)
