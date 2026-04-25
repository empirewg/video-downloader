export type Platform = 'bilibili' | 'douyin' | 'unknown';

export interface VideoInfo {
  title: string;
  author: string;
  cover: string;
  duration?: string;
  platform: Platform;
  url: string;
  formats: VideoFormat[];
}

export interface VideoFormat {
  quality: string;
  format: string;
  size?: string;
  url: string;
}

export interface ParseResult {
  success: boolean;
  data?: VideoInfo;
  error?: string;
}
