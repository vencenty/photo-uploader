// 现代浏览器兼容性 Polyfills
// Babel + core-js 会自动处理 ES6+ 语法，这里只保留特殊需求的 polyfill
import 'whatwg-fetch'

// 检测关键 API 支持情况
const checkAPISupport = () => {
  const missing = [];
  
  // 检查关键 Web API
  if (typeof FormData === 'undefined') {
    missing.push('FormData');
    console.warn('⚠️ FormData 不支持，文件上传功能可能受影响');
  }
  
  if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
    missing.push('File API');
    console.error('❌ 浏览器不支持 File API，文件上传功能无法正常工作');
  }
  
  if (missing.length > 0) {
    console.warn('🔧 检测到缺失的 API:', missing.join(', '));
    console.warn('💡 建议使用更现代的浏览器以获得最佳体验');
  } else {
    console.log('✅ 浏览器兼容性检查通过');
  }
  
  return missing;
};

// URL polyfill for older browsers
if (typeof URL === 'undefined' && typeof webkitURL !== 'undefined') {
  window.URL = window.webkitURL;
  console.log('🔧 已应用 URL polyfill');
}

// IntersectionObserver polyfill for older browsers (图片懒加载关键)
if (!('IntersectionObserver' in window)) {
  console.warn('⚠️ IntersectionObserver 不支持，使用降级方案');
  window.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe(element) {
      // 立即执行回调，模拟元素可见
      setTimeout(() => {
        this.callback([{ isIntersecting: true, target: element }]);
      }, 100);
    }
    unobserve() {}
    disconnect() {}
  };
}

// requestAnimationFrame polyfill for smoother animations
if (!window.requestAnimationFrame) {
  console.log('🔧 已应用 requestAnimationFrame polyfill');
  window.requestAnimationFrame = function(callback) {
    return setTimeout(callback, 1000 / 60);
  };
}

if (!window.cancelAnimationFrame) {
  window.cancelAnimationFrame = function(id) {
    clearTimeout(id);
  };
}

// Performance API polyfill
if (!window.performance) {
  console.log('🔧 已应用 Performance API polyfill');
  window.performance = {
    now: function() {
      return Date.now();
    },
    timing: {
      navigationStart: Date.now()
    }
  };
}

if (!window.performance.now) {
  window.performance.now = function() {
    return Date.now() - window.performance.timing.navigationStart;
  };
}

// Touch events polyfill for desktop testing
if (!('ontouchstart' in window) && !window.navigator.msMaxTouchPoints) {
  // 在非触摸设备上模拟基本的触摸事件（主要用于开发测试）
  window.Touch = window.Touch || function() {};
  window.TouchList = window.TouchList || function() {};
}

// Element.closest polyfill for IE (如果真的需要支持IE的话)
if (!Element.prototype.closest) {
  console.log('🔧 已应用 Element.closest polyfill');
  Element.prototype.closest = function(selector) {
    var el = this;
    var matchesFn;

    // find vendor prefix
    ['matches','webkitMatchesSelector','mozMatchesSelector','msMatchesSelector','oMatchesSelector'].some(function(fn) {
      if (typeof document.body[fn] == 'function') {
        matchesFn = fn;
        return true;
      }
      return false;
    });

    var parent;

    // traverse parents
    while (el) {
      parent = el.parentElement;
      if (parent && parent[matchesFn](selector)) {
        return parent;
      }
      el = parent;
    }

    return null;
  };
}

// 执行兼容性检查
const missingAPIs = checkAPISupport();

// 导出检查结果供其他模块使用
export { missingAPIs };

// 在开发环境下显示 polyfill 加载信息
if (process.env.NODE_ENV === 'development') {
  console.log('🚀 Polyfills 加载完成');
  console.log('📦 Core-js 通过 Babel 按需加载');
  console.log('🌐 支持的浏览器: Chrome 58+, Firefox 57+, Safari 11+, Edge 16+');
}



 