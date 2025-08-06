// 图片处理工具函数

/**
 * 将远程图片URL转换为本地代理URL（仅在开发环境）
 * @param {string} imageUrl 原始图片URL
 * @returns {string} 转换后的URL
 */
export const getProxiedImageUrl = (imageUrl) => {
  if (!imageUrl) return '';
  
  // 如果是开发环境，使用代理
  if (import.meta.env.DEV) {
    // 检查是否是edge.vencenty.cc的图片
    if (imageUrl.includes('edge.vencenty.cc/user-photos/')) {
      // 将远程URL转换为本地代理URL
      const pathPart = imageUrl.replace('https://edge.vencenty.cc/', '');
      return `/${pathPart}`;
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

    const image = new Image();

    image.addEventListener('load', () => {
      clearTimeout(timeout);
      console.log('图片加载成功:', url);
      resolve(image);
    });

    image.addEventListener('error', (error) => {
      clearTimeout(timeout);
      console.error('图片加载失败:', url, error);
      
      // 如果是代理URL失败，尝试使用原始URL
      if (url.startsWith('/user-photos/')) {
        const originalUrl = `https://edge.vencenty.cc${url}`;
        console.log('代理加载失败，尝试直接加载:', originalUrl);
        
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
        console.log('跨域设置失败，继续加载');
      }
    }

    // 使用代理URL
    const proxiedUrl = getProxiedImageUrl(url);
    console.log('加载图片:', proxiedUrl);
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
 * 🚀 优化的图片旋转处理 - 使用Blob URL，避免内存泄漏
 * @param {string} imageUrl 图片URL
 * @param {Object} options 配置选项
 * @returns {Promise<string>} 处理后的图片URL（Blob URL或原URL）
 */
export const processImageRotation = async (imageUrl, options = {}) => {
  const { 
    quality = 0.95,
    maxRetries = 2,
    timeout = 10000 
  } = options;

  if (!imageUrl) {
    return imageUrl;
  }

  // 检查全局缓存
  const cachedResult = globalImageCache.get(imageUrl);
  if (cachedResult) {
    console.log("🎯 使用缓存的图片处理结果：", imageUrl);
    return cachedResult;
  }

  console.log("🚀 开始处理图片旋转：", imageUrl);

  // 创建超时Promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('图片处理超时')), timeout);
  });

  // 图片处理Promise
  const processPromise = new Promise((resolve, reject) => {
    const image = new Image();
    
    // 设置跨域
    try {
      image.crossOrigin = 'anonymous';
    } catch (e) {
      console.log("跨域设置失败，继续处理");
    }
    
    image.onload = () => {
      try {
        const w = image.naturalWidth || image.width;
        const h = image.naturalHeight || image.height;
        
        console.log("🖼️ 图片加载成功！原始尺寸：", w, "x", h);
        console.log("📐 宽高比：", (w/h).toFixed(2), w > h ? "（横图，需要旋转）" : "（竖图，直接显示）");
        
        if (w > h) {
          console.log("🔄 开始旋转横图...");
          
          // 创建canvas进行旋转
          const canvas = document.createElement("canvas");
          canvas.width = h;  // 旋转后宽度是原高度
          canvas.height = w; // 旋转后高度是原宽度
          const ctx = canvas.getContext("2d");
          
          if (!ctx) {
            throw new Error('无法创建Canvas上下文');
          }
          
          console.log("🎨 Canvas尺寸：", canvas.width, "x", canvas.height);
          
          // 移动到画布中心并旋转
          ctx.translate(h / 2, w / 2);
          ctx.rotate(Math.PI / 2); // 顺时针旋转90度
          ctx.drawImage(image, -w / 2, -h / 2, w, h);
          
          // 转换为Blob，避免Data URL的内存问题
          canvas.toBlob((blob) => {
            if (!blob) {
              console.error("❌ Blob创建失败");
              // 失败时缓存原图
              globalImageCache.set(imageUrl, imageUrl);
              resolve(imageUrl);
              return;
            }
            
            // 创建Blob URL
            const blobUrl = URL.createObjectURL(blob);
            console.log("✅ 横图旋转完成！Blob URL:", blobUrl);
            
            // 缓存处理结果
            globalImageCache.set(imageUrl, blobUrl);
            resolve(blobUrl);
            
            // 清理canvas引用
            canvas.width = 0;
            canvas.height = 0;
          }, 'image/jpeg', quality);
          
        } else {
          console.log("📱 竖图直接显示，无需处理");
          // 竖图直接使用原图
          globalImageCache.set(imageUrl, imageUrl);
          resolve(imageUrl);
        }
      } catch (error) {
        console.error("❌ 图片处理出错：", error);
        // 出错时使用原图
        globalImageCache.set(imageUrl, imageUrl);
        resolve(imageUrl);
      }
    };
    
    image.onerror = (error) => {
      console.error("❌ 图片加载失败：", error);
      // 失败时使用原图，避免重复尝试
      globalImageCache.set(imageUrl, imageUrl);
      resolve(imageUrl);
    };
    
    console.log("📥 设置图片源并开始加载...");
    image.src = getProxiedImageUrl(imageUrl);
  });

  try {
    // 使用Promise.race实现超时控制
    return await Promise.race([processPromise, timeoutPromise]);
  } catch (error) {
    console.error("❌ 图片处理失败：", error);
    
    // 如果还有重试次数，进行重试
    if (maxRetries > 0) {
      console.log(`🔄 重试处理图片，剩余重试次数：${maxRetries - 1}`);
      return processImageRotation(imageUrl, { 
        ...options, 
        maxRetries: maxRetries - 1 
      });
    }
    
    // 重试耗尽，返回原图
    globalImageCache.set(imageUrl, imageUrl);
    return imageUrl;
  }
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