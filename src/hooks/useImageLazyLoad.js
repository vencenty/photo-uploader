import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 图片懒加载Hook
 * @param {string} src 图片URL
 * @param {Object} options 配置选项
 * @returns {Object} 懒加载状态和相关方法
 */
export const useImageLazyLoad = (src, options = {}) => {
  const {
    threshold = 0.1, // 触发加载的阈值
    rootMargin = '50px', // 根边距
    enabled = true, // 是否启用懒加载
    fallbackSrc = null, // 出错时的备用图片
    maxRetries = 3, // 最大重试次数
    retryDelay = 1000 // 重试延迟（毫秒）
  } = options;

  const [status, setStatus] = useState('idle'); // idle, loading, loaded, error
  const [imageSrc, setImageSrc] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const imgRef = useRef(null);
  const observerRef = useRef(null);
  const loadTimeoutRef = useRef(null);

  // 清理函数
  const cleanup = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  // 加载图片
  const loadImage = useCallback((imageUrl) => {
    if (!imageUrl) return;

    setStatus('loading');
    setError(null);

    const image = new Image();
    
    // 设置加载超时
    loadTimeoutRef.current = setTimeout(() => {
      setStatus('error');
      setError(new Error('图片加载超时'));
    }, 15000);

    const handleLoad = () => {
      clearTimeout(loadTimeoutRef.current);
      setStatus('loaded');
      setImageSrc(imageUrl);
      setRetryCount(0);
    };

    const handleError = () => {
      clearTimeout(loadTimeoutRef.current);
      console.error('图片加载失败:', imageUrl);
      
      // 尝试重试
      if (retryCount < maxRetries) {
        console.log(`重试加载图片 (${retryCount + 1}/${maxRetries}):`, imageUrl);
        setRetryCount(prev => prev + 1);
        
        // 延迟重试
        setTimeout(() => {
          loadImage(imageUrl);
        }, retryDelay);
      } else {
        // 重试次数用完，设置错误状态
        setStatus('error');
        setError(new Error('图片加载失败'));
        
        // 尝试使用备用图片
        if (fallbackSrc && fallbackSrc !== imageUrl) {
          setTimeout(() => {
            loadImage(fallbackSrc);
          }, 500);
        }
      }
    };

    image.addEventListener('load', handleLoad);
    image.addEventListener('error', handleError);
    
    // 设置跨域属性
    image.crossOrigin = 'anonymous';
    image.src = imageUrl;

    return () => {
      image.removeEventListener('load', handleLoad);
      image.removeEventListener('error', handleError);
    };
  }, [retryCount, maxRetries, retryDelay, fallbackSrc]);

  // 手动重试
  const retry = useCallback(() => {
    setRetryCount(0);
    loadImage(src);
  }, [src, loadImage]);

  // 设置Intersection Observer
  useEffect(() => {
    if (!enabled || !src) return;

    const currentRef = imgRef.current;
    if (!currentRef) return;

    // 如果浏览器不支持Intersection Observer，直接加载
    if (!window.IntersectionObserver) {
      loadImage(src);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && status === 'idle') {
          loadImage(src);
          observer.unobserve(currentRef);
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(currentRef);
    observerRef.current = observer;

    return () => {
      observer.unobserve(currentRef);
    };
  }, [src, enabled, threshold, rootMargin, status, loadImage]);

  // 组件卸载时清理
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    ref: imgRef,
    src: imageSrc,
    status,
    error,
    retry,
    isLoading: status === 'loading',
    isLoaded: status === 'loaded',
    isError: status === 'error',
    isIdle: status === 'idle'
  };
};

/**
 * 批量图片预加载Hook
 * @param {Array} urls 图片URL数组
 * @param {Object} options 配置选项
 * @returns {Object} 预加载状态
 */
export const useBatchImagePreload = (urls = [], options = {}) => {
  const {
    batchSize = 5, // 批量加载大小
    delay = 100, // 批次间延迟（毫秒）
    enabled = true
  } = options;

  const [loadedCount, setLoadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (!enabled || !urls.length) return;

    setTotalCount(urls.length);
    setLoadedCount(0);
    setIsLoading(true);
    setErrors([]);

    const loadBatch = async (batchUrls, startIndex) => {
      const promises = batchUrls.map((url, index) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            setLoadedCount(prev => prev + 1);
            resolve({ url, index: startIndex + index, success: true });
          };
          img.onerror = () => {
            setLoadedCount(prev => prev + 1);
            setErrors(prev => [...prev, { url, index: startIndex + index }]);
            resolve({ url, index: startIndex + index, success: false });
          };
          img.src = url;
        });
      });

      return Promise.all(promises);
    };

    const loadAllBatches = async () => {
      for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        await loadBatch(batch, i);
        
        // 批次间延迟
        if (i + batchSize < urls.length) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      setIsLoading(false);
    };

    loadAllBatches();
  }, [urls, batchSize, delay, enabled]);

  return {
    loadedCount,
    totalCount,
    isLoading,
    errors,
    progress: totalCount > 0 ? loadedCount / totalCount : 0
  };
};

/**
 * 图片内存管理Hook
 * @param {number} maxCacheSize 最大缓存大小（张）
 */
export const useImageMemoryManager = (maxCacheSize = 100) => {
  const cacheRef = useRef(new Map());
  const [cacheSize, setCacheSize] = useState(0);

  const addToCache = useCallback((url, element) => {
    const cache = cacheRef.current;
    
    // 如果缓存已满，删除最老的项目
    if (cache.size >= maxCacheSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    cache.set(url, {
      element,
      timestamp: Date.now()
    });
    
    setCacheSize(cache.size);
  }, [maxCacheSize]);

  const removeFromCache = useCallback((url) => {
    const cache = cacheRef.current;
    cache.delete(url);
    setCacheSize(cache.size);
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    setCacheSize(0);
  }, []);

  const getFromCache = useCallback((url) => {
    return cacheRef.current.get(url);
  }, []);

  return {
    addToCache,
    removeFromCache,
    clearCache,
    getFromCache,
    cacheSize
  };
}; 