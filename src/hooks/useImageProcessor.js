import { useState, useEffect, useCallback, useRef } from 'react';
import { processImageRotation, revokeBlobUrl } from '../utils/imageUtils';

/**
 * 🚀 统一的图片处理Hook
 * 用于预览组件的图片旋转和缓存管理
 */
export const useImageProcessor = () => {
  const [processedImageUrl, setProcessedImageUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  // 用于存储当前处理的Blob URL，方便清理
  const currentBlobUrlRef = useRef('');
  
  /**
   * 处理图片旋转
   */
  const processImage = useCallback(async (imageUrl, options = {}) => {
    if (!imageUrl) {
      setProcessedImageUrl('');
      setError(null);
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      console.log('🚀 开始处理图片:', imageUrl);
      const result = await processImageRotation(imageUrl, options);
      
      // 如果之前有Blob URL，先清理
      if (currentBlobUrlRef.current && currentBlobUrlRef.current !== result) {
        revokeBlobUrl(currentBlobUrlRef.current);
      }
      
      // 记录新的Blob URL
      if (result && result.startsWith('blob:')) {
        currentBlobUrlRef.current = result;
      } else {
        currentBlobUrlRef.current = '';
      }
      
      setProcessedImageUrl(result);
      console.log('✅ 图片处理完成:', result);
      
    } catch (err) {
      console.error('❌ 图片处理失败:', err);
      setError(err.message || '图片处理失败');
      setProcessedImageUrl(imageUrl); // 失败时使用原图
    } finally {
      setIsProcessing(false);
    }
  }, []);
  
  /**
   * 清理资源
   */
  const cleanup = useCallback(() => {
    if (currentBlobUrlRef.current) {
      revokeBlobUrl(currentBlobUrlRef.current);
      currentBlobUrlRef.current = '';
    }
    setProcessedImageUrl('');
    setIsProcessing(false);
    setError(null);
  }, []);
  
  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    cleanup();
  }, [cleanup]);
  
  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      if (currentBlobUrlRef.current) {
        revokeBlobUrl(currentBlobUrlRef.current);
      }
    };
  }, []);
  
  return {
    processedImageUrl,
    isProcessing,
    error,
    processImage,
    cleanup,
    reset
  };
};

/**
 * 🚀 预览组件专用的图片处理Hook
 * 自动处理visible状态变化和资源清理
 */
export const usePreviewImageProcessor = (imageUrl, visible) => {
  const [processedImageUrl, setProcessedImageUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  // 当预览打开或图片URL变化时处理图片
  useEffect(() => {
    if (visible && imageUrl) {
      setIsProcessing(true);
      setError(null);
      
      processImageRotation(imageUrl)
        .then((result) => {
          setProcessedImageUrl(result);
          setIsProcessing(false);
        })
        .catch((err) => {
          console.error('图片处理失败:', err);
          setError(err.message || '图片处理失败');
          setProcessedImageUrl(imageUrl); // 失败时使用原图
          setIsProcessing(false);
        });
    } else {
      // 预览关闭时清理状态
      setProcessedImageUrl('');
      setIsProcessing(false);
      setError(null);
    }
  }, [visible, imageUrl]);
  
  // 预览关闭时的清理函数
  const handleClose = useCallback(() => {
    setProcessedImageUrl('');
    setIsProcessing(false);
    setError(null);
  }, []);
  
  return {
    processedImageUrl,
    isProcessing,
    error,
    handleClose
  };
};

/**
 * 🚀 图片处理状态管理Hook
 * 提供更细粒度的状态控制
 */
export const useImageProcessingState = () => {
  const [state, setState] = useState({
    processedImageUrl: '',
    isProcessing: false,
    error: null,
    progress: 0
  });
  
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  
  const resetState = useCallback(() => {
    setState({
      processedImageUrl: '',
      isProcessing: false,
      error: null,
      progress: 0
    });
  }, []);
  
  return {
    ...state,
    updateState,
    resetState
  };
};