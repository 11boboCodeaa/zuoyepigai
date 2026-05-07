"""启动脚本。

- 本地开发：直接 `python run.py`（开 reload）
- 云部署（Render 等）：会注入 PORT 环境变量，自动用它；同时关闭 reload
"""
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    # PORT 环境变量通常意味着在云端，关闭 reload
    in_cloud = "PORT" in os.environ
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=not in_cloud,
    )
