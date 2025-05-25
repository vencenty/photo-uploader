import React, { useState, useRef } from 'react';
import { Upload, Button, message, Typography, Card, Row, Col, Tag, Image } from 'antd';
import { 
  PictureOutlined, DeleteOutlined, CompressOutlined, 
  ScissorOutlined 
} from '@ant-design/icons';
import { uploadPhoto } from '../services/api';
import imageCompressor from '../utils/imageCompressor';
import ImageCropper from './ImageCropper';
import { getAspectRatioByName } from '../config/photo';

const { processImageBeforeUpload, isCompressionNeeded } = imageCompressor;
import { uploadConfig } from '../config/app.config';

const { Text } = Typography;

// 最大并发上传数量
const MAX_CONCURRENT_UPLOADS = 3;

/**
 * 照片上传组件
 */
const PhotoUploader = ({ 
  size, 
  photos = [], 
  onPhotosChange,
  uploadingCount,
  onUploadingCountChange,
  isMobile = false
}) => {
  // 裁剪相关状态
  const [cropperVisible, setCropperVisible] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  
  // 添加上传队列管理
  const uploadQueueRef = useRef([]);
  const activeUploadsRef = useRef(0);
  
  // 处理队列中的下一个上传任务
  const processNextUpload = () => {
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
  };
  
  // 处理单个文件上传
  const processFileUpload = async (file, onProgress, onSuccess, onError) => {
    console.log('处理文件上传:', file.name);
    
    // 显示初始进度
    onProgress?.({ percent: 10 });
    
    try {
      // 检查是否需要压缩
      const needCompression = isCompressionNeeded(file);
      
      // 处理并压缩图片
      const processedFile = await processImageBeforeUpload(file);
      
      // 更新进度
      onProgress?.({ percent: 30 });
      
      // 调用API上传照片
      const response = await uploadPhoto(processedFile);
      
      // 显示完成进度
      onProgress?.({ percent: 100 });
      
      // 检查API响应是否成功
      if (response.code === 0 && response.data) {
        // 根据接口文档获取图片URL
        const photoUrl = response.data.url || response.data;
        
        // 创建照片对象
        const newPhoto = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          // 显示用的URL（使用代理URL）
          url: uploadConfig.imageProxyUrl + photoUrl,
          status: 'done',
          // 提交时使用的URL（原始URL）
          serverUrl: photoUrl,
          // 添加压缩标记
          compressed: needCompression,
          // 记录原始大小和压缩后大小
          originalSize: file.size,
          compressedSize: processedFile.size
        };
        
        // 更新照片列表
        onPhotosChange(prev => ({
          ...prev,
          [size]: [...(prev[size] || []), newPhoto]
        }));
        
        const sizeReduction = needCompression 
          ? `，压缩率: ${((1 - processedFile.size / file.size) * 100).toFixed(0)}%` 
          : '';
          
        message.success(`${file.name} 上传成功${sizeReduction}`);
        
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
    // 确保文件是图片类型
    const isImage = file.type.startsWith('image/');
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
  const handleDeletePhoto = (photoId) => {
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
      
      // 更新照片列表
      onPhotosChange(prev => ({
        ...prev,
        [size]: prev[size].filter(photo => photo.id !== photoId)
      }));
      
      message.success(`${photoName} 已删除`);
    } catch (error) {
      console.error('删除照片失败:', error);
      message.error('删除照片失败，请重试');
    }
  };
  
  // 打开裁剪对话框
  const handleCropPhoto = (photo) => {
    // 检查是否正在上传
    if (uploadingCount > 0) {
      message.warning('有照片正在上传，请等待上传完成后再裁剪');
      return;
    }
    
    setCurrentPhoto(photo);
    setCropperVisible(true);
  };
  
  // 处理裁剪完成
  const handleCropComplete = async (croppedFile) => {
    if (!currentPhoto) return;
    
    try {
      // 显示上传中消息
      message.loading('正在上传裁剪后的照片...', 0);
      
      // 上传裁剪后的照片
      const response = await uploadPhoto(croppedFile);
      
      if (response.code === 0 && response.data) {
        // 获取新的URL
        const photoUrl = response.data.url || response.data;
        
        // 更新照片列表，替换原照片
        onPhotosChange(prev => {
          const updatedPhotos = [...prev[size]];
          const photoIndex = updatedPhotos.findIndex(p => p.id === currentPhoto.id);
          
          if (photoIndex !== -1) {
            updatedPhotos[photoIndex] = {
              ...updatedPhotos[photoIndex],
              url: uploadConfig.imageProxyUrl + photoUrl,
              serverUrl: photoUrl,
              name: croppedFile.name,
              cropped: true,
            };
          }
          
          return {
            ...prev,
            [size]: updatedPhotos
          };
        });
        
        message.success('照片裁剪并上传成功');
      } else {
        message.error(response.msg || '裁剪照片上传失败');
      }
    } catch (error) {
      console.error('裁剪照片上传失败:', error);
      message.error('裁剪照片上传失败，请重试');
    } finally {
      message.destroy(); // 关闭loading消息
    }
  };
  
  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  // 获取当前尺寸的宽高比
  const aspectRatio = getAspectRatioByName(size);
  
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <Upload
          listType="picture-card"
          accept="image/*"
          multiple={true}
          customRequest={customRequest}
          beforeUpload={beforeUpload}
          showUploadList={false}
          disabled={uploadingCount > 0}
          style={{ width: 'auto' }}
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
      
      {/* 照片预览区域 - 使用Ant Design的Image组件 */}
      {photos.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Image.PreviewGroup>
            <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
              {photos.map(photo => (
                <Col key={photo.id} xs={12} sm={8} md={6} lg={4}>
                  <div style={{ 
                    position: 'relative', 
                    marginBottom: 8, 
                    width: '100%',
                    height: isMobile ? '150px' : '180px',
                    overflow: 'hidden',
                    backgroundColor: '#f5f5f5',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Image
                      src={photo.url}
                      alt={photo.name}
                      style={{ 
                        objectFit: 'contain',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        display: 'block'
                      }}
                      preview={{
                        mask: <div style={{ fontSize: isMobile ? 12 : 14 }}>预览</div>,
                        maskClassName: 'custom-mask'
                      }}
                      rootClassName="photo-preview-wrapper"
                    />
                    
                    {/* 标签区域 */}
                    <div style={{ position: 'absolute', top: 5, right: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {photo.compressed && (
                        <Tag color="blue" style={{ 
                          fontSize: isMobile ? 10 : 12,
                          padding: isMobile ? '0 4px' : '0 6px',
                          margin: 0
                        }}>
                          <CompressOutlined /> 已压缩
                        </Tag>
                      )}
                      {photo.cropped && (
                        <Tag color="green" style={{ 
                          fontSize: isMobile ? 10 : 12,
                          padding: isMobile ? '0 4px' : '0 6px',
                          margin: 0
                        }}>
                          <ScissorOutlined /> 已裁剪
                        </Tag>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text ellipsis style={{ fontSize: isMobile ? 10 : 12, flex: 1 }}>
                      {photo.name}
                    </Text>
                    {photo.compressed && photo.originalSize && photo.compressedSize && (
                      <Text style={{ fontSize: isMobile ? 9 : 10, color: '#999', marginLeft: 4 }}>
                        {formatFileSize(photo.compressedSize)}
                      </Text>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {/* 所有规格的照片都显示裁剪按钮 */}
                    <Button 
                      type="text"
                      icon={<ScissorOutlined />}
                      onClick={() => handleCropPhoto(photo)}
                      size={isMobile ? "small" : "middle"}
                      style={{ padding: '0 8px' }}
                    >
                      裁剪
                    </Button>
                    
                    <Button 
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeletePhoto(photo.id)}
                      size={isMobile ? "small" : "middle"}
                      style={{ padding: '0 8px' }}
                    >
                      删除
                    </Button>
                  </div>
                </Col>
              ))}
            </Row>
          </Image.PreviewGroup>
        </div>
      )}
      
      {/* 裁剪组件 */}
      {currentPhoto && (
        <ImageCropper
          image={currentPhoto.serverUrl}
          visible={cropperVisible}
          onClose={() => setCropperVisible(false)}
          onCropComplete={handleCropComplete}
          aspectRatio={aspectRatio}
          isMobile={isMobile}
        />
      )}
    </div>
  );
};

export default PhotoUploader;