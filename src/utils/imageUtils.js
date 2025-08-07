// 图片处理工具函数

// 调试工具
const debugLog = (...args) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

const debugWarn = (...args) => {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
};

const debugError = (...args) => {
  if (import.meta.env.DEV) {
    console.error(...args);
  }
};

/**
 * 将远程图片URL转换为本地代理URL（仅在开发环境）
 * @param {string} imageUrl 原始图片URL
 * @returns {string} 转换后的URL
 */
export const getProxiedImageUrl = (imageUrl) => {
  if (!imageUrl) return '';
  
  console.log("🔄 处理图片URL:", imageUrl);
  // 如果是开发环境，使用代理
  if (import.meta.env.DEV) {
    // 检查是否是edge.vencenty.cc的图片
    if (imageUrl.includes('edge.vencenty.cc/user-photos/')) {
      // 将远程URL转换为本地代理URL
      const pathPart = imageUrl.replace('https://edge.vencenty.cc/', '');
      return `/${pathPart}`;
    }
    
    // 检查是否是oss-proxy.vencenty.cc的图片
    if (imageUrl.includes('oss-proxy.vencenty.cc/')) {
      // 将远程URL转换为本地代理URL
      const pathPart = imageUrl.replace('https://oss-proxy.vencenty.cc/', '');
      return `/oss-proxy/${pathPart}`;
    }
  }
  
  // 生产环境或其他URL直接返回
  return imageUrl;
};

/**
 * 创建图像对象，支持代理和错误处理
 * @param {string} url 图片URL
 * @param {boolean} useCrossOrigin 是否使用跨域
 * @returns {Promise<HTMLImageElement>}
 */
export const createImageWithProxy = (url, useCrossOrigin = false) => {
  return new Promise((resolve, reject) => {
    // 设置15秒超时
    const timeout = setTimeout(() => {
      console.error('图片加载超时:', url);
      reject(new Error('图片加载超时'));
    }, 15000);

    const image = new window.Image();

    image.addEventListener('load', () => {
      clearTimeout(timeout);
                debugLog('图片加载成功:', url);
      resolve(image);
    });

    image.addEventListener('error', (error) => {
      clearTimeout(timeout);
      debugError('图片加载失败:', url, error);
      
      // 如果是代理URL失败，尝试使用原始URL
      if (url.startsWith('/user-photos/')) {
        const originalUrl = `https://edge.vencenty.cc${url}`;
        debugLog('代理加载失败，尝试直接加载:', originalUrl);
        
        // 递归调用，但不使用跨域
        createImageWithProxy(originalUrl, false)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      reject(error);
    });

    // 根据环境和URL决定是否设置跨域
    if (useCrossOrigin && !url.startsWith('/')) {
      try {
        image.setAttribute('crossOrigin', 'anonymous');
      } catch (e) {
        debugLog('跨域设置失败，继续加载');
      }
    }

    // 使用代理URL
    const proxiedUrl = getProxiedImageUrl(url);
    debugLog('加载图片:', proxiedUrl);
    image.src = proxiedUrl;
  });
};

/**
 * 检查图片是否可以加载
 * @param {string} imageUrl 图片URL
 * @returns {Promise<boolean>}
 */
export const checkImageAccessible = async (imageUrl) => {
  try {
    await createImageWithProxy(imageUrl, false);
    return true;
  } catch (error) {
    console.warn('图片不可访问:', imageUrl, error.message);
    return false;
  }
};

/**
 * 预加载图片列表
 * @param {string[]} imageUrls 图片URL列表
 * @returns {Promise<void>}
 */
export const preloadImages = async (imageUrls) => {
  const promises = imageUrls.map(url => 
    createImageWithProxy(url, false).catch(err => {
      console.warn('预加载图片失败:', url, err.message);
      return null;
    })
  );
  
  await Promise.allSettled(promises);
  console.log('图片预加载完成');
}; 

/**
 * 🚀 统一的图片缓存管理器
 * 解决内存泄漏和重复缓存问题
 */
class ImageProcessCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.accessOrder = new Map(); // 记录访问顺序，实现LRU
  }

  /**
   * 获取缓存项
   */
  get(key) {
    if (this.cache.has(key)) {
      // 更新访问时间，实现LRU
      this.accessOrder.set(key, Date.now());
      return this.cache.get(key);
    }
    return null;
  }

  /**
   * 设置缓存项
   */
  set(key, value) {
    // 如果缓存已满，清理最久未使用的项
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this._cleanup();
    }

    this.cache.set(key, value);
    this.accessOrder.set(key, Date.now());
  }

  /**
   * 检查是否存在缓存
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * 清理最久未使用的缓存项
   */
  _cleanup() {
    if (this.accessOrder.size === 0) return;

    // 找到最久未访问的key
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, time] of this.accessOrder.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const oldValue = this.cache.get(oldestKey);
      
      // 如果是Blob URL，需要释放内存
      if (oldValue && typeof oldValue === 'string' && oldValue.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(oldValue);
          console.log('🧹 释放Blob URL:', oldestKey);
        } catch (e) {
          console.warn('释放Blob URL失败:', e);
        }
      }

      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      console.log(`🧹 清理缓存项: ${oldestKey}, 当前缓存数量: ${this.cache.size}`);
    }
  }

  /**
   * 清空所有缓存
   */
  clear() {
    // 释放所有Blob URLs
    for (const [key, value] of this.cache.entries()) {
      if (value && typeof value === 'string' && value.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(value);
        } catch (e) {
          console.warn('释放Blob URL失败:', e);
        }
      }
    }
    
    this.cache.clear();
    this.accessOrder.clear();
    console.log('🧹 清空所有图片缓存');
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      usage: Math.round((this.cache.size / this.maxSize) * 100)
    };
  }
}

