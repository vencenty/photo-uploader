/**
 * CORS 检测工具
 * 用于检测图片服务器是否正确配置了CORS头
 */

/**
 * 检测URL是否支持CORS
 * @param {string} url 要检测的URL
 * @returns {Promise<boolean>} 是否支持CORS
 */
export const checkCORS = async (url) => {
  try {
    const response = await fetch(url, {
      method: 'HEAD', // 使用HEAD方法减少流量
      mode: 'cors',
      credentials: 'omit'
    });
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers')
    };
    
    console.log('CORS检测结果:', url, corsHeaders);
    
    // 检查是否有基本的CORS头
    return !!(corsHeaders['access-control-allow-origin']);
    
  } catch (error) {
    console.warn('CORS检测失败:', url, error);
    return false;
  }
};

/**
 * 检测图片是否可以在Canvas中安全使用
 * @param {string} imageUrl 图片URL
 * @returns {Promise<boolean>} 是否可以安全使用
 */
export const checkImageCORSSupport = async (imageUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const timeout = setTimeout(() => {
      console.warn('图片CORS检测超时:', imageUrl);
      resolve(false);
    }, 5000);
    
    img.onload = () => {
      clearTimeout(timeout);
      
      // 尝试创建Canvas并绘制图片
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1;
        canvas.height = 1;
        ctx.drawImage(img, 0, 0, 1, 1);
        
        // 尝试导出Canvas，如果成功说明支持CORS
        canvas.toDataURL();
        console.log('✅ 图片支持CORS:', imageUrl);
        resolve(true);
      } catch (error) {
        console.warn('❌ 图片不支持CORS:', imageUrl, error);
        resolve(false);
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      console.warn('图片加载失败:', imageUrl);
      resolve(false);
    };
    
    img.src = imageUrl;
  });
};

/**
 * 获取图片域名
 * @param {string} imageUrl 图片URL
 * @returns {string} 域名
 */
export const getImageDomain = (imageUrl) => {
  try {
    const url = new URL(imageUrl);
    return url.origin;
  } catch (error) {
    console.warn('无法解析图片URL:', imageUrl);
    return '';
  }
};

/**
 * 检测当前环境是否需要CORS
 * @param {string} imageUrl 图片URL
 * @returns {boolean} 是否需要CORS
 */
export const needsCORS = (imageUrl) => {
  const imageDomain = getImageDomain(imageUrl);
  const currentDomain = window.location.origin;
  
  // 如果图片域名和当前域名不同，则需要CORS
  return imageDomain && imageDomain !== currentDomain;
};

/**
 * 生成CORS问题的解决建议
 * @param {string} imageUrl 图片URL
 * @returns {string} 解决建议
 */
export const getCORSSuggestion = (imageUrl) => {
  const imageDomain = getImageDomain(imageUrl);
  
  if (!imageDomain) {
    return '无法识别图片域名，请检查图片URL是否正确';
  }
  
  return `
图片服务器 ${imageDomain} 需要配置CORS支持。

服务器端解决方案：
1. 添加响应头：Access-Control-Allow-Origin: *
2. 添加响应头：Access-Control-Allow-Methods: GET, OPTIONS
3. 添加响应头：Access-Control-Allow-Headers: Content-Type

前端临时解决方案：
1. 使用代理服务器
2. 将图片上传到支持CORS的服务器
3. 使用服务端裁剪API
  `.trim();
};

/**
 * 初始化CORS检测
 * 在应用启动时检测常用的图片域名
 */
export const initCORSCheck = () => {
  const commonDomains = [
    'https://edge.vencenty.cc',
    // 可以添加其他常用域名
  ];
  
  console.log('🔍 开始CORS检测...');
  
  commonDomains.forEach(async (domain) => {
    const supported = await checkCORS(domain);
    console.log(`${supported ? '✅' : '❌'} ${domain} CORS支持:`, supported);
  });
}; 