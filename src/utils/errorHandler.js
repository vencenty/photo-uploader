/**
 * 🚀 图片处理错误处理工具
 * 统一处理图片相关的错误
 */

/**
 * 图片处理错误类型
 */
export const ImageErrorTypes = {
  LOAD_FAILED: 'LOAD_FAILED',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  TIMEOUT: 'TIMEOUT',
  MEMORY_ERROR: 'MEMORY_ERROR',
  CANVAS_ERROR: 'CANVAS_ERROR',
  BLOB_ERROR: 'BLOB_ERROR'
};

/**
 * 图片处理错误类
 */
export class ImageProcessingError extends Error {
  constructor(type, message, originalError = null) {
    super(message);
    this.name = 'ImageProcessingError';
    this.type = type;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * 创建图片处理错误
 */
export const createImageError = (type, message, originalError = null) => {
  return new ImageProcessingError(type, message, originalError);
};

/**
 * 错误信息映射
 */
const errorMessages = {
  [ImageErrorTypes.LOAD_FAILED]: '图片加载失败，请检查网络连接',
  [ImageErrorTypes.PROCESSING_FAILED]: '图片处理失败，请重试',
  [ImageErrorTypes.TIMEOUT]: '图片处理超时，请重试',
  [ImageErrorTypes.MEMORY_ERROR]: '内存不足，请关闭其他应用后重试',
  [ImageErrorTypes.CANVAS_ERROR]: '图片渲染失败，请重试',
  [ImageErrorTypes.BLOB_ERROR]: '图片生成失败，请重试'
};

/**
 * 获取用户友好的错误信息
 */
export const getUserFriendlyErrorMessage = (error) => {
  if (error instanceof ImageProcessingError) {
    return errorMessages[error.type] || error.message;
  }
  
  // 根据错误信息判断错误类型
  const message = error.message || error.toString();
  
  if (message.includes('timeout') || message.includes('超时')) {
    return errorMessages[ImageErrorTypes.TIMEOUT];
  }
  
  if (message.includes('memory') || message.includes('内存')) {
    return errorMessages[ImageErrorTypes.MEMORY_ERROR];
  }
  
  if (message.includes('canvas') || message.includes('Canvas')) {
    return errorMessages[ImageErrorTypes.CANVAS_ERROR];
  }
  
  if (message.includes('blob') || message.includes('Blob')) {
    return errorMessages[ImageErrorTypes.BLOB_ERROR];
  }
  
  if (message.includes('load') || message.includes('加载')) {
    return errorMessages[ImageErrorTypes.LOAD_FAILED];
  }
  
  return errorMessages[ImageErrorTypes.PROCESSING_FAILED];
};

/**
 * 错误重试策略
 */
export const getRetryStrategy = (error) => {
  if (error instanceof ImageProcessingError) {
    switch (error.type) {
      case ImageErrorTypes.TIMEOUT:
        return { shouldRetry: true, delay: 1000, maxRetries: 2 };
      case ImageErrorTypes.LOAD_FAILED:
        return { shouldRetry: true, delay: 2000, maxRetries: 3 };
      case ImageErrorTypes.PROCESSING_FAILED:
        return { shouldRetry: true, delay: 500, maxRetries: 1 };
      case ImageErrorTypes.MEMORY_ERROR:
        return { shouldRetry: false, delay: 0, maxRetries: 0 };
      default:
        return { shouldRetry: true, delay: 1000, maxRetries: 1 };
    }
  }
  
  return { shouldRetry: true, delay: 1000, maxRetries: 1 };
};

/**
 * 错误日志记录
 */
export const logImageError = (error, context = {}) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      type: error.type || 'UNKNOWN',
      stack: error.stack
    },
    context,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  console.error('🚨 图片处理错误:', errorInfo);
  
  // 在生产环境中，可以发送到错误监控服务
  if (process.env.NODE_ENV === 'production') {
    // 发送到错误监控服务（如 Sentry）
    // sendToErrorService(errorInfo);
  }
};

/**
 * 包装图片处理函数，添加错误处理
 */
export const withImageErrorHandling = (fn) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const processedError = error instanceof ImageProcessingError 
        ? error 
        : createImageError(ImageErrorTypes.PROCESSING_FAILED, error.message, error);
      
      logImageError(processedError, { function: fn.name, args });
      throw processedError;
    }
  };
};

/**
 * 异步重试函数
 */