// 创建全局单例缓存管理器
const globalImageCache = new ImageProcessCache(100);

// 将缓存管理器挂载到window对象，供其他组件使用
if (typeof window !== 'undefined') {
  window.imageProcessCache = globalImageCache;
}

/**
 * 🚀 使用阿里云OSS图片处理参数 - 更高效的图片处理方案
 * @param {string} imageUrl 图片URL
 * @param {Object} options 配置选项
 * @returns {Promise<string>} 处理后的图片URL
 */
export const processImageWithOSS = async (imageUrl, options = {}) => {
  const { 
    rotation = 'auto', // auto: 自动判断, 90: 旋转90度, 180: 旋转180度, 270: 旋转270度
    quality = 90, // 图片质量 1-100
    format = 'jpg', // 输出格式
    resize = null, // 缩放参数 {width, height, mode}
    cache = true // 是否使用缓存
  } = options;

  if (!imageUrl) {
    return imageUrl;
  }

  // 检查缓存
  if (cache) {
    const cachedResult = globalImageCache.get(imageUrl);
    if (cachedResult) {
      console.log("🎯 使用缓存的OSS处理结果：", imageUrl);
      return cachedResult;
    }
  }

  console.log("🚀 开始OSS图片处理：", imageUrl);

  try {
    // 构建OSS图片处理参数
    const ossParams = [];
    
    // 自动旋转检测
    if (rotation === 'auto') {
      ossParams.push('auto-orient,1'); // 自动检测并旋转
    } else if (rotation) {
      ossParams.push(`rotate,${rotation}`); // 手动旋转
    }
    
    // 质量设置
    if (quality) {
      ossParams.push(`quality,q_${quality}`);
    }
    
    // 格式转换
    if (format) {
      ossParams.push(`format,${format}`);
    }
    
    // 缩放处理
    if (resize) {
      const { width, height, mode = 'lfit' } = resize;
      if (width && height) {
        ossParams.push(`resize,m_${mode},w_${width},h_${height}`);
      } else if (width) {
        ossParams.push(`resize,m_${mode},w_${width}`);
      } else if (height) {
        ossParams.push(`resize,m_${mode},h_${height}`);
      }
    }
    
    // 构建处理后的URL
    let processedUrl = imageUrl;
    if (ossParams.length > 0) {
      const separator = imageUrl.includes('?') ? '&' : '?';
      processedUrl = `${imageUrl}${separator}x-oss-process=${ossParams.join('/')}`;
    }
    
    console.log("✅ OSS处理URL：", processedUrl);
    
    // 缓存结果
    if (cache) {
      globalImageCache.set(imageUrl, processedUrl);
    }
    
    return processedUrl;
    
  } catch (error) {
    console.error("❌ OSS图片处理失败：", error);
    return imageUrl; // 失败时返回原图
  }
};

