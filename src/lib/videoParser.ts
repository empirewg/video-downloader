import type { Platform, ParseResult } from '@/types';

// ============================================
// 配置代理地址
// 
// 方法1（推荐）: 创建 .env 文件，设置 VITE_PROXY_URL=你的代理地址
// 方法2: 直接修改下面的 FALLBACK_URL
// 
// 支持的代理平台:
// - Cloudflare Workers (worker.js)
// - Vercel Functions (proxy/vercel.js) 
// - Express Server (proxy/server.js → Render/Railway/Fly.io)
// ============================================
const FALLBACK_URL = ''; // 备用：直接填写代理地址

// 优先读取环境变量，其次使用备用地址
const PROXY_URL = (import.meta.env?.VITE_PROXY_URL as string) || FALLBACK_URL || '';

export function detectPlatform(url: string): Platform {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('bilibili.com') || lowerUrl.includes('b23.tv')) {
    return 'bilibili';
  }
  if (lowerUrl.includes('douyin.com') || lowerUrl.includes('iesdouyin.com') || lowerUrl.includes('v.douyin.com')) {
    return 'douyin';
  }
  return 'unknown';
}

export function isWorkerConfigured(): boolean {
  return PROXY_URL.trim().length > 0;
}

export function getWorkerUrl(): string {
  return PROXY_URL.replace(/\/$/, '');
}

// 使用 Cloudflare Worker 代理解析视频
export async function parseVideo(url: string): Promise<ParseResult> {
  if (!isWorkerConfigured()) {
    return { 
      success: false, 
      error: '尚未配置代理服务。请按照README部署代理并配置PROXY_URL。' 
    };
  }

  const platform = detectPlatform(url);
  
  if (platform === 'unknown') {
    return { success: false, error: '不支持的链接格式，请输入B站或抖音视频链接' };
  }

  try {
    const workerUrl = getWorkerUrl();
    const apiUrl = `${workerUrl}/api/parse?url=${encodeURIComponent(url)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.error || `Worker请求失败 (HTTP ${response.status})` 
      };
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, error: '请求超时，请稍后重试' };
      }
      return { success: false, error: `网络错误: ${error.message}` };
    }
    return { success: false, error: '未知网络错误' };
  }
}

export function getPlatformName(platform: Platform): string {
  switch (platform) {
    case 'bilibili': return '哔哩哔哩';
    case 'douyin': return '抖音';
    default: return '未知平台';
  }
}

export function getPlatformColor(platform: Platform): string {
  switch (platform) {
    case 'bilibili': return '#00A1D6';
    case 'douyin': return '#000000';
    default: return '#666666';
  }
}
