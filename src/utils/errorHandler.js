// 兼容性错误处理工具

// 安全的JSON解析
export const safeJsonParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON解析失败:', error);
    return defaultValue;
  }
};

// 安全的JSON字符串化
export const safeJsonStringify = (obj, defaultValue = '{}') => {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.warn('JSON字符串化失败:', error);
    return defaultValue;
  }
};

// 安全的本地存储操作
export const safeLocalStorage = {
  getItem: (key, defaultValue = null) => {
    try {
      if (typeof localStorage !== 'undefined') {
        const value = localStorage.getItem(key);
        return value !== null ? safeJsonParse(value, defaultValue) : defaultValue;
      }
    } catch (error) {
      console.warn('localStorage读取失败:', error);
    }
    return defaultValue;
  },
  
  setItem: (key, value) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, safeJsonStringify(value));
        return true;
      }
    } catch (error) {
      console.warn('localStorage写入失败:', error);
    }
    return false;
  },
  
  removeItem: (key) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        return true;
      }
    } catch (error) {
      console.warn('localStorage删除失败:', error);
    }
    return false;
  }
};

// 兼容性的事件绑定
export const addEventListenerCompat = (element, event, handler, options = false) => {
  if (element.addEventListener) {
    element.addEventListener(event, handler, options);
  } else if (element.attachEvent) {
    // IE8及以下版本
    element.attachEvent('on' + event, handler);
  } else {
    // 最原始的方法
    element['on' + event] = handler;
  }
};

// 兼容性的事件移除
export const removeEventListenerCompat = (element, event, handler, options = false) => {
  if (element.removeEventListener) {
    element.removeEventListener(event, handler, options);
  } else if (element.detachEvent) {
    // IE8及以下版本
    element.detachEvent('on' + event, handler);
  } else {
    // 最原始的方法
    element['on' + event] = null;
  }
};

// 获取元素样式的兼容性方法
export const getComputedStyleCompat = (element, property) => {
  if (window.getComputedStyle) {
    return window.getComputedStyle(element, null)[property];
  } else if (element.currentStyle) {
    // IE8及以下版本
    return element.currentStyle[property];
  }
  return null;
};

// 兼容性的requestAnimationFrame
export const requestAnimationFrameCompat = (callback) => {
  if (window.requestAnimationFrame) {
    return window.requestAnimationFrame(callback);
  } else if (window.webkitRequestAnimationFrame) {
    return window.webkitRequestAnimationFrame(callback);
  } else if (window.mozRequestAnimationFrame) {
    return window.mozRequestAnimationFrame(callback);
  } else if (window.oRequestAnimationFrame) {
    return window.oRequestAnimationFrame(callback);
  } else if (window.msRequestAnimationFrame) {
    return window.msRequestAnimationFrame(callback);
  } else {
    return setTimeout(callback, 1000 / 60);
  }
};

// 兼容性的cancelAnimationFrame
export const cancelAnimationFrameCompat = (id) => {
  if (window.cancelAnimationFrame) {
    return window.cancelAnimationFrame(id);
  } else if (window.webkitCancelAnimationFrame) {
    return window.webkitCancelAnimationFrame(id);
  } else if (window.mozCancelAnimationFrame) {
    return window.mozCancelAnimationFrame(id);
  } else if (window.oCancelAnimationFrame) {
    return window.oCancelAnimationFrame(id);
  } else if (window.msCancelAnimationFrame) {
    return window.msCancelAnimationFrame(id);
  } else {
    return clearTimeout(id);
  }
};

// 错误边界处理
export const withErrorBoundary = (fn, fallback = () => {}) => {
  return (...args) => {
    try {
      const result = fn(...args);
      // 如果返回的是Promise，添加catch处理
      if (result && typeof result.catch === 'function') {
        return result.catch(error => {
          console.error('异步操作错误:', error);
          return fallback(...args);
        });
      }
      return result;
    } catch (error) {
      console.error('同步操作错误:', error);
      return fallback(...args);
    }
  };
};

// 用户友好的错误消息
export const getUserFriendlyErrorMessage = (error) => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && error.message) {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return '网络连接异常，请检查网络后重试';
    }
    
    if (message.includes('timeout')) {
      return '请求超时，请稍后重试';
    }
    
    if (message.includes('json')) {
      return '数据格式异常，请稍后重试';
    }
    
    if (message.includes('cors')) {
      return '跨域请求被拒绝，请联系技术支持';
    }
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return '身份验证失败，请重新登录';
    }
    
    if (message.includes('forbidden') || message.includes('403')) {
      return '没有权限执行此操作';
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return '请求的资源不存在';
    }
    
    if (message.includes('server') || message.includes('500')) {
      return '服务器异常，请稍后重试';
    }
    
    return error.message;
  }
  
  return '操作失败，请稍后重试';
};

// 全局错误处理
export const setupGlobalErrorHandler = () => {
  // 监听未捕获的Promise异常
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('未捕获的Promise异常:', event.reason);
      const friendlyMessage = getUserFriendlyErrorMessage(event.reason);
      
      // 可以在这里显示用户友好的错误提示
      if (window.antd && window.antd.message) {
        window.antd.message.error(friendlyMessage);
      } else {
        console.warn('建议用户:', friendlyMessage);
      }
      
      // 阻止控制台显示错误（可选）
      event.preventDefault();
    });
    
    // 监听JavaScript运行时错误
    window.addEventListener('error', (event) => {
      console.error('JavaScript运行时错误:', event.error);
      const friendlyMessage = getUserFriendlyErrorMessage(event.error);
      
      if (window.antd && window.antd.message) {
        window.antd.message.error(friendlyMessage);
      } else {
        console.warn('建议用户:', friendlyMessage);
      }
    });
  }
};

// 检测浏览器特性并提供降级方案
export const detectBrowserFeatures = () => {
  const features = {
    // 基础特性
    es6: (function() {
      try {
        new Function("(a = 0) => a");
        return true;
      } catch (err) {
        return false;
      }
    })(),
    
    // 网络相关
    fetch: typeof fetch !== 'undefined',
    xhr: typeof XMLHttpRequest !== 'undefined',
    
    // 存储相关
    localStorage: (function() {
      try {
        return typeof localStorage !== 'undefined' && localStorage !== null;
      } catch (e) {
        return false;
      }
    })(),
    
    sessionStorage: (function() {
      try {
        return typeof sessionStorage !== 'undefined' && sessionStorage !== null;
      } catch (e) {
        return false;
      }
    })(),
    
    // 文件相关
    formData: typeof FormData !== 'undefined',
    fileReader: typeof FileReader !== 'undefined',
    
    // DOM相关
    addEventListener: typeof document !== 'undefined' && 
                     typeof document.addEventListener !== 'undefined',
    querySelector: typeof document !== 'undefined' && 
                   typeof document.querySelector !== 'undefined',
    
    // CSS相关
    flexbox: (function() {
      if (typeof document === 'undefined') return false;
      const div = document.createElement('div');
      div.style.display = 'flex';
      return div.style.display === 'flex';
    })(),
    
    // 移动端相关
    touch: typeof window !== 'undefined' && 
           ('ontouchstart' in window || navigator.maxTouchPoints > 0),
    
    // 性能相关
    requestAnimationFrame: typeof window !== 'undefined' && 
                          typeof window.requestAnimationFrame !== 'undefined'
  };
  
  return features;
}; 