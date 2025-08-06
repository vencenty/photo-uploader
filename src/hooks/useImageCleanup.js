import { useEffect, useRef } from 'react';
import { revokeBlobUrl, getImageCache } from '../utils/imageUtils';

/**
 * 🚀 图片资源清理Hook
 * 用于在组件卸载时清理Blob URLs，防止内存泄漏
 */
export const useImageCleanup = () => {
  const blobUrlsRef = useRef(new Set());
  
  /**
   * 注册需要清理的Blob URL
   */
  const registerBlobUrl = (url) => {
    if (url && url.startsWith('blob:')) {
      blobUrlsRef.current.add(url);
    }
  };
  
  /**
   * 取消注册Blob URL（当不再需要时）
   */
  const unregisterBlobUrl = (url) => {
    if (url && url.startsWith('blob:')) {
      blobUrlsRef.current.delete(url);
    }
  };
  
  /**
   * 立即清理指定的Blob URL
   */
  const cleanupBlobUrl = (url) => {
    if (url && url.startsWith('blob:')) {
      revokeBlobUrl(url);
      blobUrlsRef.current.delete(url);
    }
  };
  
  /**
   * 清理所有注册的Blob URLs
   */
  const cleanupAll = () => {
    for (const url of blobUrlsRef.current) {
      revokeBlobUrl(url);
    }
    blobUrlsRef.current.clear();
  };
  
  // 组件卸载时清理所有Blob URLs
  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, []);
  
  return {
    registerBlobUrl,
    unregisterBlobUrl,
    cleanupBlobUrl,
    cleanupAll
  };
};

/**
 * 🚀 页面卸载时的全局资源清理Hook
 * 清理所有缓存的Blob URLs
 */
export const useGlobalImageCleanup = () => {
  useEffect(() => {
    const handleBeforeUnload = () => {
      const cache = getImageCache();
      cache.clear();
    };
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时触发垃圾回收建议
        if (window.gc) {
          window.gc();
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
};

/**
 * 🚀 内存监控Hook
 * 监控内存使用情况，在内存不足时自动清理缓存
 */
export const useMemoryMonitor = (options = {}) => {
  const {
    threshold = 0.8, // 内存使用率阈值
    checkInterval = 30000, // 检查间隔（毫秒）
    enabled = true
  } = options;
  
  useEffect(() => {
    if (!enabled || !performance.memory) {
      return;
    }
    
    const checkMemoryUsage = () => {
      const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
      const usage = usedJSHeapSize / jsHeapSizeLimit;
      
      if (usage > threshold) {
        console.warn(`🚨 内存使用率过高: ${(usage * 100).toFixed(1)}%，开始清理缓存`);
        
        // 清理图片缓存
        const cache = getImageCache();
        const stats = cache.getStats();
        
        if (stats.size > 10) {
          // 清理一半的缓存
          for (let i = 0; i < Math.floor(stats.size / 2); i++) {
            cache._cleanup();
          }
          console.log(`🧹 已清理 ${Math.floor(stats.size / 2)} 个缓存项`);
        }
        
        // 建议垃圾回收
        if (window.gc) {
          window.gc();
        }
      }
    };
    
    const interval = setInterval(checkMemoryUsage, checkInterval);
    
    return () => {
      clearInterval(interval);
    };
  }, [threshold, checkInterval, enabled]);
};