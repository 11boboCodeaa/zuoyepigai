# 部署上线手册（方案 B：前端 Netlify + 后端 Render）

按这个手册一步一步操作，全程约 30-45 分钟。所有步骤都不收钱（前提是你不超出免费额度）。

---

## 第 0 步：把代码推到 GitHub

Render 和 Netlify 都需要从 GitHub 仓库部署，所以先把项目放到 GitHub。

### 0.1 注册 GitHub 账号

如果你还没有：打开 https://github.com/ → Sign up → 用邮箱注册 → 验证邮箱。

### 0.2 安装 Git

下载 https://git-scm.com/download/win → 一路 Next 安装。安装完打开 PowerShell 输入 `git --version` 看到版本号即成功。

### 0.3 在 GitHub 上创建一个新仓库

1. 登录 GitHub → 右上角 `+` → `New repository`
2. Repository name：`zuoyepigai`
3. **务必选 `Private`**（私有仓库，别人看不到你代码 —— 虽然代码里没 Key，但稳一点好）
4. 不勾选 "Add a README file"（项目里已有）
5. 点 `Create repository`

### 0.4 把本地代码推上去

GitHub 创建完会显示一段命令，类似这样。**在 PowerShell 里到项目目录执行**（替换成你自己的用户名）：

```powershell
cd e:\2026Work\zuoyepigai
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/zuoyepigai.git
git push -u origin main
```

第一次 push 会让你登录 GitHub，按提示完成即可。

> **🔒 安全自检**：push 之前确认 `.env` 文件**没有**被加进去。我已经在 `.gitignore` 里排除了它。你可以执行 `git status` 查看，应该不会出现 `.env`。

---

## 第 1 步：部署后端到 Render

### 1.1 注册 Render

打开 https://render.com/ → `Get Started` → 选 `Sign in with GitHub`，授权登录（推荐这种，不用记新密码）。

### 1.2 用 Blueprint 一键部署

1. 登录后右上角 `New +` → `Blueprint`
2. 选你刚才推上去的 `zuoyepigai` 仓库
3. Render 会自动读取根目录的 `render.yaml`，识别出 `zuoyepigai-backend` 这个服务
4. 点 `Apply`

### 1.3 配置环境变量（关键！）

`render.yaml` 里有 3 个变量标了 `sync: false`，意思是 Render 部署时会让你**手动填**：

| 变量名 | 填什么 |
|---|---|
| `DASHSCOPE_API_KEY` | 你的千问 API Key（`sk-` 开头那个） |
| `ACCESS_TOKEN` | 你自己想一个长一点的随机字符串（比如 `mySchool2026Pwd!xK9zQ` ），充当访问密码 |
| `ALLOWED_ORIGINS` | 暂时填 `*`（部署完前端后再回来改成 Netlify 域名） |

填完点 `Apply` / `Create`。Render 会开始构建，大概等 3-5 分钟。

### 1.4 拿到后端公网域名

构建完成后，Render 会显示你的后端地址，类似：

```
https://zuoyepigai-backend.onrender.com
```

**把这个地址记下来**，下面前端要用。

### 1.5 测试后端

浏览器打开：

```
https://zuoyepigai-backend.onrender.com/api/health
```

应该看到：

```json
{"ok":true,"model":"qwen-vl-max-latest","key_configured":true}
```

> ⚠️ 第一次访问可能要等 30-50 秒（冷启动），看到上面这个 JSON 就成功了。

---

## 第 2 步：部署前端到 Netlify

### 2.1 注册 Netlify

打开 https://app.netlify.com/ → `Sign up` → 选 `GitHub`，同样用 GitHub 账号登录。

### 2.2 创建一个新站点

1. 左侧 `Sites` → 右上 `Add new site` → `Import an existing project`
2. 选 `Deploy with GitHub` → 授权
3. 选你的 `zuoyepigai` 仓库
4. Netlify 会自动识别 `frontend/netlify.toml` 里的配置：
   - Base directory: `frontend`
   - Build command: `npm install && npm run build`
   - Publish directory: `frontend/dist`
5. **先不要点 Deploy**，往下看 Site settings

