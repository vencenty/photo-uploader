import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2015', // 使用单一目标，避免构建冲突
    modulePreload: { polyfill: false },
    cssTarget: 'chrome58', // 降低CSS兼容性目标，支持更多浏览器
    minify: 'terser', // 使用terser进行更好的压缩
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 分割代码，提高加载性能
        manualChunks: {
          vendor: ['react', 'react-dom'],
          antd: ['antd', '@ant-design/icons'],
          utils: ['uuid', 'core-js']
        }
      }
    }
  },
  define: {
    global: 'globalThis',
    // 为移动端浏览器提供更好的支持
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  },
  server: {
    fs: {
      strict: false
    }
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: ['react', 'react-dom', 'antd', 'core-js'],
    exclude: ['@vitejs/plugin-react']
  }
})
