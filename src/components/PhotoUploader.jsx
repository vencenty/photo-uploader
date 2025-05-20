import React, { useState } from 'react';
import { Upload, Button, message, Typography, Card, Row, Col, Tag, Progress, Image } from 'antd';
import { 
  PictureOutlined, DeleteOutlined, CompressOutlined, 
  LoadingOutlined, ClockCircleOutlined, 
  ScissorOutlined 
} from '@ant-design/icons';
import { uploadPhoto } from '../services/api';
import imageCompressor from '../utils/imageCompressor';
import ImageCropper from './ImageCropper';
import { getAspectRatioByName } from '../config/photo';

const { processImageBeforeUpload, isCompressionNeeded } = imageCompressor;
import { uploadConfig } from '../config/app.config';

const { Text } = Typography;

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
  // 内部上传状态
  const [uploadingFiles, setUploadingFiles] = useState([]);
  // 上传进度状态
  const [progressStatus, setProgressStatus] = useState({});
  // 等待上传的文件队列
  const [waitingFiles, setWaitingFiles] = useState([]);
  // 裁剪相关状态
  const [cropperVisible, setCropperVisible] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  
  // 处理照片上传
  const customRequest = async (options) => {
    const { file, onSuccess, onError, onProgress } = options;
    
    // 检查是否有照片正在上传
    if (uploadingCount > 0) {
      // 添加到等待队列
      setWaitingFiles(prev => [...prev, file]);
      message.info(`${file.name} 已加入上传队列，将在当前上传完成后自动开始`);
      return;
    }
    
    // 执行上传
    await uploadFile(file, onSuccess, onError, onProgress);
  };
  
  // 上传单个文件
  const uploadFile = async (file, onSuccess, onError, onProgress) => {
    // 增加上传中计数
    onUploadingCountChange(prev => prev + 1);
    setUploadingFiles(prev => [...prev, file]);
    
    // 初始化进度状态
    setProgressStatus(prev => ({
      ...prev,
      [file.uid]: { percent: 0, status: 'active', fileName: file.name }
    }));
    
    // 设置上传超时
    const uploadTimeout = setTimeout(() => {
      message.error(`${file.name} 上传超时，请检查网络连接后重试`);
      onError?.(new Error('上传超时'));
      onUploadingCountChange(prev => Math.max(0, prev - 1));
      setUploadingFiles(prev => prev.filter(f => f.uid !== file.uid));
      setProgressStatus(prev => {
        const updated = { ...prev };
        delete updated[file.uid];
        return updated;
      });
      
      // 继续上传队列中的下一个文件
      processNextFileInQueue();
    }, uploadConfig.timeout);
    
    try {
      // 显示初始进度
      updateProgress(file.uid, 10);
      onProgress?.({ percent: 10 });
      
      // 检查是否需要压缩
      const needCompression = isCompressionNeeded(file);
      
      // 处理并压缩图片
      const processedFile = await processImageBeforeUpload(file);
      
      // 更新进度状态 - 压缩完成
      updateProgress(file.uid, 30, '图片已压缩，正在上传...');
      onProgress?.({ percent: 30 });
      
      // 模拟真实的进度更新
      const progressInterval = setInterval(() => {
        const randomIncrement = Math.floor(Math.random() * 5) + 1;
        const currentPercent = progressStatus[file.uid]?.percent || 30;
        const newPercent = Math.min(95, currentPercent + randomIncrement);
        
        updateProgress(file.uid, newPercent);
        onProgress?.({ percent: newPercent });
      }, 800);
      
      // 调用API上传照片
      const response = await uploadPhoto(processedFile);
      
      // 清除超时和进度间隔
      clearTimeout(uploadTimeout);
      clearInterval(progressInterval);
      
      // 显示完成进度
      updateProgress(file.uid, 100, '上传完成');
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
        onSuccess?.();
        
        // 短暂延迟后移除进度条显示
        setTimeout(() => {
          setProgressStatus(prev => {
            const updated = { ...prev };
            delete updated[file.uid];
            return updated;
          });
        }, 2000);
      } else {
        updateProgress(file.uid, 100, '上传失败', 'exception');
        message.error(response.msg || `${file.name} 上传失败`);
        onError?.(new Error(response.msg || '上传失败'));
      }
    } catch (error) {
      // 清除超时
      clearTimeout(uploadTimeout);
      
      // 更新进度状态为错误
      updateProgress(file.uid, 100, error.message, 'exception');
      
      console.error('上传照片失败:', error);
      message.error(`${file.name} 上传失败: ${error.message}`);
      onError?.(error);
    } finally {
      // 清除上传状态
      onUploadingCountChange(prev => Math.max(0, prev - 1));
      setUploadingFiles(prev => prev.filter(f => f.uid !== file.uid));
      
      // 处理队列中的下一个文件
      processNextFileInQueue();
    }
  };
  
  // 处理队列中的下一个文件
  const processNextFileInQueue = () => {
    if (waitingFiles.length > 0) {
      const nextFile = waitingFiles[0];
      setWaitingFiles(prev => prev.slice(1));
      
      // 短暂延迟后开始上传下一个文件
      setTimeout(() => {
        uploadFile(nextFile);
      }, 500);
    }
  };
  
  // 更新进度状态的辅助函数
  const updateProgress = (fileUid, percent, message = null, status = 'active') => {
    setProgressStatus(prev => ({
      ...prev,
      [fileUid]: { 
        ...prev[fileUid],
        percent, 
        status,
        message: message || prev[fileUid]?.message
      }
    }));
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
  
  // 检查是否为满版照片（用于决定是否显示裁剪按钮）
  // const isFullSizePhoto = size && size.includes('满版');
  const isFullSizePhoto = false
  
  return (
    <div>
      <Upload
        listType="picture-card"
        accept="image/*"
        multiple={true}
        customRequest={customRequest}
        showUploadList={false}
        disabled={false}
        style={{ width: '100%' }}
      >
        <div style={{ textAlign: 'center', width: '100%' }}>
          <PictureOutlined style={{ fontSize: isMobile ? 20 : 24 }} />
          <div style={{ marginTop: 8, fontSize: isMobile ? 12 : 14 }}>
            {uploadingCount > 0 
              ? "正在上传..." 
              : "上传照片"}
          </div>
        </div>
      </Upload>
      
      {/* 上传状态信息区域 */}
      {(uploadingFiles.length > 0 || waitingFiles.length > 0) && (
        <div style={{ margin: '16px 0', background: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
          <div style={{ marginBottom: '8px' }}>
            <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>
              上传进度
              {waitingFiles.length > 0 && ` (队列中: ${waitingFiles.length})`}
            </Text>
          </div>
          
          {/* 上传中的文件进度 */}
          {Object.entries(progressStatus).map(([fileUid, { percent, status, fileName, message }]) => (
            <div key={fileUid} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text ellipsis style={{ width: '70%', fontSize: isMobile ? 12 : 13 }}>
                  <LoadingOutlined style={{ marginRight: 6, color: status === 'exception' ? '#ff4d4f' : '#1890ff' }} />
                  {fileName}
                </Text>
                <Text style={{ fontSize: isMobile ? 12 : 13, color: status === 'exception' ? '#ff4d4f' : '#1890ff' }}>
                  {percent}%
                </Text>
              </div>
              <Progress 
                percent={percent} 
                status={status} 
                strokeColor={status === 'exception' ? '#ff4d4f' : '#1890ff'}
                size="small" 
              />
              {message && (
                <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12, display: 'block', marginTop: 2 }}>
                  {message}
                </Text>
              )}
            </div>
          ))}
          
          {/* 等待中的文件 - 只显示前3个 */}
          {waitingFiles.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <Text type="secondary" style={{ fontSize: isMobile ? 12 : 13, display: 'block', marginBottom: 5 }}>
                等待上传:
              </Text>
              {waitingFiles.slice(0, 3).map((file, index) => (
                <div key={file.uid || index} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                  <ClockCircleOutlined style={{ color: '#faad14', marginRight: 6 }} />
                  <Text ellipsis style={{ width: '90%', fontSize: isMobile ? 12 : 13, color: '#faad14' }}>
                    {file.name} - 队列中
                  </Text>
                </div>
              ))}
              {waitingFiles.length > 3 && (
                <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12 }}>
                  还有 {waitingFiles.length - 3} 个文件在队列中...
                </Text>
              )}
            </div>
          )}
        </div>
      )}
      
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
                    {/* 只在满版照片上显示裁剪按钮 */}
                    {isFullSizePhoto && (
                      <Button 
                        type="text"
                        icon={<ScissorOutlined />}
                        onClick={() => handleCropPhoto(photo)}
                        size={isMobile ? "small" : "middle"}
                        style={{ padding: '0 8px' }}
                      >
                        裁剪
                      </Button>
                    )}
                    
                    <Button 
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeletePhoto(photo.id)}
                      size={isMobile ? "small" : "middle"}
                      style={{ padding: '0 8px', marginLeft: 'auto' }}
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