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
    isEdge: false,
    isBaidu: false,
    isWechat: false,
    isWeibo: false
  };

  // 检测移动端
  browser.isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  
  // 检测iOS
  browser.isIOS = /iphone|ipad|ipod/i.test(ua);
  
  // 检测Android
  browser.isAndroid = /android/i.test(ua);

  // 检测具体浏览器
  if (ua.includes('baiduboxapp') || ua.includes('baidubrowser')) {
    browser.name = 'baidu';
    browser.isBaidu = true;
    const match = ua.match(/baiduboxapp\/([0-9\.]+)/);
    if (match) browser.version = match[1];
  } else if (ua.includes('micromessenger')) {
    browser.name = 'wechat';
    browser.isWechat = true;
    const match = ua.match(/micromessenger\/([0-9\.]+)/);
    if (match) browser.version = match[1];
  } else if (ua.includes('weibo')) {
    browser.name = 'weibo';
    browser.isWeibo = true;
  } else if (ua.includes('edg/')) {
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

// 检查浏览器是否需要特殊处理
export const needsCompatibilityMode = () => {
  const browser = getBrowserInfo();
  
  // Safari 版本检查
  if (browser.isSafari) {
    const version = parseFloat(browser.version);
    return version < 14; // Safari 14以下版本需要兼容性处理
  }
  
  // 百度浏览器通常需要特殊处理
  if (browser.isBaidu) {
    return true;
  }
  
  // 微信内置浏览器
  if (browser.isWechat) {
    return true;
  }
  
  // 微博内置浏览器
  if (browser.isWeibo) {
    return true;
  }
  
  return false;
};

// 获取兼容性建议
export const getCompatibilityAdvice = () => {
  const browser = getBrowserInfo();
  
  if (browser.isBaidu) {
    return {
      type: 'warning',
      message: '检测到百度浏览器，建议使用系统自带浏览器以获得更好体验',
      action: '切换浏览器'
    };
  }
  
  if (browser.isSafari) {
    const version = parseFloat(browser.version);
    if (version < 14) {
      return {
        type: 'error',
        message: `Safari版本过低(${browser.version})，建议升级到14.0或更高版本`,
        action: '升级Safari'
      };
    }
  }
  
  if (browser.isWechat) {
    return {
      type: 'info',
      message: '检测到微信浏览器，如遇问题请使用系统默认浏览器打开',
      action: '复制链接'
    };
  }
  
  if (browser.isWeibo) {
    return {
      type: 'info',
      message: '检测到微博浏览器，如遇问题请使用系统默认浏览器打开',
      action: '复制链接'
    };
  }
  
  return null;
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
  
  // 百度浏览器特定修复
  if (browser.isBaidu) {
    // 禁用一些可能有问题的功能
    window.BAIDU_BROWSER_MODE = true;
    
    const style = document.createElement('style');
    style.textContent = `
      /* 百度浏览器兼容性修复 */
      .ant-modal {
        -webkit-transform: translateZ(0);
      }
      
      /* 简化动画效果 */
      * {
        -webkit-animation-duration: 0.1s !important;
        animation-duration: 0.1s !important;
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
  
  // 微信浏览器特定修复
  if (browser.isWechat) {
    // 禁用微信的手势返回
    window.history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', () => {
      window.history.pushState(null, null, window.location.href);
    });
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