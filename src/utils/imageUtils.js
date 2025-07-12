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

// 图片处理结果缓存
const imageProcessCache = new Map();
const MAX_CACHE_SIZE = 100; // 最大缓存100张图片

// 清理缓存的函数
const cleanupCache = () => {
  if (imageProcessCache.size > MAX_CACHE_SIZE) {
    const entriesToDelete = imageProcessCache.size - MAX_CACHE_SIZE;
    const iterator = imageProcessCache.keys();
    for (let i = 0; i < entriesToDelete; i++) {
      const key = iterator.next().value;
      imageProcessCache.delete(key);
    }
    console.log(`🧹 清理了 ${entriesToDelete} 个图片缓存，当前缓存数量: ${imageProcessCache.size}`);
  }
};

/**
 * 处理图片旋转 - 如果是横图则旋转90度（带缓存）
 * @param {string} imageUrl 图片URL
 * @returns {Promise<string>} 处理后的图片URL
 */
export const processImageRotation = (imageUrl) => {
  // 检查缓存
  if (imageProcessCache.has(imageUrl)) {
    console.log("🎯 使用缓存的图片处理结果：", imageUrl);
    return Promise.resolve(imageProcessCache.get(imageUrl));
  }
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      resolve(imageUrl);
      return;
    }
    
    console.log("🚀 开始处理图片旋转：", imageUrl);
    
    const image = new Image();
    // 尝试设置跨域，如果失败则忽略
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
          
          // 横图需要旋转成竖图
          const canvas = document.createElement("canvas");
          canvas.width = h;  // 旋转后宽度是原高度
          canvas.height = w; // 旋转后高度是原宽度
          const ctx = canvas.getContext("2d");
          
          console.log("🎨 Canvas尺寸：", canvas.width, "x", canvas.height);
          
          // 移动到画布中心
          ctx.translate(h / 2, w / 2);
          // 顺时针旋转90度
          ctx.rotate(Math.PI / 2);
          // 绘制图片
          ctx.drawImage(image, -w / 2, -h / 2, w, h);
          
          // 转换为 data URL
          const rotatedImageUrl = canvas.toDataURL("image/jpeg", 0.95);
          console.log("✅ 横图旋转完成！");
          // 缓存处理结果
          imageProcessCache.set(imageUrl, rotatedImageUrl);
          cleanupCache();
          resolve(rotatedImageUrl);
        } else {
          console.log("📱 竖图直接显示，无需处理");
          // 竖图直接使用原图，也要缓存
          imageProcessCache.set(imageUrl, imageUrl);
          cleanupCache();
          resolve(imageUrl);
        }
      } catch (error) {
        console.error("❌ 图片处理出错：", error);
        // 出错时使用原图，也要缓存避免重复处理
        imageProcessCache.set(imageUrl, imageUrl);
        cleanupCache();
        resolve(imageUrl);
      }
    };
    
    image.onerror = (error) => {
      console.error("❌ 图片加载失败：", error);
      console.log("📷 使用原图URL");
      // 失败时使用原图，也要缓存避免重复尝试
      imageProcessCache.set(imageUrl, imageUrl);
      cleanupCache();
      resolve(imageUrl);
    };
    
    console.log("📥 设置图片源并开始加载...");
    image.src = getProxiedImageUrl(imageUrl);
  });
}; 