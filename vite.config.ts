import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 项目站点部署在子路径 /repo-name/ 下
  // 通过环境变量动态设置 base，本地开发用默认的 '/'
  base: process.env.VITE_BASE_URL || '/',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
