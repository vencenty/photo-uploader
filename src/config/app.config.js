/**
 * 应用配置文件
 */

// 上传相关配置
export const uploadConfig = {
    // 最大文件大小(字节)，20MB
    maxFileSize: 20 * 1024 * 1024,
    
    // 图片压缩相关配置
    compression: {
      // 是否启用压缩
      enabled: true,
      // 压缩质量 (0-1)
      quality: 0.8,
      // 最大宽度
      maxWidth: 4000,
      // 最大高度
      maxHeight: 4000,
      // MIME类型
      mimeType: 'image/jpeg',
    },
    
    // 上传超时时间(毫秒)
    timeout: 30000,
    
    // 同时上传的最大数量
    maxSimultaneousUploads: 1,
    
    // 图片代理URL前缀（用于预览，压缩过的）
    imageProxyUrl: 'https://img-proxy.vencenty.cn/insecure/resize:fit:600:0/quality:70/plain/',
    
    // 原图URL前缀（用于裁剪，高质量）
    imageOriginalUrl: 'https://img-proxy.vencenty.cn/insecure/plain/',
    
    // 裁剪预览URL前缀（用于裁剪界面，中等质量，减少卡顿）
    imageCropUrl: 'https://img-proxy.vencenty.cn/insecure/resize:fit:1200:0/quality:85/plain/'
  };
  
  export default {
    uploadConfig,
  };