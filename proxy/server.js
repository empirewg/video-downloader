/**
 * Express 代理服务器 - 通用版本
 * 
 * 可部署到以下平台（均提供免费额度）：
 * - Render.com (https://render.com) - 推荐，稳定
 * - Railway.app (https://railway.app) - 需要绑卡但免费额度够用
 * - Fly.io (https://fly.io) - 有免费套餐
 * - Heroku (https://heroku.com) - 有免费计划
 * 
 * 部署步骤（以 Render.com 为例）：
 * 1. 访问 https://render.com 用 GitHub 账号注册/登录
 * 2. 点击 "New +" → "Web Service"
 * 3. 连接你的 GitHub 仓库
 * 4. 配置：
 *    - Name: video-parser-proxy
 *    - Root Directory: proxy/express
 *    - Runtime: Node
 *    - Build Command: npm install
 *    - Start Command: node server.js
 * 5. 点击 "Create Web Service"
 * 6. 等待部署完成，获取 URL（如 https://video-parser-proxy.onrender.com）
 * 7. 将 URL 填入前端代码的 WORKER_URL
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// 启用 CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// ============ B站解析 ============

function extractBvid(url) {
  const bvMatch = url.match(/BV[a-zA-Z0-9]+/i);
  if (bvMatch) return bvMatch[0];
  const shortMatch = url.match(/b23\.tv\/([a-zA-Z0-9]+)/i);
  if (shortMatch) return { shortCode: shortMatch[1] };
  return null;
}

async function resolveB23ShortLink(shortCode) {
  try {
    const resp = await fetch(`https://b23.tv/${shortCode}`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const location = resp.headers.get('location') || '';
    const bvidMatch = location.match(/BV[a-zA-Z0-9]+/i);
    return bvidMatch ? bvidMatch[0] : null;
  } catch (e) { return null; }
}

function formatDuration(seconds) {
  const sec = parseInt(seconds);
  if (isNaN(sec)) return '';
  const mins = Math.floor(sec / 60);
  const remainingSecs = sec % 60;
  return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
}

async function parseBilibili(url) {
  let bvid = extractBvid(url);
  if (bvid && typeof bvid === 'object' && bvid.shortCode) {
    bvid = await resolveB23ShortLink(bvid.shortCode);
    if (!bvid) return { success: false, error: '无法解析B站短链接' };
  }
  if (!bvid) return { success: false, error: '无法从链接中提取BV号' };

  try {
    const viewResp = await fetch(
      `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://www.bilibili.com' } }
    );
    const viewData = await viewResp.json();
    if (viewData.code !== 0) return { success: false, error: `B站API错误: ${viewData.message || '未知错误'}` };

    const video = viewData.data;
    const cid = video.cid;
    const title = video.title;
    const author = video.owner.name;
    const cover = video.pic;
    const duration = video.duration;

    const playurlResp = await fetch(
      `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=80&fnval=16&fourk=1`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': `https://www.bilibili.com/video/${bvid}` } }
    );
    const playurlData = await playurlResp.json();

    const formats = [];
    if (playurlData.code === 0 && playurlData.data) {
      if (playurlData.data.dash && playurlData.data.dash.video) {
        const qualityMap = { 127: '8K', 126: '4K', 125: '2K', 120: '4K', 116: '1080P60', 112: '1080P+', 80: '1080P', 74: '720P60', 64: '720P', 32: '480P', 16: '360P' };
        const seen = new Set();
        const uniqueVideos = playurlData.data.dash.video
          .filter(v => { if (seen.has(v.id)) return false; seen.add(v.id); return true; })
          .sort((a, b) => b.id - a.id);
        for (const v of uniqueVideos.slice(0, 3)) {
          formats.push({ quality: qualityMap[v.id] || `${v.id}`, format: 'mp4', url: v.baseUrl || v.base_url });
        }
      }
      if (playurlData.data.durl && playurlData.data.durl.length > 0) {
        const durl = playurlData.data.durl[0];
        formats.push({ quality: '直接下载', format: 'mp4', url: durl.url });
      }
    }

    if (formats.length === 0) {
      formats.push({ quality: '默认', format: 'mp4', url: `https://www.bilibili.com/video/${bvid}`, description: '请前往B站观看' });
    }

    return { success: true, data: { title, author, cover, duration: formatDuration(duration), platform: 'bilibili', url: `https://www.bilibili.com/video/${bvid}`, formats } };
  } catch (e) { return { success: false, error: `解析异常: ${e.message}` }; }
}

// ============ 抖音解析 ============

function extractDouyinVideoId(url) {
  const idMatch = url.match(/video\/(\d+)/);
  if (idMatch) return { type: 'direct', id: idMatch[1] };
  const shortMatch = url.match(/v\.douyin\.com\/([a-zA-Z0-9_-]+)/i);
  if (shortMatch) return { type: 'short', code: shortMatch[1] };
  const iesMatch = url.match(/iesdouyin\.com\/share\/video\/(\d+)/);
  if (iesMatch) return { type: 'direct', id: iesMatch[1] };
  return null;
}

async function resolveDouyinShortLink(shortCode) {
  try {
    const resp = await fetch(`https://v.douyin.com/${shortCode}/`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15' }
    });
    const location = resp.headers.get('location') || '';
    const idMatch = location.match(/video\/(\d+)/);
    return idMatch ? idMatch[1] : null;
  } catch (e) { return null; }
}

async function parseDouyin(url) {
  const videoInfo = extractDouyinVideoId(url);
  let videoId = null;
  if (!videoInfo) return { success: false, error: '无法从链接中提取抖音视频ID' };
  if (videoInfo.type === 'short') {
    videoId = await resolveDouyinShortLink(videoInfo.code);
    if (!videoId) return { success: false, error: '无法解析抖音短链接' };
  } else { videoId = videoInfo.id; }

  try {
    const shareUrl = `https://www.douyin.com/video/${videoId}`;
    const pageResp = await fetch(shareUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8', 'Accept-Language': 'zh-CN,zh;q=0.9' }
    });
    const html = await pageResp.text();

    let title = '抖音视频', author = '未知作者', cover = '', videoUrl = '', duration = '';

    const renderDataMatch = html.match(/<script id="RENDER_DATA" type="application\/json">([^<]+)<\/script>/);
    if (renderDataMatch) {
      try {
        const renderData = JSON.parse(decodeURIComponent(renderDataMatch[1]));
        const appState = renderData['app'].state;
        const itemList = appState.itemList || {};
        const item = Object.values(itemList)[0];
        if (item) {
          title = item.desc || title;
          author = item.author?.nickname || author;
          cover = item.video?.cover?.url_list?.[0] || item.video?.dynamicCover?.url_list?.[0] || '';
          duration = item.video?.duration ? Math.floor(item.video.duration / 1000) : '';
          const playAddr = item.video?.playAddr?.url_list;
          if (playAddr && playAddr.length > 0) videoUrl = playAddr[0];
        }
      } catch (e) {}
    }

    if (!videoUrl) {
      const ssrDataMatch = html.match(/<script>window\._SSR_HYDRATED_DATA=([^<]+)<\/script>/);
      if (ssrDataMatch) {
        try {
          const ssrData = JSON.parse(ssrDataMatch[1].replace(/undefined/g, 'null'));
          const videoInfo2 = ssrData?.anyVideo?.gidInformation?.packerData?.video;
          if (videoInfo2) {
            title = videoInfo2.title || videoInfo2.desc || title;
            author = videoInfo2.author?.name || author;
            cover = videoInfo2.cover?.url || videoInfo2.dynamicCover?.url || cover;
            const bitRateList = videoInfo2.bitrateInfo;
            if (bitRateList && bitRateList.length > 0) {
              const best = bitRateList.sort((a, b) => (b.Bitrate || 0) - (a.Bitrate || 0))[0];
              videoUrl = best.playAddr?.[0]?.src || '';
            }
          }
        } catch (e) {}
      }
    }

    const formats = [];
    if (videoUrl) {
      formats.push({ quality: '无水印', format: 'mp4', url: videoUrl, description: '原画质无水印视频' });
    } else {
      formats.push({ quality: '默认', format: 'mp4', url: shareUrl, description: '请前往抖音查看' });
    }

    return { success: true, data: { title, author, cover, duration: duration ? formatDuration(duration) : undefined, platform: 'douyin', url: shareUrl, formats } };
  } catch (e) { return { success: false, error: `解析异常: ${e.message}` }; }
}

function detectPlatform(url) {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('bilibili.com') || lowerUrl.includes('b23.tv')) return 'bilibili';
  if (lowerUrl.includes('douyin.com') || lowerUrl.includes('iesdouyin.com')) return 'douyin';
  return 'unknown';
}

// ============ API Routes ============

app.get('/', (req, res) => {
  res.json({
    name: '视频解析代理服务 (Express)',
    version: '1.0.0',
    endpoints: { '/api/parse?url=xxx': 'GET - 解析视频链接' },
  });
});

app.get('/api/parse', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ success: false, error: '缺少 url 参数' });

  const platform = detectPlatform(videoUrl);
  if (platform === 'unknown') return res.status(400).json({ success: false, error: '不支持的链接格式' });

  let result;
  if (platform === 'bilibili') result = await parseBilibili(videoUrl);
  else if (platform === 'douyin') result = await parseDouyin(videoUrl);

  res.json(result);
});

app.listen(PORT, () => {
  console.log(`视频解析代理服务器运行在端口 ${PORT}`);
  console.log(`API地址: http://localhost:${PORT}/api/parse?url=...`);
});
