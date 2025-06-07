import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: ['es2015', 'safari11'], // 支持Safari 11+和现代浏览器
    polyfillModulePreload: false, // 禁用模块预加载的polyfill
    cssTarget: 'safari11' // CSS兼容性目标
  },
  define: {
    global: 'globalThis', // 全局对象兼容性
  },
  server: {
    fs: {
      strict: false
    }
  }
})
