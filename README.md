# 视频下载器

支持从哔哩哔哩(B站)和抖音下载视频的在线工具。

## 架构说明

```
GitHub Pages (前端网页)  →  Render.com (代理API)  →  B站/抖音 API
```

- **前端**部署在 GitHub Pages（免费静态托管）
- **代理**部署在 Render.com（免费Node服务器）
- 代理解决浏览器CORS限制，中转请求到B站和抖音

---

## 快速部署（2步走）

### 第1步：部署前端到 GitHub Pages

#### 1.1 推送代码到 GitHub

```bash
# 1. 在 GitHub 创建新仓库（如 video-downloader）
#    访问 https://github.com/new

# 2. 在本地项目目录执行：
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/video-downloader.git
git push -u origin main
```

#### 1.2 配置 GitHub Pages（⚠️ 必须用 GitHub Actions）

1. 打开仓库 → **Settings** → **Pages**
2. **Build and deployment** 区域：
   - **Source**: 选择 **GitHub Actions**（不要选 Deploy from a branch）
3. 项目已包含 `.github/workflows/deploy.yml`，推送后会自动触发部署
4. 等待几分钟，访问 `https://你的用户名.github.io/video-downloader`

> ⚠️ **重要**：如果选 "Deploy from a branch" 会导致页面空白，因为浏览器无法直接运行TypeScript源码。必须用 GitHub Actions 来执行 `npm run build` 生成 dist 文件夹后再部署。

---

### 第2步：部署代理到 Render

#### 2.1 注册/登录 Render

1. 访问 [render.com](https://render.com)
2. 用 GitHub 账号注册/登录

#### 2.2 创建 Web Service

1. 点击 **New +** → **Web Service**
2. 搜索你的 `video-downloader` 仓库，选中它
3. 填写配置：

| 字段 | 填写内容 |
|------|---------|
| **Name** | `video-parser-proxy` |
| **Region** | `Singapore` |
| **Branch** | `main` |
| **Root Directory** | `proxy` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Plan** | Free |

4. 点击 **Create Web Service**，等待部署完成（约2分钟）
5. 获取你的代理地址：`https://video-parser-proxy.onrender.com`

#### 2.3 配置代理地址到前端

1. 在前端仓库根目录创建 `.env` 文件：
```
VITE_PROXY_URL=https://video-parser-proxy.onrender.com
```

2. 提交并推送：
```bash
git add .env
git commit -m "Add proxy URL"
git push
```

3. GitHub Actions 会自动重新构建并部署

---

## 项目结构

```
video-downloader/
├── .github/workflows/deploy.yml   # GitHub Actions 自动部署
├── proxy/                         # ← Render 代理服务
│   ├── server.js                  #   Express代理（解析B站+抖音）
│   └── package.json               #   代理依赖
├── src/                           # ← 前端源代码
│   ├── App.tsx                    #   主界面
│   ├── lib/videoParser.ts         #   调用代理的代码
│   └── ...                        #   其他组件
├── package.json                   # 前端依赖
├── vite.config.ts                 # Vite配置
└── index.html
```

---

## 常见问题

### Q: 页面空白怎么办？
**A:** 检查 GitHub Pages 的 Source 是否设为 **GitHub Actions**。如果选了 "Deploy from a branch" 就会空白，因为浏览器无法直接运行 TypeScript 源码。

### Q: GitHub Actions 部署失败？
**A:** 进入仓库 → Actions 标签页，查看工作流日志，通常是 Node 版本或依赖安装问题。

### Q: 解析失败？
**A:** 
1. 检查 Render 代理是否正常运行（访问代理URL看是否有响应）
2. 检查 `.env` 文件中的 `VITE_PROXY_URL` 是否填对
3. 确保链接格式正确（支持BV号、b23.tv短链、抖音视频链接、v.douyin.com短链）

---

## 免责声明

本工具仅供学习交流使用，请遵守相关平台的使用条款和版权声明。

## License

MIT
