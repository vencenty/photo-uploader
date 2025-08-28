import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // 根据命令和环境变量确定API地址
  const isDev = command === 'serve';
  
  // 支持环境变量覆盖
  const devApiUrl = process.env.VITE_DEV_API_URL || 'http://localhost:8787';
  const prodApiUrl = process.env.VITE_PROD_API_URL || 'https://photo-kits-server.vencenty.cc';
  
  const apiTarget = isDev ? devApiUrl : prodApiUrl;
  
  console.log('🚀 ===== 环境配置信息 =====');
  console.log(`📋 当前命令: ${command}`);
  console.log(`🌍 当前模式: ${mode}`);
  console.log(`🔧 开发环境: ${isDev ? '是' : '否'}`);
  console.log(`🌐 API地址: ${apiTarget}`);
  console.log(`🔗 开发API: ${devApiUrl}`);
  console.log(`🔗 生产API: ${prodApiUrl}`);
  console.log('========================');
  
  return {
    plugins: [
      react({
        // 使用 Babel 进行转译，确保兼容性
        babel: {
          configFile: true, // 使用 babel.config.js
          babelrc: false,
        },
      }),
      legacy({
        // 依据 browserslist 生成兼容 bundle 和自动 Polyfill（systemjs + modern bundle）
        targets: [
          'defaults',
          'ios_saf >= 10',
          'safari >= 11',
          'chrome >= 58',
          'firefox >= 57',
          'edge >= 16'
        ],
        polyfills: true,
        additionalLegacyPolyfills: [
          'core-js/stable',
          'regenerator-runtime/runtime'
        ],
        renderLegacyChunks: true,
        externalSystemJS: true
      })
    ],
    build: {
      target: 'es2015',
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
      },
      // 生产环境移除 console 语句
      terserOptions: {
        compress: {
          drop_console: true,  // 移除 console.log
          drop_debugger: true, // 移除 debugger
        },
      },
    },
    define: {
      global: 'globalThis',
      // 为移动端浏览器提供更好的支持
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    },
    server: {
      fs: {
        strict: false
      },
      proxy: {
        '/user-photos': {
          target: 'https://edge.vencenty.cc',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/user-photos/, '/user-photos'),
          secure: true,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('代理错误:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('代理请求:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('代理响应:', proxyRes.statusCode, req.url);
            });
          }
        },
        '/api': {
          target: apiTarget, // 使用动态API地址
          changeOrigin: true,
          secure: true,
          configure: (proxy, options) => {
            console.log(`🔗 API代理已配置: ${apiTarget}`);
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log(`📤 API请求: ${req.method} ${req.url} -> ${apiTarget}`);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log(`📥 API响应: ${proxyRes.statusCode} ${req.url}`);
            });
            proxy.on('error', (err, req, res) => {
              console.error(`❌ API代理错误: ${err.message}`);
            });
          }
         },
        // 新增：代理OSS图片，解决CORS问题
        '/oss-proxy': {
          target: 'https://oss-proxy.vencenty.cc',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/oss-proxy/, ''),
          configure: (proxy, options) => {
            console.log('🔗 OSS代理已配置: https://oss-proxy.vencenty.cc');
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log(`📤 OSS请求: ${req.method} ${req.url}`);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log(`📥 OSS响应: ${proxyRes.statusCode} ${req.url}`);
            });
            proxy.on('error', (err, req, res) => {
              console.error(`❌ OSS代理错误: ${err.message}`);
            });
          }
        }
      }
    },
    // 优化依赖预构建
    optimizeDeps: {
      include: ['react', 'react-dom', 'antd', 'core-js'],
      exclude: ['@vitejs/plugin-react']
    }
  };
});
