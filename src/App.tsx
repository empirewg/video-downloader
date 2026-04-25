import { useState, useCallback } from 'react';
import { 
  Download, 
  Link2, 
  Loader2, 
  Play, 
  Clock, 
  User, 
  FileVideo,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Github,
  Sparkles,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Toaster, toast } from 'sonner';
import { detectPlatform, parseVideo, getPlatformName, getPlatformColor, isWorkerConfigured, getWorkerUrl } from '@/lib/videoParser';
import type { VideoInfo } from '@/types';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState('');
  const [downloadProgress, setDownloadProgress] = useState<Record<string, boolean>>({});

  const handleParse = useCallback(async () => {
    if (!url.trim()) {
      toast.error('请输入视频链接');
      return;
    }

    const platform = detectPlatform(url);
    if (platform === 'unknown') {
      toast.error('请输入有效的B站或抖音视频链接');
      setError('请输入有效的B站或抖音视频链接');
      return;
    }

    setLoading(true);
    setError('');
    setVideoInfo(null);

    try {
      const result = await parseVideo(url);
      if (result.success && result.data) {
        setVideoInfo(result.data);
        toast.success('视频解析成功！');
      } else {
        setError(result.error || '解析失败');
        toast.error(result.error || '解析失败');
      }
    } catch (err) {
      setError('解析过程出错');
      toast.error('解析过程出错');
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handleDownload = useCallback(async (downloadUrl: string, quality: string) => {
    setDownloadProgress(prev => ({ ...prev, [quality]: true }));
    
    try {
      // 判断是否需要代理中转（B站/抖音有Referer防盗链）
      const needsProxy = downloadUrl.includes('bilibili') || 
                         downloadUrl.includes('akamaized') || 
                         downloadUrl.includes('douyin');
      
      if (needsProxy && isWorkerConfigured()) {
        // 通过代理中转下载（流式直链，不经过前端内存）
        const proxyUrl = getWorkerUrl();
        const platform = videoInfo?.platform || '';
        const proxyDownloadUrl = `${proxyUrl}/api/download?url=${encodeURIComponent(downloadUrl)}&platform=${platform}`;
        
        // 直接打开代理下载链接，浏览器流式接收文件
        window.location.href = proxyDownloadUrl;
        toast.success(`已开始下载 ${quality}`);
      } else {
        // 直接下载（非B站/抖音链接）
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.download = `video_${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`已开始下载 ${quality} 版本`);
      }
    } catch (err) {
      // 兜底：直接打开原始链接
      window.open(downloadUrl, '_blank');
      toast.info('已在新标签页打开视频链接，请右键选择"另存为"保存');
    } finally {
      setTimeout(() => {
        setDownloadProgress(prev => ({ ...prev, [quality]: false }));
      }, 3000);
    }
  }, [videoInfo]);

  const handleClear = useCallback(() => {
    setUrl('');
    setVideoInfo(null);
    setError('');
  }, []);

  const platform = detectPlatform(url);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="w-full border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent">
                视频下载器
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">B站 & 抖音</p>
            </div>
          </div>
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Github className="w-5 h-5 text-muted-foreground" />
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* 代理配置提示 */}
        {!isWorkerConfigured() && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold mb-1">需要部署代理服务</p>
                <p className="text-sm opacity-80 mb-2">
                  由于浏览器CORS安全限制，需要部署一个代理服务器作为API中转。以下平台均可免费部署：
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2 text-sm">
                  <a href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-amber-100/50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    Cloudflare Workers（推荐）
                  </a>
                  <a href="https://vercel.com/signup" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-amber-100/50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors">
                    <span className="w-2 h-2 rounded-full bg-black dark:bg-white"></span>
                    Vercel Functions
                  </a>
                  <a href="https://render.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-amber-100/50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Render.com
                  </a>
                  <a href="https://railway.app" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-amber-100/50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    Railway.app
                  </a>
                </div>
                <ol className="text-sm space-y-1 list-decimal list-inside opacity-80">
                  <li>选择上方任一平台注册/登录（推荐 Vercel 或 Render）</li>
                  <li>根据README中的部署指南创建代理服务</li>
                  <li>获取代理URL，填入 <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">.env</code> 文件或 <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">src/lib/videoParser.ts</code></li>
                  <li>重新构建部署即可正常使用</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-sm font-medium mb-4 border border-rose-100 dark:border-rose-900">
            <Sparkles className="w-4 h-4" />
            免费在线视频下载工具
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">
            一键下载 <span className="text-[#00A1D6]">B站</span> & <span className="text-slate-900 dark:text-white">抖音</span> 视频
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            粘贴视频链接，快速解析并下载高清无水印视频文件
          </p>
        </div>

        {/* Input Section */}
        <Card className="mb-6 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 border-0 overflow-hidden">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="粘贴B站或抖音视频链接..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleParse()}
                  className="pl-10 pr-10 h-12 text-base rounded-xl border-slate-200 dark:border-slate-700 focus-visible:ring-rose-500"
                />
                {url && (
                  <button 
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
              <Button
                onClick={handleParse}
                disabled={loading || !url.trim()}
                className="h-12 px-8 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-semibold shadow-lg shadow-rose-500/25 transition-all hover:shadow-xl hover:shadow-rose-500/30 hover:-translate-y-0.5"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Download className="w-5 h-5 mr-2" />
                )}
                {loading ? '解析中...' : '开始解析'}
              </Button>
            </div>

            {/* Platform indicators */}
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full transition-colors ${platform === 'bilibili' ? 'bg-[#00A1D6]' : 'bg-slate-300'}`} />
                哔哩哔哩
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full transition-colors ${platform === 'douyin' ? 'bg-slate-900 dark:bg-white' : 'bg-slate-300'}`} />
                抖音
              </span>
              <span className="flex items-center gap-1.5">
                <FileVideo className="w-3.5 h-3.5" />
                支持 MP4 格式
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">解析失败</p>
              <p className="text-sm mt-1 opacity-80">{error}</p>
            </div>
          </div>
        )}

        {/* Video Result */}
        {videoInfo && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="overflow-hidden border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50">
              {/* Cover & Basic Info */}
              <div className="relative">
                {videoInfo.cover && (
                  <div className="relative w-full h-48 md:h-64 bg-slate-900 overflow-hidden">
                    <img 
                      src={videoInfo.cover} 
                      alt={videoInfo.title}
                      className="w-full h-full object-cover opacity-80"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Platform Badge */}
                    <div className="absolute top-4 left-4">
                      <Badge 
                        className="text-white border-0 font-semibold"
                        style={{ backgroundColor: getPlatformColor(videoInfo.platform) }}
                      >
                        {getPlatformName(videoInfo.platform)}
                      </Badge>
                    </div>

                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-xl">
                        <Play className="w-7 h-7 text-white ml-1" fill="white" />
                      </div>
                    </div>

                    {/* Title overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                      <h3 className="text-white font-bold text-lg md:text-xl line-clamp-2 drop-shadow-lg">
                        {videoInfo.title}
                      </h3>
                    </div>
                  </div>
                )}
              </div>

              <CardContent className="p-4 md:p-6">
                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-4 mb-5 text-sm text-muted-foreground">
                  {videoInfo.author && (
                    <span className="flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      {videoInfo.author}
                    </span>
                  )}
                  {videoInfo.duration && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {videoInfo.duration}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    解析成功
                  </span>
                </div>

                <Separator className="mb-5" />

                {/* Download Options */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    下载选项
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {videoInfo.formats.map((format, index) => (
                      <div 
                        key={index}
                        className="group relative p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:border-rose-300 dark:hover:border-rose-700 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary" className="font-semibold">
                            {format.quality}
                          </Badge>
                          <span className="text-xs text-muted-foreground uppercase">
                            {format.format}
                          </span>
                        </div>
                        {format.size && (
                          <p className="text-xs text-muted-foreground mb-3">
                            文件大小: {format.size}
                          </p>
                        )}
                        <Button
                          onClick={() => handleDownload(format.url, format.quality)}
                          disabled={downloadProgress[format.quality]}
                          className="w-full rounded-lg bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-md shadow-rose-500/20 hover:shadow-lg hover:shadow-rose-500/30 transition-all"
                          size="sm"
                        >
                          {downloadProgress[format.quality] ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                          ) : (
                            <Download className="w-4 h-4 mr-1.5" />
                          )}
                          {downloadProgress[format.quality] ? '下载中...' : '下载视频'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Open Original Link */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <a 
                    href={videoInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-rose-500 hover:text-rose-600 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    在浏览器中打开原视频
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Supported Formats Info */}
        {!videoInfo && !error && (
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-lg shadow-slate-200/30 dark:shadow-slate-950/30">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#00A1D6]/10 flex items-center justify-center flex-shrink-0">
                    <Play className="w-6 h-6 text-[#00A1D6]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">哔哩哔哩 Bilibili</h3>
                    <p className="text-sm text-muted-foreground mb-2">支持B站视频链接解析</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">bv号链接</Badge>
                      <Badge variant="outline" className="text-xs">b23.tv短链</Badge>
                      <Badge variant="outline" className="text-xs">高清MP4</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg shadow-slate-200/30 dark:shadow-slate-950/30">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-900/10 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Play className="w-6 h-6 text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">抖音 Douyin</h3>
                    <p className="text-sm text-muted-foreground mb-2">支持抖音视频链接解析</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">视频链接</Badge>
                      <Badge variant="outline" className="text-xs">分享短链</Badge>
                      <Badge variant="outline" className="text-xs">无水印</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* How to use */}
        {!videoInfo && (
          <div className="mt-10">
            <h3 className="text-center text-lg font-bold text-slate-900 dark:text-white mb-6">使用教程</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: '1', title: '复制链接', desc: '在B站或抖音APP中点击分享，复制视频链接' },
                { step: '2', title: '粘贴解析', desc: '将链接粘贴到上方输入框，点击开始解析' },
                { step: '3', title: '下载视频', desc: '选择需要的清晰度，点击下载按钮保存视频' },
              ].map((item) => (
                <div key={item.step} className="text-center p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 text-white flex items-center justify-center font-bold mx-auto mb-3 shadow-lg shadow-rose-500/20">
                    {item.step}
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-10 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-blue-700 dark:text-blue-400 text-sm">
          <p className="font-medium mb-1">提示</p>
          <p className="opacity-80">由于浏览器安全限制(CORS策略)和平台反爬机制，部分视频可能无法直接下载。如遇问题，建议：</p>
          <ul className="mt-2 space-y-1 list-disc list-inside opacity-80">
            <li>确保链接可以正常在浏览器中访问</li>
            <li>尝试复制完整的视频链接（非短链接）</li>
            <li>如果下载按钮无效，可以尝试右键视频选择"另存为"</li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>视频下载器 - 仅供学习交流使用，请遵守相关平台的使用条款</p>
          <p className="mt-1 text-xs opacity-60">支持哔哩哔哩 & 抖音视频下载</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
