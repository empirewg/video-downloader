# 视频下载器

支持从哔哩哔哩(B站)和抖音下载视频的在线工具。

## 为什么需要代理服务器？

由于**浏览器CORS安全限制**，部署在 `github.io` 的前端网页**无法直接访问** B站和抖音的API。需要一个代理服务器进行中转：

```
你的网页 (GitHub Pages)  →  代理服务器  →  B站/抖音 API
                              ↑
                        （服务器端不受CORS限制）
```

我们提供**4种代理部署方案**，你可以根据自己的网络情况选择：

| 平台 | 访问难度 | 免费额度 | 稳定性 | 推荐度 |
|------|---------|---------|--------|--------|
| **Cloudflare Workers** | 有时需翻墙 | 10万次/天 | ★★★★★ | ⭐ 首选 |
| **Vercel Functions** | 通常可访问 | 100GB/月 | ★★★★ | ⭐⭐ 推荐 |
| **Render.com** | 通常可访问 | 750小时/月 | ★★★★ | ⭐⭐ 推荐 |
| **Railway.app** | 通常可访问 | 5美元/月 | ★★★ | ⭐⭐ |

---

## 快速开始（3步走）

### 第一步：选择一个代理平台并部署

根据你的网络情况，选择下方**任一方案**部署代理：

---

### 方案A：Cloudflare Workers（首选）

如果 `https://dash.cloudflare.com` **能打开**，用这个：

1. 访问 [dash.cloudflare.com](https://dash.cloudflare.com) 注册/登录
2. 左侧菜单 → **Workers & Pages** → **Create**
3. 选择 **Create Worker**
4. 给 Worker 起个名字（如 `video-parser`）
5. 点击 **Deploy**，然后点击 **Edit Code**
6. 将项目中的 [`worker.js`](./worker.js) 全部代码粘贴进去，替换默认代码
7. 点击 **Save and Deploy**
8. 记下你的 Worker 地址：`https://video-parser.你的用户名.workers.dev`

---

### 方案B：Vercel Functions（推荐备选）

如果 Cloudflare 打不开，用 Vercel：

1. 访问 [vercel.com/signup](https://vercel.com/signup) 用 GitHub 账号注册
2. 在 Dashboard 点击 **Add New...** → **Project**
3. 导入你的 GitHub 仓库（上传本项目代码）
4. 框架预设选 **Other**，Root Directory 保持默认
5. 点击 **Deploy**，等待部署完成
6. 部署完成后，访问 `https://你的项目名.vercel.app`

> ⚠️ Vercel 部署需要把 `proxy/vercel.js` 放到项目根目录的 `api/index.js`，具体见下方文件说明。

**Vercel 专用文件结构（如果需要单独部署代理）：**

```
vercel-proxy/
├── api/
│   └── index.js          ← 将 proxy/vercel.js 复制到这里
├── vercel.json           ← 项目根目录已有
└── package.json          ← 项目根目录已有
```

---

### 方案C：Render.com（最稳定的备选）

1. 访问 [render.com](https://render.com) 用 GitHub 账号注册
2. 点击 **New +** → **Web Service**
3. 连接你的 GitHub 仓库
4. 配置：
   - **Name**: `video-parser-proxy`
   - **Root Directory**: `proxy/express`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. 点击 **Create Web Service**
6. 等待部署完成，获取 URL：`https://video-parser-proxy.onrender.com`

---

### 方案D：Railway.app

1. 访问 [railway.app](https://railway.app) 用 GitHub 账号注册
2. 点击 **New Project** → **Deploy from GitHub repo**
3. 选择你的仓库
4. 添加环境变量（如果需要）
5. 部署完成后获取 URL

---

### 第二步：配置前端代理地址

**方法1：通过 .env 文件（推荐）**

1. 复制 `.env.example` 为 `.env`：
   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env`，填入你的代理地址：
   ```
   VITE_PROXY_URL=https://video-parser.你的用户名.workers.dev
   ```
   
   或 Vercel：
   ```
   VITE_PROXY_URL=https://你的项目名.vercel.app
   ```
   
   或 Render：
   ```
   VITE_PROXY_URL=https://video-parser-proxy.onrender.com
   ```

3. 重新构建：
   ```bash
   npm run build
   ```

**方法2：直接修改代码**

打开 `src/lib/videoParser.ts`，找到 `FALLBACK_URL` 直接填写：

```typescript
const FALLBACK_URL = 'https://video-parser.你的用户名.workers.dev';
```

---

### 第三步：部署到 GitHub Pages

1. 在 GitHub 创建一个新仓库（如 `video-downloader`）
2. 推送代码到仓库：

```bash
git init
git remote add origin https://github.com/你的用户名/video-downloader.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

3. 打开仓库的 **Settings → Pages**
4. Source 选择 **GitHub Actions**
5. 项目已包含 `.github/workflows/deploy.yml`，会自动部署
6. 等待几分钟，访问 `https://你的用户名.github.io/video-downloader`

---

## 项目文件说明

```
├── worker.js                       # Cloudflare Workers 代理代码
├── proxy/
│   ├── vercel.js                   # Vercel Edge Function 代理
│   ├── server.js                   # Express 通用代理（Render/Railway）
│   └── package.json                # Express 版本的依赖
├── src/
│   ├── App.tsx                     # 主界面
│   └── lib/videoParser.ts          # 前端调用代理的代码
├── .env.example                    # 环境变量模板
├── vercel.json                     # Vercel 路由配置
└── README.md
```

---

## 本地开发

```bash
# 安装依赖
npm install

# 配置代理地址（创建 .env 文件）
cp .env.example .env
# 编辑 .env 填入 VITE_PROXY_URL

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

---

## 常见问题

### Q: Cloudflare 打不开怎么办？
**A:** 直接换 **Vercel** 或 **Render**，这两个在国内通常可以正常访问。Render.com 是最稳定的免费方案。

### Q: 代理服务收费吗？
**A:** 上述所有平台的免费额度都足够个人使用：
- Cloudflare Workers: 10万次请求/天
- Vercel: 100GB 带宽/月
- Render.com: 750小时运行/月

### Q: 支持哪些视频链接格式？
**B站：**
- `https://www.bilibili.com/video/BV1xx411c7mD`
- `https://b23.tv/xxxxx`（短链）

**抖音：**
- `https://www.douyin.com/video/xxxxxx`
- `https://v.douyin.com/xxxxx`（分享短链）

### Q: 为什么有时候解析失败？
**A:** 可能原因：
1. B站/抖音更新了反爬机制
2. 代理服务需要更新Cookie（特别是抖音）
3. 视频被删除或受限
4. 链接格式不正确

---

## 免责声明

本工具仅供学习交流使用，请遵守相关平台的使用条款和版权声明。

## License

MIT
