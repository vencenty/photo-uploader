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