### 2.3 配置环境变量

在部署设置页面找到 `Environment variables` 区域（或者部署完后到 Site settings → Build & deploy → Environment）：

| 变量名 | 填什么 |
|---|---|
| `VITE_API_BASE_URL` | 第 1.4 步拿到的后端地址，**不要带末尾的 `/`**，例如 `https://zuoyepigai-backend.onrender.com` |
| `VITE_ACCESS_TOKEN` | 第 1.3 步你设的那个 `ACCESS_TOKEN`，**必须完全一致** |

### 2.4 点击 Deploy

回到部署页，点 `Deploy site`。Netlify 会构建前端，约 2-3 分钟。

### 2.5 拿到前端公网域名

部署完成后，Netlify 会给你一个域名，类似：

```
https://amazing-curie-abc123.netlify.app
```

可以在 Site settings → Domain management 里改成更好记的子域名，比如 `zuoyepigai.netlify.app`（如果没被占用的话）。

---

## 第 3 步：把前端域名告诉后端（CORS 收紧）

为了更安全，最后把后端的 `ALLOWED_ORIGINS` 改成只允许你的 Netlify 域名：

1. 回到 Render 控制台 → 你的服务 → `Environment` 标签
2. 找到 `ALLOWED_ORIGINS`，改成你的 Netlify 域名，例如：
   ```
   https://amazing-curie-abc123.netlify.app
   ```
3. 保存。Render 会自动重启服务，1-2 分钟后生效。

---

## ✅ 完成！

把 Netlify 域名发给你朋友，告诉他要在浏览器里用即可。

---

## 给朋友的简明说明（你可以直接复制发给他）

> 我做了个作文批改工具，用阿里通义千问帮你看作文：
>
> 网址：https://你的域名.netlify.app
>
> 怎么用：打开网页 → 选 Tab → 拍/选作文照片 → 点开始批改，等约 70 秒就能看到结果。
>
> 注意事项：
> 1. 第一次打开如果点了没反应，是后端在唤醒（睡眠状态），等 30 秒再点一次
> 2. 涂改太多的草稿识别效果会差，最好是清稿
> 3. 这是测试版只给你用，**别外传链接**，因为 API 调用费用算我账上 🙏

---

## 🛠️ 排错

### 问题：朋友打开网页点开始批改 → 报错 "请求失败 401"
**原因**：`VITE_ACCESS_TOKEN`（前端）和 `ACCESS_TOKEN`（后端）不一致。
**解决**：去 Render 和 Netlify 检查两个值是否完全相同（区分大小写、空格）。

### 问题：朋友打开网页点开始批改 → 报错 "Failed to fetch" / "网络错误"
**原因**：后端冷启动还没好，或 `VITE_API_BASE_URL` 没配置对。
**解决**：
1. 浏览器直接访问 `https://你的后端.onrender.com/api/health`，看是否返回 JSON
2. 检查 Netlify 环境变量 `VITE_API_BASE_URL` 末尾**没有**斜杠

### 问题：朋友打开网页点开始批改 → 报错 "CORS 错误"
**原因**：`ALLOWED_ORIGINS` 没把朋友访问的 Netlify 域名加进去。
**解决**：去 Render 修改 `ALLOWED_ORIGINS` 为 Netlify 完整域名（含 https://）。

### 问题：账单担心 — 怕被刷
**保护措施**（已经做了）：
- 后端有 `ACCESS_TOKEN` 校验，没有令牌的人请求会被 401 拒绝
- 前端代码里令牌是构建时硬编码的，但访问者要靠 Netlify 域名 + 朋友别外传，才能拿到令牌
- **如果不慎泄露**，立刻去 Render 改 `ACCESS_TOKEN` 为新值，再去 Netlify 改 `VITE_ACCESS_TOKEN` 为同一个新值，重新部署即可

### 问题：想下线
- **完全下线**：去 Render → 你的服务 → Settings → 拉到底 → Delete service。Netlify 同理，Site settings → Delete this site。
- **临时关闭**：Render 服务 → Settings → Suspend Service。需要时再 Resume。
