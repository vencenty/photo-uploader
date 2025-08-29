import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  Form, Input, Button, Card, Typography, message,
  Checkbox, Row, Col, Space,
  Modal, Spin, Statistic, Tooltip, notification
} from 'antd';
import {
  SaveOutlined, InfoCircleOutlined, ScissorOutlined, DeleteOutlined,
  ScanOutlined, CheckCircleOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import { getOrderInfo, submitOrder } from '../services/api';
import PhotoUploader from '../components/PhotoUploader';
import DuplicatePhotosModal from '../components/DuplicatePhotosModal';
import { detectAllDuplicates, formatDetectionResults } from '../utils/duplicateDetection';

import { uploadConfig } from '../config/app.config';
import { getSizeOptions, PHOTO } from '../config/photo';

const { Title, Text } = Typography;
const { TextArea } = Input;

// 支持的尺寸选项 - 从配置文件获取
const sizeOptions = getSizeOptions();

// 预定义常量样式，避免每次渲染重新创建
const STATIC_STYLES = {
  container: { maxWidth: 1200, margin: '0 auto' },
  mobileContainer: { maxWidth: 1200, margin: '0 auto', padding: '10px 0' },
  desktopContainer: { maxWidth: 1200, margin: '0 auto', padding: '20px 0' },
  warningBox: {
    background: '#fff2f0',
    border: '1px solid #ffccc7',
    borderRadius: '6px',
    padding: '12px 16px',
    marginBottom: '20px',
    lineHeight: '1.6'
  },
  submitButton: {
    touchAction: 'manipulation',
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none'
  },
  mobileSubmitButton: {
    minHeight: '44px',
    touchAction: 'manipulation',
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none'
  }
};

// 优化后的PhotoUploader组件 - 使用memo避免不必要的重新渲染
const MemoizedPhotoUploader = memo(({ 
  size, 
  photos, 
  onPhotosChange, 
  uploadingCount, 
  onUploadingCountChange, 
  isMobile,
  orderSn
}) => (
  <PhotoUploader
    size={size}
    photos={photos}
    onPhotosChange={onPhotosChange}
    uploadingCount={uploadingCount}
    onUploadingCountChange={onUploadingCountChange}
    isMobile={isMobile}
    orderSn={orderSn}
  />
));

MemoizedPhotoUploader.displayName = 'MemoizedPhotoUploader';

function OrderUploadPage() {
  const navigate = useNavigate();
  const location = useLocation();
  

  const queryParams = new URLSearchParams(location.search);
  const orderSnFromQuery = queryParams.get('order_sn') || '';

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 判断是否是移动设备
  const isMobile = windowWidth < 768;

  // 订单信息状态
  const [orderInfo, setOrderInfo] = useState({
    order_sn: orderSnFromQuery,
    receiver: '',
    remark: '' // 备注字段不显示，但提交时发送空字符串
  });

  // 选中的尺寸状态
  const [selectedSizes, setSelectedSizes] = useState([]);

  // 每个尺寸对应的照片状态
  const [sizePhotos, setSizePhotos] = useState({});


  
  // 自动保存相关状态
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // idle, saving, success, error
  const autoSaveTimerRef = useRef(null);
  const lastAutoSaveTimeRef = useRef(0);
  


  // 提交订单确认对话框
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 未调整大小提示对话框
  const [isResizeWarningOpen, setIsResizeWarningOpen] = useState(false);
  const [unadjustedPhotosInfo, setUnadjustedPhotosInfo] = useState([]);

  // 尺寸取消确认对话框
  const [isSizeCancelConfirmOpen, setIsSizeCancelConfirmOpen] = useState(false);
  const [sizesToCancel, setSizesToCancel] = useState([]);
  const [pendingCheckedSizes, setPendingCheckedSizes] = useState([]);

  // 修改：改用对象存储每个尺寸的上传状态
  const [uploadingPhotosBySize, setUploadingPhotosBySize] = useState({});
  
  // 重复图片检测相关状态
  const [isDetectingDuplicates, setIsDetectingDuplicates] = useState(false);
  const [duplicateDetectionResult, setDuplicateDetectionResult] = useState(null);
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false);
  
  // 缓存复杂计算结果和防抖定时器
  const calculationCache = useRef(new Map());
  const debounceTimers = useRef(new Map());

  // 使用useMemo优化总上传数计算
  const totalUploading = useMemo(() => {
    return Object.values(uploadingPhotosBySize).reduce((total, count) => total + count, 0);
  }, [uploadingPhotosBySize]);
  
  // 稳定的计算函数引用
  const calcTotalUploading = useCallback(() => totalUploading, [totalUploading]);

  // 检查未调整大小的照片
  const checkUnadjustedPhotos = useCallback(() => {
    const unadjustedInfo = [];
    
    selectedSizes.forEach(size => {
      // 查找当前尺寸的配置
      const sizeConfig = PHOTO.find(item => item.name === size);
      
      // 如果该尺寸建议调整大小
      if (sizeConfig && sizeConfig.recommendResize) {
        const photos = sizePhotos[size] || [];
        
        // 统计未裁剪（未调整）的照片数量
        const unadjustedCount = photos.filter(photo => !photo.cropped).length;
        
        if (unadjustedCount > 0) {
          unadjustedInfo.push({
            size: size,
            count: unadjustedCount,
            total: photos.length
          });
        }
      }
    });
    
    return unadjustedInfo;
  }, [selectedSizes, sizePhotos]);

  // 使用useMemo优化总照片数计算，减少不必要的重新计算
  const totalPhotos = useMemo(() => {
    let total = 0;
    Object.entries(sizePhotos).forEach(([size, photos]) => {
      // 只统计选中尺寸的照片
      if (selectedSizes.includes(size)) {
        // 累加每张照片的数量
        total += photos.reduce((sum, photo) => sum + (photo.quantity || 1), 0);
      }
    });
    return total;
  }, [sizePhotos, selectedSizes]);

  // 查询订单信息（从API获取）
  useEffect(() => {
    const fetchOrderInfo = async () => {
      if (!orderSnFromQuery) return;

      setLoadingData(true);
      try {
        // 调用API获取订单信息
        const response = await getOrderInfo(orderSnFromQuery);
        console.log('订单查询结果:', response);

        // 设置默认值
        const formData = {
          order_sn: orderSnFromQuery,
          receiver: '',
          remark: ''
        };

        // 如果查询到数据，使用返回的数据
        if (response.data) {
          // 根据API返回的数据结构提取所需信息
          formData.receiver = response.data.receiver || '';
          // 删除备注字段显示，但保持空字符串用于提交
          formData.remark = '';

          // 如果有照片数据，设置选中的尺寸和照片
          if (response.data.photos && Array.isArray(response.data.photos)) {
            const newSizePhotos = {};
            const newSelectedSizes = [];

            // 处理每种规格的照片
            response.data.photos.forEach(item => {
              if (item.spec && Array.isArray(item.metadata) && item.metadata.length > 0) {
                // 添加到选中的尺寸
                newSelectedSizes.push(item.spec);

                // 创建照片对象数组
                newSizePhotos[item.spec] = item.metadata.map(photoMeta => ({
                  id: uuidv4(),
                  name: photoMeta.url.split('/').pop() || '照片',
                  url: photoMeta.url,
                  serverUrl: photoMeta.url,
                  status: 'done',
                  cropped: photoMeta.is_resized === 1, // 根据is_resized设置cropped状态
                  quantity: photoMeta.num || 1 // 从服务端返回的num字段设置数量
                }));
              }
            });

            // 更新状态
            setSelectedSizes(newSelectedSizes);
            setSizePhotos(newSizePhotos);
          }

          // 使用唯一 key 防止开发环境 StrictMode 下 effect 执行两次导致重复弹窗
          message.success({ content: '订单信息加载成功', key: 'order-load-success' });
        } else {
          message.info('未查询到订单信息，将创建新订单');
        }

        // 设置到表单
        form.setFieldsValue(formData);
        setOrderInfo(formData);
      } catch (error) {
        console.error('获取订单信息失败:', error);
        // 显示服务端返回的错误信息
        message.error(error.message || '获取订单信息失败');
        // 出错时仍然设置订单号
        form.setFieldsValue({ order_sn: orderSnFromQuery });
        setOrderInfo({ order_sn: orderSnFromQuery, receiver: '', remark: '' });
      } finally {
        setLoadingData(false);
      }
    };

    fetchOrderInfo();
  }, [orderSnFromQuery, form]);

  // 处理表单值变化
  const handleValuesChange = (changedValues, allValues) => {
    setOrderInfo(prev => ({
      ...prev,
      ...changedValues,
      // 确保 remark 字段始终为空字符串
      remark: ''
    }));
  };

  // 处理尺寸选择
  const handleSizeToggle = (checkedValue) => {
    // 获取已取消选择的尺寸
    const unselectedSizes = selectedSizes.filter(size => !checkedValue.includes(size));

    // 检查被取消的尺寸中是否有已上传的照片
    const sizesWithPhotos = unselectedSizes.filter(size => {
      const photos = sizePhotos[size] || [];
      return photos.length > 0;
    });

    // 如果有尺寸包含照片，需要用户确认
    if (sizesWithPhotos.length > 0) {
      setSizesToCancel(sizesWithPhotos);
      setPendingCheckedSizes(checkedValue);
      setIsSizeCancelConfirmOpen(true);
      return; // 暂停处理，等待用户确认
    }

    // 如果没有照片需要删除，直接执行尺寸变更
    executeSizeChange(checkedValue);
  };

  // 执行尺寸变更的具体逻辑
  const executeSizeChange = (checkedValue) => {
    // 获取已取消选择的尺寸
    const unselectedSizes = selectedSizes.filter(size => !checkedValue.includes(size));

    setSelectedSizes(checkedValue);

    // 为新选择的尺寸初始化照片数组
    const newSizePhotos = { ...sizePhotos };

    // 移除已取消选择的尺寸的照片
    unselectedSizes.forEach(size => {
      delete newSizePhotos[size];
    });

    // 为新选择的尺寸初始化照片数组
    checkedValue.forEach(size => {
      if (!newSizePhotos[size]) {
        newSizePhotos[size] = [];
      }
    });

    setSizePhotos(newSizePhotos);

    // 为新选择的尺寸初始化上传计数
    const newUploadingCounts = { ...uploadingPhotosBySize };

    // 移除已取消选择的尺寸的上传计数
    unselectedSizes.forEach(size => {
      delete newUploadingCounts[size];
    });

    checkedValue.forEach(size => {
      if (newUploadingCounts[size] === undefined) {
        newUploadingCounts[size] = 0;
      }
    });

    setUploadingPhotosBySize(newUploadingCounts);
  };

  // 确认取消尺寸选择
  const handleConfirmSizeCancel = () => {
    // 执行尺寸变更，这会删除相关照片
    executeSizeChange(pendingCheckedSizes);
    
    // 显示删除成功的提示
    const totalDeletedPhotos = sizesToCancel.reduce((total, size) => {
      const photos = sizePhotos[size] || [];
      return total + photos.reduce((sum, photo) => sum + (photo.quantity || 1), 0);
    }, 0);
    
    message.success(`已删除 ${totalDeletedPhotos} 张照片`);
    
    // 关闭确认对话框
    setIsSizeCancelConfirmOpen(false);
    setSizesToCancel([]);
    setPendingCheckedSizes([]);
  };

  // 取消尺寸选择变更
  const handleCancelSizeChange = () => {
    // 不执行任何变更，保持原状
    setIsSizeCancelConfirmOpen(false);
    setSizesToCancel([]);
    setPendingCheckedSizes([]);
    // 不需要回滚selectedSizes，因为它还没有被修改
  };

  // 使用useCallback优化上传计数更新，减少依赖
  const handleUploadingCountChange = useCallback((size, countUpdater) => {
    setUploadingPhotosBySize(prev => {
      const currentCount = prev[size] || 0;
      const newCount = typeof countUpdater === 'function'
        ? countUpdater(currentCount)
        : countUpdater;

      return {
        ...prev,
        [size]: newCount
      };
    });
  }, []);

  // 防抖处理函数
  const debounce = useCallback((key, func, delay = 300) => {
    const timers = debounceTimers.current;
    if (timers.has(key)) {
      clearTimeout(timers.get(key));
    }
    
    const timerId = setTimeout(() => {
      func();
      timers.delete(key);
    }, delay);
    
    timers.set(key, timerId);
  }, []);

  // ✅ 修复：handlePhotosChange 应该直接传递状态更新函数
  const handlePhotosChange = useCallback((stateUpdater) => {
    // PhotoUploader传递的是状态更新函数，直接传给setSizePhotos
    setSizePhotos(stateUpdater);
  }, []);

  // 处理重复图片检测
  const handleDetectDuplicates = useCallback(() => {
    // 检查是否有照片正在上传
    if (totalUploading > 0) {
      message.warning('有照片正在上传中，请等待上传完成后再检测重复图片');
      return;
    }

    // 检查是否有足够的照片进行检测
    if (totalPhotos < 2) {
      message.info('至少需要2张照片才能进行重复检测');
      return;
    }

    setIsDetectingDuplicates(true);
    
    try {
      console.log('开始检测重复图片（基于SHA1）...', { selectedSizes, sizePhotos });
      
      // 执行重复检测（同步操作，基于SHA1，性能极佳）
      const detectionResults = detectAllDuplicates(sizePhotos, selectedSizes);
      
      // 格式化检测结果
      const formattedResults = formatDetectionResults(detectionResults);
      setDuplicateDetectionResult(formattedResults);
      
      if (formattedResults.hasDuplicates) {
        message.warning({
          content: `检测完成：${formattedResults.summary}`,
          duration: 5
        });
        // 自动打开详情弹窗
        setTimeout(() => {
          setDuplicateModalVisible(true);
        }, 500);
      } else {
        message.success('检测完成：未发现重复图片');
      }
      
    } catch (error) {
      console.error('重复图片检测失败:', error);
      message.error('重复图片检测失败，请重试');
      setDuplicateDetectionResult(null);
    } finally {
      setIsDetectingDuplicates(false);
    }
  }, [totalUploading, totalPhotos, selectedSizes, sizePhotos]);

  // 处理删除重复图片
  const handleDeleteDuplicatePhotos = useCallback(async (photoIds) => {
    if (!photoIds || photoIds.length === 0) {
      return;
    }

    try {
      // 按规格分组删除照片
      const deletePromises = [];
      
      selectedSizes.forEach(size => {
        const photosToDelete = photoIds.filter(photoId => {
          const photos = sizePhotos[size] || [];
          return photos.some(photo => photo.id === photoId);
        });
        
        if (photosToDelete.length > 0) {
          deletePromises.push(
            new Promise((resolve) => {
              // 使用现有的删除逻辑
              setSizePhotos(prev => {
                const currentSizePhotos = prev[size] || [];
                const newSizePhotos = currentSizePhotos.filter(
                  photo => !photosToDelete.includes(photo.id)
                );
                
                resolve();
                return {
                  ...prev,
                  [size]: newSizePhotos
                };
              });
            })
          );
        }
      });
      
      await Promise.all(deletePromises);
      
      // 清空检测结果，需要重新检测
      setDuplicateDetectionResult(null);
      
    } catch (error) {
      console.error('删除重复图片失败:', error);
      throw error;
    }
  }, [selectedSizes, sizePhotos]);

  // 使用稳定的事件处理函数缓存
  const uploadCountHandlers = useMemo(() => {
    const handlers = {};
    selectedSizes.forEach(size => {
      // 创建稳定的事件处理函数引用
      handlers[size] = (countUpdater) => handleUploadingCountChange(size, countUpdater);
    });
    return handlers;
  }, [selectedSizes, handleUploadingCountChange]);

  // 缓存复杂的UI状态计算
  const uiState = useMemo(() => {
    const hasOrderInfo = !!(orderInfo.order_sn && orderInfo.receiver);
    const hasPhotos = totalPhotos > 0;
    const isUploading = totalUploading > 0;
    
    return {
      canSubmit: hasOrderInfo && hasPhotos && !isUploading && !loading,
      submitTooltip: isUploading
        ? "有照片正在上传中，请等待上传完成"
        : !hasPhotos
        ? "请先上传照片"
        : !orderInfo.order_sn
        ? "请输入订单号"
        : !orderInfo.receiver
        ? "请输入收货人（必填项）"
        : selectedSizes.length === 0
        ? "请至少选择一种尺寸"
        : "点击提交订单",
      submitButtonText: isUploading
        ? `正在上传 (${totalUploading})`
        : loading
        ? "提交中..."
        : "提交订单"
    };
  }, [orderInfo.order_sn, orderInfo.receiver, totalPhotos, totalUploading, loading, selectedSizes.length]);

  // 实际执行提交验证的函数
  const actualSubmit = () => {
    // 防止重复提交 - 如果已经在加载状态则不处理
    if (loading) {
      message.info('正在处理，请稍候...');
      return;
    }

    form.validateFields().then(values => {
      // 检查基本表单字段
      if (!orderInfo.order_sn) {
        message.error('请输入订单号');
        return;
      }

      if (!orderInfo.receiver) {
        message.error('请输入收货人');
        return;
      }

      // 检查是否有照片
      if (totalPhotos === 0) {
        message.error('请至少上传一张照片');
        return;
      }

      // 检查是否有未上传完的照片
      if (totalUploading > 0) {
        message.warning('还有照片正在上传中，请等待上传完成后提交');
        return;
      }

      // 打开确认对话框
      setIsModalOpen(true);
    }).catch(errorInfo => {
      console.log('表单验证失败:', errorInfo);
      message.error('表单验证失败，请检查填写的信息');
    });
  };

  // 提交订单前验证
  const handleSubmit = () => {
    // 检查未调整大小的照片
    const unadjustedInfo = checkUnadjustedPhotos();
    
    if (unadjustedInfo.length > 0) {
      // 有未调整的照片，显示警告对话框
      setUnadjustedPhotosInfo(unadjustedInfo);
      setIsResizeWarningOpen(true);
    } else {
      // 没有未调整的照片，直接执行提交验证
      actualSubmit();
    }
  };

  // 显示自动保存通知
  const showAutoSaveNotification = useCallback(() => {
    const autoSaveDiv = document.createElement('div');
    autoSaveDiv.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #f6ffed 0%, #e6f7ff 100%);
      border: 1px solid #52c41a;
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 8px 24px rgba(82, 196, 26, 0.2), 0 3px 8px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      max-width: 320px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      animation: slideIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      cursor: pointer;
    `;
    autoSaveDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 20px;">💾</span>
        <div>
          <div style="color: #389e0d; font-weight: 600; font-size: 15px; margin-bottom: 2px;">
            照片自动保存成功
          </div>
        </div>
        <span style="color: #52c41a; font-weight: bold; font-size: 16px;">✓</span>
      </div>
    `;
    
    // 点击关闭
    autoSaveDiv.onclick = () => {
      if (autoSaveDiv.parentNode) {
        autoSaveDiv.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          if (autoSaveDiv.parentNode) {
            autoSaveDiv.parentNode.removeChild(autoSaveDiv);
          }
        }, 300);
      }
    };
    
    document.body.appendChild(autoSaveDiv);
    
    // 4秒后自动移除
    setTimeout(() => {
      if (autoSaveDiv.parentNode) {
        autoSaveDiv.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          if (autoSaveDiv.parentNode) {
            autoSaveDiv.parentNode.removeChild(autoSaveDiv);
          }
        }, 300);
      }
    }, 4000);
  }, []);

  // 自动保存函数
  const performAutoSave = useCallback(async () => {
    // 防止重复自动保存
    if (autoSaveStatus === 'saving' || loading) {
      return;
    }

    // 基本验证 - 必须有订单号和收货人
    if (!orderInfo.order_sn || !orderInfo.receiver) {
      return;
    }

    // 检查是否有照片正在上传
    if (totalUploading > 0) {
      return;
    }

    // 检查是否有照片
    if (totalPhotos === 0) {
      return;
    }

    setAutoSaveStatus('saving');
    
    try {
      // 准备提交数据 - 复用手动提交的逻辑
      const photosArray = [];

      Object.entries(sizePhotos).forEach(([sizeStr, photos]) => {
        if (selectedSizes.includes(sizeStr) && photos.length > 0) {
          const metadata = photos.map(photo => ({
            url: photo.serverUrl || photo.url,
            is_resized: photo.cropped ? 1 : 0,
            num: photo.quantity || 1
          }));

          photosArray.push({
            spec: sizeStr,
            metadata: metadata
          });
        }
      });

      const submitData = {
        order_sn: orderInfo.order_sn,
        receiver: orderInfo.receiver,
        remark: orderInfo.remark,
        photos: photosArray,
        save_type: 'auto' // 标记这是自动保存请求
      };



      const response = await submitOrder(submitData);

      if (response.code === 0) {
        setAutoSaveStatus('success');
        lastAutoSaveTimeRef.current = Date.now();
        
        // 在屏幕右下角显示自动保存成功提示
        
        // 显示自动保存成功通知
        showAutoSaveNotification();
        
        // 延迟更新状态，避免频繁重新渲染
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      } else {
        throw new Error(response.msg || '自动保存失败');
      }
    } catch (error) {
      console.error('自动保存失败:', error);
      setAutoSaveStatus('error');
      
      // 静默处理错误，不干扰用户体验
      setTimeout(() => setAutoSaveStatus('idle'), 5000);
    }
  }, [
    autoSaveStatus,
    loading,
    orderInfo.order_sn,
    orderInfo.receiver,
    orderInfo.remark,
    totalPhotos,
    sizePhotos,
    selectedSizes,
    showAutoSaveNotification
  ]);

  // 启动/重置自动保存定时器
  const resetAutoSaveTimer = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setInterval(() => {
      performAutoSave();
    }, 30000); // 3秒间隔（优化后）
  }, [performAutoSave]);

  // 停止自动保存定时器
  const stopAutoSaveTimer = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);

  // 优化自动保存定时器 - 减少依赖项，使用防抖
  const shouldEnableAutoSave = useMemo(() => {
    return !!(orderInfo.order_sn && orderInfo.receiver && totalPhotos > 0);
  }, [orderInfo.order_sn, orderInfo.receiver, totalPhotos]);

  useEffect(() => {
    if (shouldEnableAutoSave) {
      resetAutoSaveTimer();
    } else {
      stopAutoSaveTimer();
    }

    return () => stopAutoSaveTimer();
  }, [shouldEnableAutoSave, resetAutoSaveTimer, stopAutoSaveTimer]);

  // 页面卸载时清理定时器和防抖定时器
  useEffect(() => {
    return () => {
      stopAutoSaveTimer();
      // 清理所有防抖定时器
      debounceTimers.current.forEach(timerId => clearTimeout(timerId));
      debounceTimers.current.clear();
    };
  }, [stopAutoSaveTimer]);

  // 确认提交
  const handleConfirmSubmit = async () => {
    // 停止自动保存，避免冲突
    stopAutoSaveTimer();
    
    setLoading(true);
    try {
      // 准备提交数据 - 按照API文档要求的格式
      const photosArray = [];

      // 将图片按尺寸整理，使用服务器返回的URL
      Object.entries(sizePhotos).forEach(([sizeStr, photos]) => {
        // 确保只处理选中的尺寸
        if (selectedSizes.includes(sizeStr) && photos.length > 0) {
          // 获取尺寸对应的metadata信息
          const metadata = photos.map(photo => ({
            url: photo.serverUrl || photo.url,
            is_resized: photo.cropped ? 1 : 0, // 1表示已调整尺寸，0表示未调整
            num: photo.quantity || 1 // 用户设置的照片数量
          }));

          // 按API文档格式添加到photos数组
          photosArray.push({
            spec: sizeStr,    // 照片规格，例如"3寸-满版"
            metadata: metadata // 照片元数据数组，包含url和is_resized字段
          });
        }
      });

      // 验证一下数据
      console.log('准备提交订单数据:', {
        order_sn: orderInfo.order_sn,
        receiver: orderInfo.receiver,
        remark: orderInfo.remark,
        photos: photosArray
      });

      // 构建要提交的数据 - 格式要符合接口文档
      const submitData = {
        order_sn: orderInfo.order_sn,
        receiver: orderInfo.receiver,
        remark: orderInfo.remark,
        photos: photosArray,
        save_type: 'manual' // 标记这是手动提交请求
      };

      // 调用API提交订单
      const response = await submitOrder(submitData);

      if (response.code === 0) {
        // 统计每种尺寸的照片数量（考虑每张照片的quantity）
        const sizePhotoCount = {};
        Object.entries(sizePhotos).forEach(([size, photos]) => {
          // 只统计选中的尺寸
          if (selectedSizes.includes(size)) {
            // 计算该尺寸下所有照片的总数量（考虑每张照片的quantity）
            sizePhotoCount[size] = photos.reduce((sum, photo) => sum + (photo.quantity || 1), 0);
          }
        });

        // 关闭对话框
        setIsModalOpen(false);

        // 跳转到成功页面
        navigate('/success', {
          state: {
            total: totalPhotos,
            sizePhotoCount,
            orderSn: orderInfo.order_sn
          }
        });

        message.success('订单提交成功');
      } else {
        // 处理各种错误情况
        setIsModalOpen(false); // 无论什么错误都先关闭对话框
        resetAutoSaveTimer(); // 重新启动自动保存

        if (response.code === -1 && response.msg && response.msg.includes('订单已经进入处理流程')) {
          // 订单已进入处理流程的特殊错误
          Modal.error({
            title: '订单无法修改',
            content: response.msg || '订单已经进入处理流程，无法重新上传图片，如有疑问请联系客服',
            okText: '知道了'
          });
        } else {
          // 其他错误
          message.error(response.msg || '订单提交失败');
        }
      }
    } catch (error) {
      console.error('提交订单失败:', error);

      // 关闭确认对话框并重新启动自动保存
      setIsModalOpen(false);
      resetAutoSaveTimer();

      // 处理错误情况
      if (error.response && error.response.data) {
        // API返回了错误信息
        const errorData = error.response.data;

        if (errorData.code === -1 && errorData.msg && errorData.msg.includes('订单已经进入处理流程')) {
          // 订单已进入处理流程的特殊错误
          Modal.error({
            title: '订单无法修改',
            content: errorData.msg || '订单已经进入处理流程，无法重新上传图片，如有疑问请联系客服',
            okText: '知道了'
          });
        } else {
          // 其他API错误
          message.error(errorData.msg || '订单提交失败');
        }
      } else if (error.message && error.message.includes('Network Error')) {
        // 网络错误
        Modal.error({
          title: '网络连接错误',
          content: '提交订单时网络连接异常，请检查网络后重试',
          okText: '知道了'
        });
      } else {
        // 其他未知错误
        message.error('提交订单失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loadingData} tip="加载订单信息...">
      <div style={isMobile ? STATIC_STYLES.mobileContainer : STATIC_STYLES.desktopContainer}>
        <Title level={isMobile ? 3 : 2}>订单上传</Title>

        {/* 温馨提示 */}
        <div style={{
          ...STATIC_STYLES.warningBox,
          fontSize: isMobile ? '12px' : '14px'
        }}>
          <div style={{ 
            fontWeight: 'bold', 
            color: '#ff4d4f', 
            marginBottom: '8px',
            fontSize: isMobile ? '13px' : '15px'
          }}>
            📋 温馨提示：
          </div>
          <div style={{ color: '#ff4d4f', marginBottom: '6px' }}>
            1. 用此链接上传照片全部为原图上传
          </div>
          <div style={{ color: '#ff4d4f' }}>
            2. 【满版照片和拍立得尺寸照片】请您一定要点击照片进行裁剪，若不裁剪系统会默认按照照片居中进行裁切（会影响出片效果）。另外裁剪请留好构图空间，不要人物或者肢体紧贴画面边缘，满版照片输出四周会有2-3mm的出血线被裁切。
          </div>
        </div>

        {/* 订单基本信息 */}
        <Card title="订单信息" style={{ marginBottom: 16 }}>
          <Form
            form={form}
            layout="vertical"
            initialValues={orderInfo}
            onValuesChange={handleValuesChange}
          >
            <Row gutter={isMobile ? 8 : 24}>
              <Col span={isMobile ? 24 : 12}>
                <Form.Item
                  name="order_sn"
                  label="订单号"
                  rules={[{ required: true, message: '请输入订单号' }]}
                >
                  <Input
                    placeholder="请输入订单号"
                    disabled={!!orderSnFromQuery}
                  />
                </Form.Item>
              </Col>
              <Col span={isMobile ? 24 : 12}>
                <Form.Item
                  name="receiver"
                  label={
                    <span>
                      收货人
                      <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>
                      <span style={{ color: '#ff4d4f', fontSize: '12px', fontWeight: 'normal' }}>
                        （必填）
                      </span>
                    </span>
                  }
                  rules={[{ required: true, message: '请输入收货人' }]}
                >
                  <Input 
                    placeholder="请输入收货人（必填）"
                    style={{
                      borderColor: !orderInfo.receiver && totalPhotos > 0 ? '#ff4d4f' : undefined
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* 删除备注字段，但保持在orderInfo中以便提交时发送空字符串 */}
          </Form>
        </Card>

        {/* 尺寸选择 */}
        <Card
          title={
            <Space>
              <span>选择尺寸</span>
              <Tooltip title="请至少选择一种尺寸，可多选">
                <InfoCircleOutlined style={{ color: '#1890ff' }} />
              </Tooltip>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Checkbox.Group
            value={selectedSizes}
            onChange={handleSizeToggle}
            style={{ width: '100%' }}
          >
            <Row gutter={[8, 8]}>
              {sizeOptions.map(size => (
                <Col span={isMobile ? 12 : 6} key={size}>
                  <Checkbox value={size}>{size}</Checkbox>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        </Card>

        {/* 照片上传区域 */}
        {selectedSizes.length > 0 && (
          <Card title="上传照片" style={{ marginBottom: 16 }}>
            {selectedSizes.map(size => (
              <div key={size} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  marginBottom: 16
                }}>
                  <Title level={4}>{size}</Title>
                  <Text type="secondary">
                    已上传 {sizePhotos[size]?.length || 0} 个文件，共 {sizePhotos[size]?.reduce((sum, photo) => sum + (photo.quantity || 1), 0) || 0} 张
                  </Text>
                </div>

                <MemoizedPhotoUploader
                  size={size}
                  photos={sizePhotos[size] || []}
                  onPhotosChange={handlePhotosChange}
                  uploadingCount={uploadingPhotosBySize[size] || 0}
                  onUploadingCountChange={uploadCountHandlers[size]}
                  isMobile={isMobile}
                  orderSn={orderInfo.order_sn}
                />
              </div>
            ))}
          </Card>
        )}

        {/* 底部统计和提交 */}
        <Card style={{ marginBottom: 16 }}>


          {/* 自动保存状态显示 */}
          {(autoSaveStatus !== 'idle' || lastAutoSaveTimeRef.current > 0) && (
            <div style={{ 
              marginBottom: 16, 
              padding: '8px 12px', 
              background: autoSaveStatus === 'saving' ? '#f6ffed' : 
                         autoSaveStatus === 'success' ? '#f6ffed' : 
                         autoSaveStatus === 'error' ? '#fff2f0' : '#fafafa',
              border: `1px solid ${autoSaveStatus === 'saving' ? '#b7eb8f' : 
                                   autoSaveStatus === 'success' ? '#b7eb8f' : 
                                   autoSaveStatus === 'error' ? '#ffccc7' : '#d9d9d9'}`,
              borderRadius: 6,
              fontSize: 12,
              color: autoSaveStatus === 'error' ? '#cf1322' : '#52c41a',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              {autoSaveStatus === 'saving' && (
                <>
                  <span>🔄</span>
                  <span>正在自动保存...</span>
                </>
              )}
              {autoSaveStatus === 'success' && (
                <>
                  <span>✅</span>
                  <span>订单已自动保存</span>
                </>
              )}
              {autoSaveStatus === 'error' && (
                <>
                  <span>⚠️</span>
                  <span>自动保存失败，请手动保存</span>
                </>
              )}
             
            </div>
          )}

          {/* 重复图片检测区域 */}
          {totalPhotos >= 2 && (
            <div style={{
              background: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>🔍</span>
                  <Text strong>重复图片检测</Text>
                  <Text type="secondary">({totalPhotos}张图片)</Text>
                </div>
                
                {!isDetectingDuplicates && !duplicateDetectionResult && (
                  <Button 
                    type="primary" 
                    size="small"
                    icon={<ScanOutlined />}
                    onClick={handleDetectDuplicates}
                    disabled={totalPhotos < 2 || totalUploading > 0}
                  >
                    检测重复图片
                  </Button>
                )}
                
                {isDetectingDuplicates && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Spin size="small" />
                    <Text type="secondary">正在检测...</Text>
                  </div>
                )}
              </div>
              
              {/* 检测结果显示 */}
              {duplicateDetectionResult && (
                <div style={{ marginTop: '12px' }}>
                  {!duplicateDetectionResult.hasDuplicates ? (
                    <div style={{ color: '#52c41a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircleOutlined />
                      <Text type="success">未发现重复图片</Text>
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => setDuplicateDetectionResult(null)}
                      >
                        重新检测
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ color: '#faad14', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <ExclamationCircleOutlined />
                        <Text style={{ color: '#faad14' }}>
                          {duplicateDetectionResult.summary}
                        </Text>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <Button 
                          type="link" 
                          size="small"
                          onClick={() => setDuplicateModalVisible(true)}
                        >
                          查看详情 →
                        </Button>
                        <Button 
                          type="link" 
                          size="small"
                          onClick={() => setDuplicateDetectionResult(null)}
                        >
                          重新检测
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'center' : 'center',
            gap: isMobile ? '16px' : 0
          }}>
            <Statistic
              title="总上传照片数"
              value={totalPhotos}
              suffix="张"
            />

            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: isMobile ? 'center' : 'flex-end',
              gap: '8px'
            }}>
              {/* 必填项提示 */}
              {totalPhotos > 0 && (!orderInfo.order_sn || !orderInfo.receiver) && (
                <div style={{
                  color: '#ff4d4f',
                  fontSize: isMobile ? '12px' : '13px',
                  textAlign: isMobile ? 'center' : 'right',
                  background: '#fff2f0',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #ffccc7'
                }}>
                  {!orderInfo.order_sn && !orderInfo.receiver 
                    ? '请填写订单号和收货人信息'
                    : !orderInfo.order_sn 
                      ? '请填写订单号'
                      : '请填写收货人信息'
                  }
                </div>
              )}

              <Tooltip title={uiState.submitTooltip}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSubmit}
                  size={isMobile ? "middle" : "large"}
                  loading={!uiState.canSubmit && (totalUploading > 0 || loading)}
                  disabled={!uiState.canSubmit}
                  block={isMobile}
                  // 添加移动端兼容性
                  style={isMobile ? STATIC_STYLES.mobileSubmitButton : STATIC_STYLES.submitButton}
                  // 防止双击
                  onDoubleClick={(e) => e.preventDefault()}
                >
                  {uiState.submitButtonText}
                </Button>
              </Tooltip>
            </div>
          </div>
        </Card>

        {/* 提交确认对话框 */}
        <Modal
          title="确认提交订单"
          open={isModalOpen}
          onOk={handleConfirmSubmit}
          onCancel={() => setIsModalOpen(false)}
          okText="确认提交"
          cancelText="取消"
          confirmLoading={loading}
          width={isMobile ? '95%' : 520}
        >
          <p>您确定要提交此订单吗？</p>
          <Statistic title="照片总数" value={totalPhotos} suffix="张" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">点击确认后，订单将被提交处理</Text>
          </div>
        </Modal>

        {/* 未调整大小警告对话框 */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', color: '#ff4d4f' }}>
              <ScissorOutlined style={{ marginRight: 8 }} />
              照片尺寸调整提醒
            </div>
          }
          open={isResizeWarningOpen}
          onOk={() => {
            setIsResizeWarningOpen(false);
            actualSubmit(); // 用户选择继续提交
          }}
          onCancel={() => setIsResizeWarningOpen(false)}
          okText="继续提交"
          cancelText="返回编辑"
          width={isMobile ? '95%' : 600}
          okButtonProps={{ danger: true }}
        >
          <div style={{ marginBottom: 16 }}>
            <div style={{ 
              background: '#fff2f0', 
              border: '1px solid #ffccc7', 
              borderRadius: '6px', 
              padding: '12px',
              marginBottom: '16px'
            }}>
              <Text strong style={{ color: '#ff4d4f' }}>
                ⚠️ 检测到以下尺寸有照片未进行裁剪调整：
              </Text>
            </div>
            
            {unadjustedPhotosInfo.map((info, index) => (
              <div key={index} style={{ 
                marginBottom: '12px', 
                padding: '8px 12px',
                background: '#fafafa',
                borderRadius: '4px',
                border: '1px solid #f0f0f0'
              }}>
                <Text strong>{info.size}</Text>
                <Text style={{ marginLeft: '8px', color: '#ff4d4f' }}>
                  {info.count} 张照片未调整 (共 {info.total} 张)
                </Text>
              </div>
            ))}
            
            <div style={{ 
              background: '#fff7e6', 
              border: '1px solid #ffd591', 
              borderRadius: '6px', 
              padding: '12px',
              marginTop: '16px'
            }}>
              <Text style={{ color: '#d48806', lineHeight: '1.6' }}>
                📌 <strong>重要提醒：</strong><br/>
                • 满版照片和拍立得尺寸建议进行裁剪调整<br/>
                • 如不调整，系统将默认按照照片居中进行裁切<br/>
                • 可能会影响最终出片效果<br/>
                • 建议点击"返回编辑"进行裁剪调整
              </Text>
            </div>
          </div>
        </Modal>

        {/* 尺寸取消确认对话框 */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', color: '#ff4d4f' }}>
              <DeleteOutlined style={{ marginRight: 8 }} />
              确认删除照片
            </div>
          }
          open={isSizeCancelConfirmOpen}
          onOk={handleConfirmSizeCancel}
          onCancel={handleCancelSizeChange}
          okText="确认删除"
          cancelText="取消操作"
          width={isMobile ? '95%' : 520}
          okButtonProps={{ danger: true }}
        >
          <div style={{ marginBottom: 16 }}>
            <div style={{ 
              background: '#fff2f0', 
              border: '1px solid #ffccc7', 
              borderRadius: '6px', 
              padding: '12px',
              marginBottom: '16px'
            }}>
              <Text strong style={{ color: '#ff4d4f' }}>
                ⚠️ 您即将取消以下尺寸的选择，这将删除已上传的照片：
              </Text>
            </div>
            
            {sizesToCancel.map((size, index) => {
              const photos = sizePhotos[size] || [];
              const totalPhotos = photos.reduce((sum, photo) => sum + (photo.quantity || 1), 0);
              return (
                <div key={index} style={{ 
                  marginBottom: '12px', 
                  padding: '8px 12px',
                  background: '#fafafa',
                  borderRadius: '4px',
                  border: '1px solid #f0f0f0'
                }}>
                  <Text strong>{size}</Text>
                  <Text style={{ marginLeft: '8px', color: '#ff4d4f' }}>
                    将删除 {totalPhotos} 张照片 (共 {photos.length} 个文件)
                  </Text>
                </div>
              );
            })}
            
            {/* <div style={{ 
              background: '#fff7e6', 
              border: '1px solid #ffd591', 
              borderRadius: '6px', 
              padding: '12px',
              marginTop: '16px'
            }}>
              <Text style={{ color: '#d48806', lineHeight: '1.6' }}>
                📌 <strong>重要提醒：</strong><br/>
                • 删除后的照片无法恢复<br/>
                • 如果您只是想重新选择照片，建议先删除单个照片再重新上传<br/>
                • 确认删除后，相关的所有照片和设置都将被清除
              </Text>
            </div> */}
          </div>
        </Modal>

        {/* 重复图片检测结果弹窗 */}
        <DuplicatePhotosModal
          visible={duplicateModalVisible}
          onClose={() => setDuplicateModalVisible(false)}
          detectionResults={duplicateDetectionResult}
          onDeletePhotos={handleDeleteDuplicatePhotos}
          isMobile={isMobile}
        />

      </div>
    </Spin>
  );
}

// 使用React.memo包装整个组件，进一步优化性能
export default memo(OrderUploadPage);
