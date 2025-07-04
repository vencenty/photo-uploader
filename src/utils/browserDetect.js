// 浏览器检测工具

// 获取浏览器信息
export const getBrowserInfo = () => {
  const ua = navigator.userAgent.toLowerCase();
  const browser = {
    name: 'unknown',
    version: 'unknown',
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    isSafari: false,
    isChrome: false,
    isFirefox: false,
    isEdge: false
  };

  // 检测移动端
  browser.isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  
  // 检测iOS
  browser.isIOS = /iphone|ipad|ipod/i.test(ua);
  
  // 检测Android
  browser.isAndroid = /android/i.test(ua);

  // 检测具体浏览器
  if (ua.includes('edg/')) {
    browser.name = 'edge';
    browser.isEdge = true;
    const match = ua.match(/edg\/([0-9\.]+)/);
    if (match) browser.version = match[1];
  } else if (ua.includes('firefox')) {
    browser.name = 'firefox';
    browser.isFirefox = true;
    const match = ua.match(/firefox\/([0-9\.]+)/);
    if (match) browser.version = match[1];
  } else if (ua.includes('chrome') && !ua.includes('edg')) {
    browser.name = 'chrome';
    browser.isChrome = true;
    const match = ua.match(/chrome\/([0-9\.]+)/);
    if (match) browser.version = match[1];
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser.name = 'safari';
    browser.isSafari = true;
    const match = ua.match(/version\/([0-9\.]+)/);
    if (match) browser.version = match[1];
  }

  return browser;
};



// 设置浏览器特定的样式和行为
export const applyBrowserSpecificFixes = () => {
  const browser = getBrowserInfo();
  
  // Safari特定修复
  if (browser.isSafari) {
    // 修复Safari的flex布局问题
    const style = document.createElement('style');
    style.textContent = `
      /* Safari兼容性修复 */
      .ant-upload-list-item {
        -webkit-transform: translateZ(0);
      }
      
      /* 修复Safari的position: sticky问题 */
      .ant-layout-header {
        -webkit-transform: translateZ(0);
      }
      
      /* 修复Safari的overflow scrolling */
      .ant-layout-content {
        -webkit-overflow-scrolling: touch;
      }
    `;
    document.head.appendChild(style);
  }
  

  
  // iOS特定修复
  if (browser.isIOS) {
    // 修复iOS的viewport问题
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, shrink-to-fit=no'
      );
    }
    
    // 防止iOS Safari的bounce效果
    document.body.style.overscrollBehavior = 'none';
  }
  

  
  // 通用移动端修复
  if (browser.isMobile) {
    const style = document.createElement('style');
    style.textContent = `
      /* 移动端点击优化 */
      .ant-btn {
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        min-height: 44px;
      }
      
      /* 移动端输入框优化 */
      .ant-input, .ant-input-number {
        font-size: 16px; /* 防止iOS缩放 */
      }
      
      /* 移动端文件上传优化 */
      .ant-upload-btn {
        touch-action: manipulation;
        -webkit-user-select: none;
        user-select: none;
      }
      
      /* 防止移动端长按选择 */
      .ant-upload-list-item {
        -webkit-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
      }
    `;
    document.head.appendChild(style);
  }
  
  console.log('已应用浏览器特定修复:', browser.name, browser.version);
};

// 检测网络状态
export const getNetworkInfo = () => {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (connection) {
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }
  
  return null;
};

// 根据网络状态优化请求
export const shouldOptimizeForNetwork = () => {
  const network = getNetworkInfo();
  
  if (network) {
    // 2G或慢速网络
    if (network.effectiveType === '2g' || network.effectiveType === 'slow-2g') {
      return true;
    }
    
    // 用户开启了数据节省模式
    if (network.saveData) {
      return true;
    }
    
    // RTT大于1000ms或下行速度小于0.5Mbps
    if (network.rtt > 1000 || network.downlink < 0.5) {
      return true;
    }
  }
  
  return false;
}; 