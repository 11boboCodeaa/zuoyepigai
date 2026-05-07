# 作业批改助手

> 基于通义千问 VL 的语文作业 AI 批改工具，目标是把老师从重复性批改中解放出来。

## 功能

1. **作文批改**
   - 自动识别手写作文原文
   - 找出错别字、病句
   - 从结构、立意、语言三方面点评
   - 给出 100 分制建议分数和具体修改意见

2. **主观题查重批改**
   - 同时判断"答案是否正确"和"是否照搬参考答案"
   - 四档判定：独立表达 / 部分照搬 / 照搬答案 / 答案错误
   - 给出查重依据（例：与参考答案有 12 字连续相同）
   - 给学生写评语

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React 18 + Vite + TypeScript + Tailwind CSS |
| 后端 | FastAPI + Python 3.10+ |
| 模型 | 通义千问 `qwen-vl-max-latest`（阿里百炼） |
| 图标 | Lucide React |

## 准备工作

### 1. 申请通义千问 API Key

1. 打开 [阿里百炼控制台](https://bailian.console.aliyun.com/)
2. 用阿里云账号登录（没有就注册一个，新用户有免费额度）
3. 左侧菜单 → **API-KEY 管理** → 创建新 Key
4. 复制 Key，形如 `sk-xxxxxxxxxxxxxxxxxxxxxxxx`

### 2. 安装本地环境

- **Python 3.10+**：[python.org](https://www.python.org/downloads/)
- **Node.js 18+**：[nodejs.org](https://nodejs.org/)

## 启动

### 后端

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 配置 Key
copy .env.example .env
# 编辑 .env，把 DASHSCOPE_API_KEY 填上

python run.py
```

后端会监听 `http://localhost:8000`，访问 `http://localhost:8000/docs` 可以看 API 文档。

### 前端

新开一个终端：

```powershell
cd frontend
npm install
npm run dev
```

打开浏览器访问 `http://localhost:5173`。

> 前端的 Vite dev server 已配置代理，所有 `/api/*` 请求会自动转发到后端 8000 端口，不用关心跨域。

## 使用

### 作文批改

1. 在首页选 **作文批改** Tab
2. 点击上传区域选择作文照片（或手机直接拍照）
3. 点 **开始批改**，等待 10-30 秒
4. 查看错别字、病句、各维度点评和总评

### 主观题查重

1. 切到 **主观题查重** Tab
2. 上传学生作答的照片
3. 在文本框粘贴参考答案（**强烈建议提供**，否则只能判对错，无法查重）
4. 点 **开始批改**

## 接口

### POST `/api/correct/essay`

- form-data:
  - `image`: 图片文件
- 返回: `EssayResult` JSON

### POST `/api/correct/subjective`

- form-data:
  - `image`: 图片文件
  - `reference`: 参考答案文本（可选）
- 返回: `SubjectiveResult` JSON

字段定义见 [`backend/app/schemas.py`](./backend/app/schemas.py)。

### GET `/api/health`

健康检查 + 当前模型 + Key 是否已配置。

## 成本估算

`qwen-vl-max-latest` 当前定价约：
- 输入：0.02 元 / 千 tokens
- 输出：0.06 元 / 千 tokens

一篇手写作文（含图片）单次批改大约消耗 **0.05-0.15 元**。一天批 50 份作业大约 5 块钱以内。

如想进一步降本，把 `.env` 中的 `QWEN_VL_MODEL` 改为 `qwen-vl-plus-latest`（便宜约 5 倍，效果也够用）。

## 后续可扩展

- [ ] 在原图上画红笔标注（需要拿字符 bbox + PIL 画框）
- [ ] 批改历史 SQLite 持久化
- [ ] 多张图一次批量上传
- [ ] 导出 Word / PDF 批改报告
- [ ] 数学题、英语作业支持
- [ ] 微信小程序版

## 注意事项

- **图片清晰度直接影响识别效果**，光线充足、字迹工整、避免反光
- **AI 批改仅供参考**，最终判定以教师为准
- 主观题查重判定的依赖是参考答案的质量，参考答案越完整准确越好
- 不要把学生敏感信息（姓名、学号等）上传到非合规模型
