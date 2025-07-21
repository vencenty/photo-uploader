import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { initMobileOptimization } from './utils/mobileOptimization'
// 导入polyfills以提供兼容性支持（现在按需引入+增强检测）
import { missingAPIs } from './utils/polyfills.js'
import { setupGlobalErrorHandler, detectBrowserFeatures } from './utils/errorHandler.js'
import { getBrowserInfo, applyBrowserSpecificFixes } from './utils/browserDetect.js'

// 检测浏览器特性
const browserFeatures = detectBrowserFeatures()
console.log('浏览器特性检测结果:', browserFeatures)

// 检测浏览器信息
const browserInfo = getBrowserInfo()
console.log('浏览器信息:', browserInfo)

// 检查 polyfill 加载结果
if (missingAPIs.length > 0) {
  console.warn('⚠️ 检测到缺失的 API，可能影响功能:', missingAPIs)
}

// 应用浏览器特定修复
applyBrowserSpecificFixes()

// 设置全局错误处理
setupGlobalErrorHandler()

// 初始化移动端优化
initMobileOptimization()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)