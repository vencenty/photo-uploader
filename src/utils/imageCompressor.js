/**
 * 图片压缩工具
 */
import { uploadConfig } from '../config/app.config';

/**
 * 检查文件是否需要压缩
 * @param {File} file - 原始文件
 * @returns {boolean} - 是否需要压缩
 */
export const isCompressionNeeded = (file) => {
  // 检查是否开启了压缩功能
  if (!uploadConfig.compression.enabled) {
    return false;
  }
  
  // 检查是否是图片文件
  if (!file.type.startsWith('image/')) {
    return false;
  }
  
  // 检查文件大小是否超过阈值
  return file.size > uploadConfig.maxFileSize;
};

/**
 * 压缩图片
 * @param {File} file - 原始文件
 * @param {object} options - 压缩选项
 * @returns {Promise<File>} - 压缩后的文件
 */
export const compressImage = async (file, options = {}) => {
  // 如果不需要压缩，直接返回原文件
  if (!isCompressionNeeded(file)) {
    console.log('图片无需压缩:', file.name);
    return file;
  }
  
  console.log(`开始压缩图片: ${file.name}，原始大小: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
  
  // 合并配置选项
  const config = {
    ...uploadConfig.compression,
    ...options
  };
  
  return new Promise((resolve, reject) => {
    // 创建文件读取器
    const reader = new FileReader();
    
    // 读取失败处理
    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };
    
    // 读取成功后处理
    reader.onload = (event) => {
      // 创建图片对象
      const img = new Image();
      
      // 图片加载失败处理
      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };
      
      // 图片加载成功后处理
      img.onload = () => {
        // 计算压缩后的宽高
        let width = img.width;
        let height = img.height;
        
        // 如果图片尺寸超过最大限制，进行等比例缩小
        if (width > config.maxWidth) {
          const ratio = config.maxWidth / width;
          width = config.maxWidth;
          height = height * ratio;
        }
        
        if (height > config.maxHeight) {
          const ratio = config.maxHeight / height;
          height = config.maxHeight;
          width = width * ratio;
        }
        
        // 创建Canvas元素
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // 在Canvas上绘制图片
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // 将Canvas转换为Blob
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('图片压缩失败'));
            return;
          }
          
          // 创建压缩后的文件对象
          const compressedFile = new File(
            [blob],
            file.name,
            { type: config.mimeType || file.type }
          );
          
          console.log(`图片压缩完成: ${file.name}，压缩后大小: ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB`);
          
          // 如果压缩后仍然超过大小限制，递归压缩
          if (compressedFile.size > uploadConfig.maxFileSize && config.quality > 0.1) {
            console.log(`压缩后仍超过大小限制，继续压缩: ${file.name}`);
            // 递归压缩，降低质量
            resolve(compressImage(file, {
              ...config,
              quality: config.quality - 0.1
            }));
          } else {
            resolve(compressedFile);
          }
        }, config.mimeType || file.type, config.quality);
      };
      
      // 设置图片源
      img.src = event.target.result;
    };
    
    // 读取文件为DataURL
    reader.readAsDataURL(file);
  });
};

/**
 * 处理上传前的图片（检查并压缩）
 * @param {File} file - 原始文件
 * @returns {Promise<File>} - 处理后的文件
 */
export const processImageBeforeUpload = async (file) => {
  try {
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      throw new Error('只能上传图片文件');
    }
    
    // 检查文件大小
    if (file.size > uploadConfig.maxFileSize) {
      console.log(`文件大小超过限制，需要压缩: ${file.name}`);
      return await compressImage(file);
    }
    
    return file;
  } catch (error) {
    console.error('处理图片失败:', error);
    throw error;
  }
};

// 默认导出所有函数
export default {
  isCompressionNeeded,
  compressImage,
  processImageBeforeUpload
};