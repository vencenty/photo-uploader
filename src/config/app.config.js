/**
 * 应用配置文件
 */

// 上传相关配置
export const uploadConfig = {
    // 最大文件大小(字节)，30MB
    maxFileSize: 30 * 1024 * 1024,

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

    // 同时上传的最大数量（移动端降低并发数）
    maxSimultaneousUploads: navigator.userAgent.toLowerCase().includes('mobile') ? 2 : 3
  };

  export default {
    uploadConfig,
  };
