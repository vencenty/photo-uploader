import React, { useState } from 'react';
import { Upload, Button, message, Typography, Card, Row, Col, Tag } from 'antd';
import { PictureOutlined, DeleteOutlined, CompressOutlined } from '@ant-design/icons';
import { uploadPhoto } from '../services/api';
import imageCompressor from '../utils/imageCompressor';
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
  onUploadingCountChange 
}) => {
  // 内部上传状态
  const [uploading, setUploading] = useState([]);
  
  // 处理照片上传
  const customRequest = async (options) => {
    const { file, onSuccess, onError, onProgress } = options;
    
    // 增加上传中计数
    onUploadingCountChange(prev => prev + 1);
    setUploading(prev => [...prev, file.name]);
    
    // 设置上传超时
    const uploadTimeout = setTimeout(() => {
      message.error(`${file.name} 上传超时，请检查网络连接后重试`);
      onError(new Error('上传超时'));
      onUploadingCountChange(prev => Math.max(0, prev - 1));
      setUploading(prev => prev.filter(name => name !== file.name));
    }, uploadConfig.timeout);
    
    try {
      // 显示初始进度
      onProgress({ percent: 10 });
      
      // 检查是否需要压缩
      const needCompression = isCompressionNeeded(file);
      
      // 处理并压缩图片
      const processedFile = await processImageBeforeUpload(file);
      
      // 模拟真实的进度更新
      const progressInterval = setInterval(() => {
        onProgress({ percent: Math.min(95, Math.floor(Math.random() * 20) + 10) });
      }, 800);
      
      // 调用API上传照片
      const response = await uploadPhoto(processedFile);
      
      // 清除超时和进度间隔
      clearTimeout(uploadTimeout);
      clearInterval(progressInterval);
      
      // 显示完成进度
      onProgress({ percent: 100 });
      
      // 检查API响应是否成功
      if (response.code === 0 && response.data) {
        // 根据接口文档获取图片URL
        const photoUrl = response.data.url || response.data;
        
        // 创建照片对象
        const newPhoto = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          // 显示用的URL
          url: photoUrl,
          status: 'done',
          // 提交时使用的URL
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
        onSuccess();
      } else {
        message.error(response.msg || `${file.name} 上传失败`);
        onError(new Error(response.msg || '上传失败'));
      }
    } catch (error) {
      // 清除超时
      clearTimeout(uploadTimeout);
      
      console.error('上传照片失败:', error);
      message.error(`${file.name} 上传失败: ${error.message}`);
      onError(error);
    } finally {
      // 清除上传状态
      onUploadingCountChange(prev => Math.max(0, prev - 1));
      setUploading(prev => prev.filter(name => name !== file.name));
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
  
  // 预览照片
  const handlePreview = (photoUrl) => {
    // 在新窗口打开图片
    window.open(photoUrl, '_blank');
  };
  
  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  return (
    <div>
      <Upload
        listType="picture-card"
        accept="image/*"
        multiple
        customRequest={customRequest}
        showUploadList={false}
        disabled={uploadingCount > uploadConfig.maxSimultaneousUploads}
      >
        <div>
          <PictureOutlined />
          <div style={{ marginTop: 8 }}>
            {uploadingCount > uploadConfig.maxSimultaneousUploads 
              ? "上传数量已达上限" 
              : uploadingCount > 0 
                ? `上传中 (${uploadingCount})` 
                : "上传照片"}
          </div>
        </div>
      </Upload>
      
      {uploadingCount > 0 && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">正在上传 {uploadingCount} 张照片，请耐心等待...</Text>
        </div>
      )}
      
      {/* 照片预览区域 */}
      {photos.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {photos.map(photo => (
            <Col key={photo.id} xs={12} sm={8} md={6} lg={4}>
              <Card
                hoverable
                cover={
                  <div style={{ position: 'relative' }}>
                    <img
                      alt={photo.name}
                      src={photo.url}
                      style={{ height: 120, objectFit: 'cover' }}
                    />
                    {photo.compressed && (
                      <Tag color="blue" style={{ position: 'absolute', top: 5, right: 5 }}>
                        <CompressOutlined /> 已压缩
                      </Tag>
                    )}
                  </div>
                }
                bodyStyle={{ padding: '8px', textAlign: 'center' }}
              >
                <Card.Meta 
                  description={
                    <div>
                      <Text ellipsis style={{ fontSize: 12 }}>{photo.name}</Text>
                      {photo.compressed && photo.originalSize && photo.compressedSize && (
                        <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
                          {formatFileSize(photo.originalSize)} → {formatFileSize(photo.compressedSize)}
                        </div>
                      )}
                    </div>
                  } 
                />
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '8px' }}>
                  <Button 
                    type="text" 
                    icon={<PictureOutlined />} 
                    onClick={() => handlePreview(photo.url)}
                  >
                    预览
                  </Button>
                  <Button 
                    type="text" 
                    danger
                    icon={<DeleteOutlined />} 
                    onClick={() => handleDeletePhoto(photo.id)}
                  >
                    删除
                  </Button>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default PhotoUploader;