export const retryAsync = async (fn, retryStrategy) => {
  const { shouldRetry, delay, maxRetries } = retryStrategy;
  let attempts = 0;
  
  while (attempts <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempts++;
      
      if (!shouldRetry || attempts > maxRetries) {
        throw error;
      }
      
      console.log(`🔄 重试第 ${attempts} 次，${delay}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * 安全的 JSON 序列化函数
 * 处理循环引用和特殊值
 */
export const safeJsonStringify = (obj, space = null) => {
  try {
    // 处理循环引用
    const seen = new WeakSet();
    const replacer = (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      
      // 处理特殊值
      if (value === undefined) {
        return '[Undefined]';
      }
      if (typeof value === 'function') {
        return '[Function]';
      }
      if (typeof value === 'symbol') {
        return '[Symbol]';
      }
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack
        };
      }
      
      return value;
    };
    
    return JSON.stringify(obj, replacer, space);
  } catch (error) {
    console.warn('JSON序列化失败:', error);
    return JSON.stringify({ error: 'JSON序列化失败' });
  }
};

/**
 * 错误边界包装器
 * 为异步函数提供错误处理和降级方案
 */
export const withErrorBoundary = (asyncFn, fallbackFn = null) => {
  return async (...args) => {
    try {
      const result = await asyncFn(...args);
      return result;
    } catch (error) {
      // 记录错误
      logImageError(error, { 
        function: asyncFn.name, 
        args: args.map(arg => {
          if (arg instanceof File) {
            return { type: 'File', name: arg.name, size: arg.size };
          }
          return arg;
        })
      });
      
      // 如果有降级方案，执行降级方案
      if (fallbackFn && typeof fallbackFn === 'function') {
        try {
          console.log('🔄 执行降级方案...');
          return await fallbackFn(...args);
        } catch (fallbackError) {
          console.error('❌ 降级方案也失败了:', fallbackError);
          throw error; // 抛出原始错误
        }
      }
      
      // 抛出友好的错误信息
      const friendlyMessage = getUserFriendlyErrorMessage(error);
      const enhancedError = new Error(friendlyMessage);
      enhancedError.originalError = error;
      throw enhancedError;
    }
  };
};

/**
 * 检测浏览器特性
 */
export const detectBrowserFeatures = () => {
  const features = {
    // 基础API支持
    fetch: typeof fetch !== 'undefined',
    Promise: typeof Promise !== 'undefined',
    WeakSet: typeof WeakSet !== 'undefined',
    FormData: typeof FormData !== 'undefined',
    File: typeof File !== 'undefined',
    Blob: typeof Blob !== 'undefined',
    URL: typeof URL !== 'undefined',
    
    // Canvas 支持
    canvas: (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext && canvas.getContext('2d'));
      } catch (e) {
        return false;
      }
    })(),
    
    // WebGL 支持
    webgl: (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      } catch (e) {
        return false;
      }
    })(),
    
    // 本地存储支持
    localStorage: (() => {
      try {
        const test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch (e) {
        return false;
      }
    })(),
    
    // 触摸支持
    touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    
    // 设备信息
    mobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    
    // 浏览器信息
    userAgent: navigator.userAgent,
    
    // 屏幕信息
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      devicePixelRatio: window.devicePixelRatio || 1
    },
    
    // 内存信息（如果支持）
    memory: navigator.deviceMemory || null,
    
    // 连接信息（如果支持）
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt
    } : null
  };
  
  return features;
};

/**
 * 设置全局错误处理器
 */
export const setupGlobalErrorHandler = () => {
  // 处理未捕获的 Promise 错误
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 未处理的 Promise 错误:', event.reason);
    
    // 创建自定义错误对象
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    logImageError(error, {
      type: 'unhandledrejection',
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
    
    // 阻止默认的错误处理（避免在控制台显示）
    event.preventDefault();
  });
  
  // 处理 JavaScript 错误
  window.addEventListener('error', (event) => {
    console.error('🚨 JavaScript 错误:', event.error);
    
    const error = event.error || new Error(event.message);
    
    logImageError(error, {
      type: 'javascript',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
  });
  
  // 处理资源加载错误
  window.addEventListener('error', (event) => {
    if (event.target !== window) {
      console.error('🚨 资源加载错误:', event.target);
      
      const error = new Error(`资源加载失败: ${event.target.src || event.target.href}`);
      
      logImageError(error, {
        type: 'resource',
        element: event.target.tagName,
        src: event.target.src || event.target.href,
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
    }
  }, true);
  
  console.log('✅ 全局错误处理器已设置');
}; 