/**
 * 🚀 智能图片处理 - 根据图片尺寸自动判断是否需要旋转
 * @param {string} imageUrl 图片URL
 * @param {Object} options 配置选项
 * @returns {Promise<string>} 处理后的图片URL
 */
export const processImageRotation = async (imageUrl, options = {}) => {
  const { 
    autoRotate = true, // 是否自动检测旋转
    quality = 90,
    format = 'jpg'
  } = options;

  if (!imageUrl) {
    return imageUrl;
  }

  // 检查缓存
  const cachedResult = globalImageCache.get(imageUrl);
  if (cachedResult) {
    console.log("🎯 使用缓存的图片处理结果：", imageUrl);
    return cachedResult;
  }

  console.log("🚀 开始智能图片处理：", imageUrl);

  try {
    // 如果需要自动检测，先获取图片尺寸
    if (autoRotate) {
      const image = new window.Image();
      
      const imageInfo = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('图片加载超时'));
        }, 10000);
        
        image.onload = () => {
          clearTimeout(timeout);
          const w = image.naturalWidth || image.width;
          const h = image.naturalHeight || image.height;
          resolve({ width: w, height: h });
        };
        
        image.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('图片加载失败'));
        };
        
        image.src = getProxiedImageUrl(imageUrl);
      });
      
      console.log("🖼️ 图片尺寸：", imageInfo.width, "x", imageInfo.height);
      
      // 判断是否需要旋转（横图需要旋转为竖图）
      if (imageInfo.width > imageInfo.height) {
        console.log("🔄 检测到横图，使用OSS旋转90度");
        const processedUrl = await processImageWithOSS(imageUrl, {
          rotation: 90,
          quality,
          format
        });
        globalImageCache.set(imageUrl, processedUrl);
        return processedUrl;
      } else {
        console.log("📱 竖图无需旋转");
        globalImageCache.set(imageUrl, imageUrl);
        return imageUrl;
      }
    } else {
      // 不自动检测，直接返回原图
      globalImageCache.set(imageUrl, imageUrl);
      return imageUrl;
    }
    
  } catch (error) {
    console.error("❌ 智能图片处理失败：", error);
    // 失败时返回原图
    globalImageCache.set(imageUrl, imageUrl);
    return imageUrl;
  }
};

/**
 * 🚀 兼容性函数 - 为了保持向后兼容，直接使用OSS处理
 * @param {string} imageUrl 图片URL
 * @param {Object} options 配置选项
 * @returns {Promise<string>} 处理后的图片URL
 */
export const processImageRotationLegacy = async (imageUrl, options = {}) => {
  // 直接使用OSS处理，保持向后兼容
  return processImageWithOSS(imageUrl, {
    rotation: 'auto',
    quality: options.quality || 90,
    format: options.format || 'jpg'
  });
};

/**
 * 🚀 图片处理工具函数 - 用于导出缓存管理器
 */
export const getImageCache = () => globalImageCache;

/**
 * 🚀 清理指定的Blob URL资源
 * @param {string} url Blob URL
 */
export const revokeBlobUrl = (url) => {
  if (url && typeof url === 'string' && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
      console.log('🧹 手动释放Blob URL:', url);
    } catch (e) {
      console.warn('释放Blob URL失败:', e);
    }
  }
};

