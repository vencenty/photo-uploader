import React, { useState, useRef, useCallback, memo } from 'react';
import { Upload, Button, message, Typography, Card, Row, Col, Tag, Image } from 'antd';
import { 
  PictureOutlined, DeleteOutlined, CompressOutlined, 
  ScissorOutlined 
} from '@ant-design/icons';
import { uploadPhoto } from '../services/api';
import imageCompressor from '../utils/imageCompressor';
import ImageCropper from './ImageCropper';
import VirtualPhotoGrid from './VirtualPhotoGrid';
import WhiteBorderPreview from './WhiteBorderPreview';
import FullVersionPreview from './FullVersionPreview';
import { getAspectRatioByName } from '../config/photo';

const { processImageBeforeUpload, isCompressionNeeded } = imageCompressor;
import { uploadConfig } from '../config/app.config';

const { Text } = Typography;

// 最大并发上传数量（根据设备类型动态调整）
const MAX_CONCURRENT_UPLOADS = uploadConfig.maxSimultaneousUploads;

/**
 * 照片上传组件
 */
const PhotoUploader = memo(({ 
  size, 
  photos = [], 
  onPhotosChange,
  uploadingCount,
  onUploadingCountChange,
  isMobile = false,
  orderSn = ''
}) => {
  // 裁剪相关状态
  const [cropperVisible, setCropperVisible] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  
  // 留白预览相关状态
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  
  // 满版预览相关状态
  const [fullVersionPreviewVisible, setFullVersionPreviewVisible] = useState(false);
  const [fullVersionPreviewPhoto, setFullVersionPreviewPhoto] = useState(null);
  
  // 添加上传队列管理
  const uploadQueueRef = useRef([]);
  const activeUploadsRef = useRef(0);
  
  // 处理队列中的下一个上传任务
  const processNextUpload = useCallback(() => {
    if (uploadQueueRef.current.length === 0 || activeUploadsRef.current >= MAX_CONCURRENT_UPLOADS) {
      return;
    }
    
    // 从队列中获取一个上传任务
    const nextUpload = uploadQueueRef.current.shift();
    
    // 增加活跃上传数量
    activeUploadsRef.current += 1;
    
    // 执行上传任务
    const { file, onSuccess, onError, onProgress } = nextUpload;
    
    console.log('开始上传队列中的文件:', file.name, '当前活跃上传数:', activeUploadsRef.current);
    
    // 开始处理上传
    processFileUpload(file, onProgress, (response) => {
      // 完成后减少活跃上传数量
      activeUploadsRef.current -= 1;
      
      // 调用原始回调
      if (onSuccess) onSuccess(response);
      
      // 处理队列中的下一个上传
      processNextUpload();
    }, (error) => {
      // 错误时减少活跃上传数量
      activeUploadsRef.current -= 1;
      
      // 调用原始错误回调
      if (onError) onError(error);
      
      // 继续处理队列中的下一个上传
      processNextUpload();
    });
  }, []);
  
  // 处理单个文件上传
  const processFileUpload = async (file, onProgress, onSuccess, onError) => {
    console.log('处理文件上传:', file.name);
    
    // 显示初始进度
    onProgress?.({ percent: 10 });
    
    try {
      // 检查是否需要压缩
      const needCompression = isCompressionNeeded(file);
      
      // 处理并压缩图片（含 HEIC/HEIF 转换）
      const processedFile = await processImageBeforeUpload(file);
      
      // 更新进度
      onProgress?.({ percent: 30 });
      
      // 调用API上传照片，传递订单号和尺寸参数
      const response = await uploadPhoto(processedFile, orderSn, size);
      
      // 显示完成进度
      onProgress?.({ percent: 100 });
      
      // 检查API响应是否成功
      if (response.code === 0 && response.data) {
        // 根据接口文档获取图片URL和其他信息
        const photoUrl = response.data.url || response.data;
        
        console.log("上传响应数据:", response.data);
        // 创建照片对象
        const newPhoto = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          // 直接使用服务端返回的URL
          url: photoUrl,
          status: 'done',
          // 服务端URL（用于提交）
          serverUrl: photoUrl,
          // 🚀 保存服务端返回的SHA1哈希值（用于重复检测）
          sha1: response.data.sha1,
          // 保存服务端返回的其他信息
          filename: response.data.filename,
          serverSize: response.data.size,
          // 添加压缩标记
          compressed: needCompression,
          // 记录原始大小和压缩后大小
          originalSize: file.size,
          compressedSize: processedFile.size,
          // 默认数量为1
          quantity: 1,
          // 上传时间戳
          uploadTime: Date.now()
        };
        
        // 🚀 优化：精确更新照片列表，避免触发其他照片重新渲染
        onPhotosChange(prev => {
          const currentSizePhotos = prev[size] || [];
          
          // 只有当实际需要添加新照片时才更新状态
          if (currentSizePhotos.some(p => p.id === newPhoto.id)) {
            return prev; // 照片已存在，不更新
          }
          
          return {
            ...prev,
            [size]: [...currentSizePhotos, newPhoto]
          };
        });
        
        const sizeReduction = needCompression 
          ? `，压缩率: ${((1 - processedFile.size / file.size) * 100).toFixed(0)}%` 
          : '';
          
        // message.success(`${file.name} 上传成功${sizeReduction}`);
        
        // 调用成功回调
        onSuccess(response);
      } else {
        message.error(response.msg || `${file.name} 上传失败`);
        
        // 调用错误回调
        onError(new Error(response.msg || '上传失败'));
      }
    } catch (error) {
      console.error('上传照片失败:', error);
      message.error(`${file.name} 上传失败: ${error.message}`);
      
      // 调用错误回调
      onError(error);
    }
  };
  
  // 在上传前验证照片
  const beforeUpload = (file) => {
    // 确保文件是图片类型（包含 HEIC/HEIF 情况：有些浏览器 file.type 可能为空，允许扩展名判断）
    const lowerName = (file.name || '').toLowerCase();
    const isHeic = lowerName.endsWith('.heic') || lowerName.endsWith('.heif');
    const isImage = isHeic || (file.type && file.type.startsWith('image/'));
    if (!isImage) {
      message.error(`${file.name} 不是有效的图片文件`);
      return Upload.LIST_IGNORE;
    }
    
    return true;
  };
  
  // 处理照片上传
  const customRequest = async (options) => {
    const { file, onSuccess, onError, onProgress } = options;
    
    console.log('文件添加到上传队列:', file.name);
    
    // 更新上传计数
    const currentCount = uploadingCount || 0;
    onUploadingCountChange(currentCount + 1);
    
    // 将上传任务添加到队列
    uploadQueueRef.current.push({
      file,
      onSuccess: (response) => {
        // 重置上传状态
        onUploadingCountChange(prev => Math.max(0, prev - 1));
        
        if (onSuccess) onSuccess(response);
      },
      onError: (error) => {
        // 重置上传状态
        onUploadingCountChange(prev => Math.max(0, prev - 1));
        
        if (onError) onError(error);
      },
      onProgress
    });
    
    // 尝试处理队列
    if (activeUploadsRef.current < MAX_CONCURRENT_UPLOADS) {
      processNextUpload();
    }
  };
  
  // 处理删除照片
  const handleDeletePhoto = useCallback((photoId) => {
    // 检查是否正在上传
    if (uploadingCount > 0) {
      message.warning('有照片正在上传，请等待上传完成后再删除');
      return;
    }
    
    // 删除照片
    try {
      // 获取要删除的照片，用于显示名称
      const photoToDelete = photos.find(photo => photo.id === photoId);
      const photoName = photoToDelete?.name || '照片';
      
      // 🚀 优化：精确删除照片，避免触发其他照片重新渲染
      onPhotosChange(prev => {
        const currentSizePhotos = prev[size] || [];
        const photoIndex = currentSizePhotos.findIndex(p => p.id === photoId);
        
        // 如果照片不存在，不更新状态
        if (photoIndex === -1) return prev;
        
        // 使用精确的数组操作，保持其他照片的引用不变
        const newSizePhotos = [
          ...currentSizePhotos.slice(0, photoIndex),
          ...currentSizePhotos.slice(photoIndex + 1)
        ];
        
        return {
          ...prev,
          [size]: newSizePhotos
        };
      });
      
      // message.success(`${photoName} 已删除`);
    } catch (error) {
      console.error('删除照片失败:', error);
      message.error('删除照片失败，请重试');
    }
  }, [uploadingCount, photos, onPhotosChange, size]);
  
  // 打开裁剪对话框
  const handleCropPhoto = useCallback((photo) => {
    // 检查是否正在上传
    if (uploadingCount > 0) {
      message.warning('有照片正在上传，请等待上传完成后再裁剪');
      return;
    }
    
    setCurrentPhoto(photo);
    setCropperVisible(true);
  }, [uploadingCount]);
  
  // 🚀 防重复调用的裁剪完成处理
  const handleCropComplete = useCallback(async (croppedFile) => {
    if (!currentPhoto) {
      console.warn('⚠️ handleCropComplete: currentPhoto 为空，跳过处理');
      return;
    }
    
    // 🛡️ 防重复调用保护
    const cropKey = `${currentPhoto.id}_${Date.now()}`;
    console.log(`🔧 handleCropComplete 开始 - ${cropKey}`);
    
    try {
      // 显示上传中消息
      message.loading('正在上传裁剪后的照片...', 0);
      
      // 上传裁剪后的照片，传递订单号和尺寸参数
      const response = await uploadPhoto(croppedFile, orderSn, size);
      
      if (response.code === 0 && response.data) {
        // 获取新的URL和SHA1
        const photoUrl = response.data.url || response.data;
        
        // 🚀 优化：使用更精确的状态更新，避免触发其他照片的重新渲染
        console.log(`🔧 ${cropKey} - 开始状态更新:`, {
          photoId: currentPhoto.id,
          newUrl: photoUrl,
          newSha1: response.data.sha1,
          size: size
        });
        
        // 🛡️ 防重复状态更新 - 使用单次执行保护
        let hasUpdated = false;
        
        onPhotosChange(prev => {
          if (hasUpdated) {
            console.warn(`⚠️ ${cropKey} - 重复状态更新被阻止!`);
            return prev;
          }
          
          // 检查是否真的需要更新
          const currentSizePhotos = prev[size] || [];
          const photoIndex = currentSizePhotos.findIndex(p => p.id === currentPhoto.id);
          
          if (photoIndex === -1) {
            console.warn(`⚠️ ${cropKey} - 找不到照片，跳过更新`);
            return prev;
          }
          
          const currentPhotoData = currentSizePhotos[photoIndex];
          
          // 检查是否实际发生了变化
          if (currentPhotoData.url === photoUrl && currentPhotoData.cropped === true) {
            console.log(`ℹ️ ${cropKey} - 没有实际变化，跳过更新`);
            return prev;
          }
          
          // 🚀 精确更新：只更新目标照片，其他照片保持原引用
          const newSizePhotos = [...currentSizePhotos]; // 浅拷贝数组
          const updatedPhoto = {
            ...currentSizePhotos[photoIndex],
            url: photoUrl,
            serverUrl: photoUrl,
            name: croppedFile.name,
            cropped: true,
            quantity: currentSizePhotos[photoIndex].quantity || 1,
            // 🚀 更新SHA1哈希值（裁剪后的新文件）
            sha1: response.data.sha1,
            filename: response.data.filename,
            serverSize: response.data.size,
            lastModified: Date.now()
          };
          
          // 只替换被修改的照片
          newSizePhotos[photoIndex] = updatedPhoto;
          
          hasUpdated = true; // 标记已更新
          console.log(`🎯 ${cropKey} - 状态更新完成:`, {
            updatedPhotoId: updatedPhoto.id,
            arrayLength: newSizePhotos.length,
            size: size
          });
          
          return {
            ...prev,
            [size]: newSizePhotos
          };
        });
        
        message.success('照片裁剪并上传成功');
        
        // 🚀 优化：满版类型裁剪完成后，直接使用更新后的照片对象预览
        if (isFullVersionSize) {
          setTimeout(() => {
            // 直接使用刚才创建的updatedPhoto对象，避免额外的状态访问
            const previewPhoto = {
              ...currentPhoto,
              url: photoUrl,
              serverUrl: photoUrl,
              name: croppedFile.name,
              cropped: true,
              quantity: currentPhoto.quantity || 1,
              sha1: response.data.sha1,
              filename: response.data.filename,
              serverSize: response.data.size,
              lastModified: Date.now()
            };
            
            setFullVersionPreviewPhoto(previewPhoto);
            setFullVersionPreviewVisible(true);
          }, 500); // 延迟500ms让用户看到成功消息
        }
      } else {
        console.error(`❌ ${cropKey} - 上传失败:`, response.msg);
        message.error(response.msg || '裁剪照片上传失败');
      }
    } catch (error) {
      console.error(`❌ ${cropKey} - 异常:`, error);
      message.error('裁剪照片上传失败，请重试');
    } finally {
      console.log(`🏁 ${cropKey} - 处理完成`);
      message.destroy(); // 关闭loading消息
    }
  }, [currentPhoto, size, onPhotosChange]);
  
  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  // 获取当前尺寸的宽高比
  const aspectRatio = getAspectRatioByName(size);
  
  // 判断是否为留白款式
  const isWhiteBorderSize = size.includes('留白');
  
  // 判断是否为满版款式
  const isFullVersionSize = !isWhiteBorderSize; // 非留白的都是满版
  
  // 移除组件内的自动保存 UI，改由页面级控制

  // 处理预览照片
  const handlePreviewPhoto = useCallback((photo) => {
    // 检查是否正在上传
    if (uploadingCount > 0) {
      message.warning('有照片正在上传，请等待上传完成后再预览');
      return;
    }
    
    if (isWhiteBorderSize) {
      // 留白类型直接预览
      setPreviewPhoto(photo);
      setPreviewVisible(true);
    } else if (isFullVersionSize) {
      // 满版类型，先检查是否已裁剪
      if (photo.cropped) {
        // 已裁剪，直接预览
        setFullVersionPreviewPhoto(photo);
        setFullVersionPreviewVisible(true);
      } else {
        // 未裁剪，提示用户先裁剪
        message.info('满版照片需要先裁剪调整后才能预览效果');
        // 自动打开裁剪界面
        handleCropPhoto(photo);
      }
    }
  }, [uploadingCount, isWhiteBorderSize, isFullVersionSize, handleCropPhoto]);

  // 处理照片数量变化
  const handleQuantityChange = useCallback((photoId, newQuantity) => {
    // 检查是否正在上传
    if (uploadingCount > 0) {
      message.warning('有照片正在上传，请等待上传完成后再修改数量');
      return;
    }
    
    // 🚀 优化：精确更新数量，避免触发其他照片重新渲染
    onPhotosChange(prev => {
      const currentSizePhotos = prev[size] || [];
      const photoIndex = currentSizePhotos.findIndex(p => p.id === photoId);
      
      // 如果照片不存在或数量没有变化，不更新状态
      if (photoIndex === -1 || currentSizePhotos[photoIndex].quantity === newQuantity) {
        return prev;
      }
      
      // 只更新目标照片，其他照片保持原引用
      const newSizePhotos = currentSizePhotos.map((photo, index) => {
        if (index === photoIndex) {
          return {
            ...photo,
            quantity: newQuantity,
            lastModified: Date.now() // 添加修改时间戳
          };
        }
        return photo; // 保持原引用
      });
      
      return {
        ...prev,
        [size]: newSizePhotos
      };
    });
  }, [uploadingCount, onPhotosChange, size]);
  

  
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <Upload
          listType="picture-card"
          accept="image/*,image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif,.heic,.heif"
          multiple={true}
          directory={false}
          customRequest={customRequest}
          beforeUpload={beforeUpload}
          showUploadList={false}
          disabled={uploadingCount > 0}
          style={{ width: 'auto' }}
          // 添加移动端兼容性属性
          capture={false}
          supportServerRender={false}
        >
          <div style={{ textAlign: 'center', width: '104px', height: '104px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <PictureOutlined style={{ fontSize: isMobile ? 20 : 24 }} />
            <div style={{ marginTop: 8, fontSize: isMobile ? 12 : 14 }}>
              {uploadingCount > 0 ? "正在上传..." : "上传照片"}
            </div>
          </div>
        </Upload>
        
        {uploadingCount > 0 && (
          <Text type="secondary">
            {size}正在上传，请稍候...
          </Text>
        )}
      </div>
      
      {/* 照片预览区域 - 使用高性能虚拟滚动 */}
      {photos.length > 0 && (
        <div>
          <VirtualPhotoGrid
            photos={photos}
            onCropPhoto={handleCropPhoto}
            onDeletePhoto={handleDeletePhoto}
            onPreviewPhoto={handlePreviewPhoto}
            onQuantityChange={handleQuantityChange}
            showPreview={isWhiteBorderSize || isFullVersionSize}
            previewType={isWhiteBorderSize ? 'whiteBorder' : 'fullVersion'}
            isMobile={isMobile}
            size={size}
          />
        </div>
      )}
      
      {/* 裁剪组件 */}
      {currentPhoto && (
        <ImageCropper
          image={currentPhoto.serverUrl} // 直接使用原图进行裁剪
          originalImage={currentPhoto.serverUrl} // 原图也是同一个URL
          visible={cropperVisible}
          onClose={() => setCropperVisible(false)}
          onCropComplete={handleCropComplete}
          aspectRatio={aspectRatio}
          isMobile={isMobile}
        />
      )}
      
      {/* 留白预览组件 */}
      {previewPhoto && (
        <WhiteBorderPreview
          visible={previewVisible}
          onClose={() => setPreviewVisible(false)}
          imageUrl={previewPhoto.serverUrl || previewPhoto.url}
          size={size}
          isMobile={isMobile}
        />
      )}
      
      {/* 满版预览组件 */}
      {fullVersionPreviewPhoto && (
        <FullVersionPreview
          visible={fullVersionPreviewVisible}
          onClose={() => setFullVersionPreviewVisible(false)}
          imageUrl={fullVersionPreviewPhoto.serverUrl || fullVersionPreviewPhoto.url}
          size={size}
          isMobile={isMobile}
        />
      )}
    </div>
  );
});

// 设置组件显示名称，便于调试
PhotoUploader.displayName = 'PhotoUploader';

export default PhotoUploader;