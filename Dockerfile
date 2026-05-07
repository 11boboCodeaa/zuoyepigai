# Hugging Face Spaces 部署用的 Dockerfile（后端 FastAPI 服务）
# HF 会自动 build 这个镜像并运行，监听 PORT 环境变量（默认 7860）

FROM python:3.11-slim

# 安装系统依赖（dashscope 可能需要 ssl 证书等）
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先装 Python 依赖（利用 Docker layer cache）
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# 拷贝后端代码
COPY backend/ /app/

# HF Spaces 注入 PORT，默认 7860
ENV PORT=7860
EXPOSE 7860

# 启动（run.py 会自动读取 $PORT）
CMD ["python", "run.py"]