/**
 * 移动端专用的图片加载函数
 * @param {string} imageUrl 图片URL
 * @param {boolean} useCrossOrigin 是否使用跨域（裁剪时需要）
 * @returns {Promise<HTMLImageElement>}
 */
export const createMobileImage = (imageUrl, useCrossOrigin = false) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.error('移动端图片加载超时:', imageUrl);
      reject(new Error('移动端图片加载超时'));
    }, 20000); // 移动端给更长的超时时间

    const image = new window.Image();
    
    // 移动端也需要设置跨域，特别是裁剪时
    if (useCrossOrigin) {
      try {
        image.crossOrigin = 'anonymous';
      } catch (e) {
        debugLog('移动端跨域设置失败，继续加载');
      }
    }
    
    image.addEventListener('load', () => {
      clearTimeout(timeout);
      debugLog('移动端图片加载成功:', imageUrl);
      resolve(image);
    });

    image.addEventListener('error', (error) => {
      clearTimeout(timeout);
      debugError('移动端图片加载失败:', imageUrl, error);
      reject(new Error('移动端图片加载失败'));
    });

    image.src = imageUrl;
  });
};

/**
 * 移动端图片加载的多重降级策略
 * @param {string} imageUrl 图片URL
 * @param {boolean} useCrossOrigin 是否使用跨域（裁剪时需要）
 * @returns {Promise<HTMLImageElement>}
 */
export const createMobileImageWithFallback = async (imageUrl, useCrossOrigin = false) => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (!isMobile) {
    // 非移动端使用原有逻辑
    return createImageWithProxy(imageUrl, useCrossOrigin);
  }

  // 移动端多重降级策略
  const strategies = [
    // 策略1: 直接加载原始URL（带跨域）
    () => createMobileImage(imageUrl, useCrossOrigin),
    
    // 策略2: 尝试添加时间戳避免缓存问题
    () => createMobileImage(`${imageUrl}${imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`, useCrossOrigin),
    
    // 策略3: 如果是HTTPS页面，尝试HTTP URL
    () => {
      if (window.location.protocol === 'https:' && imageUrl.startsWith('https:')) {
        const httpUrl = imageUrl.replace('https:', 'http:');
        return createMobileImage(httpUrl, useCrossOrigin);
      }
      throw new Error('跳过HTTP策略');
    },
    
    // 策略4: 如果是HTTP页面，尝试HTTPS URL
    () => {
      if (window.location.protocol === 'http:' && imageUrl.startsWith('http:')) {
        const httpsUrl = imageUrl.replace('http:', 'https:');
        return createMobileImage(httpsUrl, useCrossOrigin);
      }
      throw new Error('跳过HTTPS策略');
    },
    
    // 策略5: 尝试通过代理加载（如果可用）
    () => {
      if (import.meta.env.DEV) {
        const proxyUrl = imageUrl.replace('https://edge.vencenty.cc/', '/');
        return createMobileImage(proxyUrl, useCrossOrigin);
      }
      throw new Error('生产环境跳过代理策略');
    },
    
    // 策略6: 尝试通过代理加载（如果可用）
    () => {
      if (import.meta.env.DEV) {
        const proxyUrl = imageUrl.replace('https://oss-proxy.vencenty.cc/', '/oss-proxy/');
        return createMobileImage(proxyUrl, useCrossOrigin);
      }
      throw new Error('生产环境跳过代理策略');
    }
  ];

  let lastError = null;
  
  for (let i = 0; i < strategies.length; i++) {
    try {
      debugLog(`移动端图片加载策略 ${i + 1}:`, imageUrl);
      const result = await strategies[i]();
      debugLog(`移动端图片加载策略 ${i + 1} 成功:`, imageUrl);
      return result;
    } catch (error) {
      lastError = error;
      debugWarn(`移动端图片加载策略 ${i + 1} 失败:`, imageUrl, error.message);
      
      // 如果不是最后一个策略，继续尝试下一个
      if (i < strategies.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒再尝试下一个策略
      }
    }
  }
  
  // 所有策略都失败了
  throw new Error(`移动端图片加载失败，已尝试 ${strategies.length} 种策略: ${lastError?.message || '未知错误'}`);
};

