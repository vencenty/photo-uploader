import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { initMobileOptimization } from './utils/mobileOptimization'
// 导入polyfills以提供兼容性支持
import './utils/polyfills.js'
import { showCompatibilityWarning } from './utils/polyfills.js'
import { setupGlobalErrorHandler, detectBrowserFeatures } from './utils/errorHandler.js'
import { getBrowserInfo, applyBrowserSpecificFixes } from './utils/browserDetect.js'

// 检查浏览器兼容性
showCompatibilityWarning()

// 检测浏览器特性
const browserFeatures = detectBrowserFeatures()
console.log('浏览器特性检测结果:', browserFeatures)

// 检测浏览器信息
const browserInfo = getBrowserInfo()
console.log('浏览器信息:', browserInfo)

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