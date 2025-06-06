import React from 'react';
import { Button, Tag, Image, Typography, Row, Col } from 'antd';
import { DeleteOutlined, CompressOutlined, ScissorOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * 简单的图片网格组件（传统渲染方式）
 */
const SimplePhotoGrid = ({
  photos = [],
  onCropPhoto,
  onDeletePhoto,
  isMobile = false
}) => {
  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 如果没有照片，显示空状态
  if (photos.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: '#999',
        background: '#fafafa',
        borderRadius: '8px',
        border: '1px dashed #d9d9d9'
      }}>
        暂无照片
      </div>
    );
  }

  // 调试信息
  console.log('SimplePhotoGrid photos:', photos);

  return (
    <div style={{ marginTop: 16 }}>
      <Image.PreviewGroup>
        <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
          {photos.map(photo => {
            console.log('Rendering photo:', photo.name, 'URL:', photo.url);
            return (
            <Col key={photo.id} xs={12} sm={8} md={6} lg={4}>
              <div style={{ 
                position: 'relative', 
                marginBottom: 8, 
                backgroundColor: '#f5f5f5',
                borderRadius: 4,
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: isMobile ? '160px' : '200px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#fafafa'
                }}>
                  <Image
                    src={photo.url}
                    alt={photo.name}
                    style={{ 
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                    preview={{
                      src: photo.serverUrl || photo.url,
                      mask: <div style={{ fontSize: isMobile ? 12 : 14 }}>预览</div>
                    }}
                    fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                    placeholder={
                      <div style={{ 
                        width: '100%', 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: '#f0f0f0',
                        color: '#999'
                      }}>
                        加载中...
                      </div>
                    }
                    onError={() => console.error('图片加载失败:', photo.url)}
                    onLoad={() => console.log('图片加载成功:', photo.url)}
                  />
                  
                  {/* 标签区域 */}
                  <div style={{ 
                    position: 'absolute', 
                    top: 5, 
                    right: 5, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 4 
                  }}>
                    {photo.compressed && (
                      <Tag color="blue" size="small">
                        <CompressOutlined /> 已压缩
                      </Tag>
                    )}
                    {photo.cropped && (
                      <Tag color="green" size="small">
                        <ScissorOutlined /> 已裁剪
                      </Tag>
                    )}
                  </div>
                </div>
                
                {/* 图片信息 */}
                <div style={{ padding: '8px' }}>
                  <Text ellipsis style={{ fontSize: isMobile ? 10 : 12 }}>
                    {photo.name}
                  </Text>
                  {photo.compressed && photo.compressedSize && (
                    <Text style={{ 
                      fontSize: isMobile ? 9 : 10, 
                      color: '#999', 
                      display: 'block' 
                    }}>
                      {formatFileSize(photo.compressedSize)}
                    </Text>
                  )}
                  
                  {/* 操作按钮 */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginTop: 8
                  }}>
                    <Button 
                      type="text"
                      icon={<ScissorOutlined />}
                      onClick={() => onCropPhoto(photo)}
                      size="small"
                      style={{ padding: '0 4px', fontSize: isMobile ? 10 : 12 }}
                    >
                      裁剪
                    </Button>
                    
                    <Button 
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => onDeletePhoto(photo.id)}
                      size="small"
                      style={{ padding: '0 4px', fontSize: isMobile ? 10 : 12 }}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            </Col>
            );
          })}
        </Row>
      </Image.PreviewGroup>
    </div>
  );
};

export default SimplePhotoGrid; 