/**
 * 🚀 CORS绕过方案 - 将图片转换为Blob URL
 * @param {string} imageUrl 图片URL
 * @returns {Promise<string>} Blob URL
 */
export const createBlobUrlForMobile = async (imageUrl) => {
  try {
    console.log('🔄 CORS绕过：开始转换图片为Blob URL:', imageUrl);
    
    // 多重尝试策略
    const strategies = [
      // 策略1: 直接fetch
      async () => {
        const response = await fetch(imageUrl, {
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.blob();
      },
      
      // 策略2: 使用代理URL（开发环境）
      async () => {
        if (import.meta.env.DEV) {
          const proxyUrl = getProxiedImageUrl(imageUrl);
          if (proxyUrl !== imageUrl) {
            console.log('🔄 尝试代理URL:', proxyUrl);
            const response = await fetch(proxyUrl, {
              mode: 'cors',
              credentials: 'omit'
            });
            
            if (!response.ok) {
              throw new Error(`代理HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.blob();
          }
        }
        throw new Error('跳过代理策略');
      },
      
      // 策略3: 使用XMLHttpRequest（某些情况下更可靠）
      async () => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', imageUrl, true);
          xhr.responseType = 'blob';
          
          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve(xhr.response);
            } else {
              reject(new Error(`XHR ${xhr.status}: ${xhr.statusText}`));
            }
          };
          
          xhr.onerror = () => {
            reject(new Error('XHR请求失败'));
          };
          
          xhr.send();
        });
      }
    ];

    let lastError = null;
    
    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`🔄 尝试CORS绕过策略 ${i + 1}:`, imageUrl);
        const blob = await strategies[i]();
        
        // 创建Blob URL
        const blobUrl = URL.createObjectURL(blob);
        
        console.log('✅ CORS绕过成功，创建Blob URL:', blobUrl);
        
        // 将Blob URL添加到缓存，以便后续清理
        if (globalImageCache) {
          globalImageCache.set(imageUrl, blobUrl);
        }
        
        return blobUrl;
        
      } catch (error) {
        lastError = error;
        console.warn(`❌ CORS绕过策略 ${i + 1} 失败:`, error.message);
        
        // 如果不是最后一个策略，继续尝试下一个
        if (i < strategies.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 等待500ms再尝试下一个策略
        }
      }
    }
    
    // 所有策略都失败了
    throw new Error(`CORS绕过失败，已尝试 ${strategies.length} 种策略: ${lastError?.message || '未知错误'}`);
    
  } catch (error) {
    console.error('❌ CORS绕过完全失败:', error);
    throw error; // 不再回退到原URL，直接抛出错误
  }
};

/**
 * 🚀 裁剪专用图片加载 - 强制使用CORS绕过避免Canvas污染
 * @param {string} imageUrl 图片URL
 * @returns {Promise<HTMLImageElement>}
 */
export const createMobileImageForCrop = async (imageUrl) => {
  try {
    console.log('🔄 开始CORS绕过处理:', imageUrl);
    
    // 强制使用CORS绕过，避免Canvas污染
    const blobUrl = await createBlobUrlForMobile(imageUrl);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('裁剪图片加载超时'));
      }, 20000);

      const image = new window.Image();
      
      image.addEventListener('load', () => {
        clearTimeout(timeout);
        console.log('✅ 裁剪图片加载成功:', blobUrl);
        resolve(image);
      });

      image.addEventListener('error', (error) => {
        clearTimeout(timeout);
        console.error('❌ 裁剪图片加载失败:', blobUrl, error);
        reject(new Error('裁剪图片加载失败'));
      });

      image.src = blobUrl;
    });
    
  } catch (error) {
    console.error('❌ 裁剪图片处理失败:', error);
    throw error;
  }
};