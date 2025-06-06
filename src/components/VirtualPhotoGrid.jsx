import React, { useCallback, useMemo } from 'react';
import { Button, Tag, Image, Typography } from 'antd';
import { DeleteOutlined, CompressOutlined, ScissorOutlined } from '@ant-design/icons';
import { FixedSizeGrid as Grid } from 'react-window';
import styled from 'styled-components';

const { Text } = Typography;

// 虚拟滚动容器样式
const VirtualContainer = styled.div`
  width: 100%;
  height: ${props => props.height}px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;

  .photo-item {
    padding: 8px;
    box-sizing: border-box;
  }

  .photo-card {
    width: 100%;
    height: 100%;
    background: #f5f5f5;
    border-radius: 6px;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .photo-image-container {
    flex: 1;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fafafa;
  }

  .photo-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .photo-tags {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .photo-info {
    padding: 8px;
    background: white;
    border-top: 1px solid #f0f0f0;
  }

  .photo-actions {
    display: flex;
    justify-content: space-between;
    gap: 4px;
    margin-top: 4px;
  }

  @media (max-width: 768px) {
    .photo-item {
      padding: 4px;
    }
    
    .photo-info {
      padding: 6px;
    }
  }
`;

/**
 * 图片项组件（简化版本）
 */
const PhotoItem = React.memo(({ 
  photo, 
  onCrop, 
  onDelete, 
  formatFileSize, 
  style,
  isMobile = false,
  debug = false
}) => {
  return (
    <div style={{
      ...style, // 虚拟滚动传递的位置信息
      padding: '4px', // 单元格内边距
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        height: '100%',
        background: '#fff',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* 图片区域 */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: `calc(100% - ${isMobile ? '80px' : '90px'})`, // 固定信息区域高度
          background: '#f8f8f8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
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
            placeholder={
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                fontSize: '12px'
              }}>
                加载中...
              </div>
            }
            onError={() => debug && console.error('图片加载失败:', photo.url)}
            onLoad={() => debug && console.log('图片加载成功:', photo.url)}
          />
          
          {/* 状态标签 */}
          <div style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
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
        
        {/* 信息和按钮区域 - 固定高度 */}
        <div style={{
          height: isMobile ? '80px' : '90px',
          padding: '8px',
          background: '#fff',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* 文件信息 */}
          <div style={{
            flex: 1,
            minHeight: 0,
            marginBottom: '6px'
          }}>
            <div 
              style={{ 
                fontSize: isMobile ? 11 : 12,
                fontWeight: 500,
                color: '#333',
                lineHeight: 1.2,
                wordBreak: 'break-word',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
              title={photo.name}
            >
              {photo.name}
            </div>
            {photo.compressed && photo.compressedSize && (
              <div style={{ 
                fontSize: '10px', 
                color: '#999',
                marginTop: '2px'
              }}>
                {formatFileSize(photo.compressedSize)}
              </div>
            )}
          </div>
          
          {/* 按钮区域 - 固定高度 */}
          <div style={{
            display: 'flex',
            gap: '6px',
            height: '30px' // 固定按钮区域高度
          }}>
            <Button 
              type="text"
              icon={<ScissorOutlined />}
              onClick={() => onCrop(photo)}
              size="small"
              style={{ 
                flex: 1,
                height: '100%',
                fontSize: isMobile ? 10 : 11,
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              裁剪
            </Button>
            
            <Button 
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(photo.id)}
              size="small"
              style={{ 
                flex: 1,
                height: '100%',
                fontSize: isMobile ? 10 : 11,
                border: '1px solid #ff4d4f',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              删除
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * 高性能虚拟滚动图片网格组件（简化版本）
 */
const VirtualPhotoGrid = ({
  photos = [],
  onCropPhoto,
  onDeletePhoto,
  isMobile = false,
  aspectRatio = 1,
  containerHeight = 400,
  debug = false
}) => {
  // 始终使用虚拟滚动
  
  // 格式化文件大小
  const formatFileSize = useCallback((bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }, []);

  // 重新设计的响应式计算逻辑
  const { columnCount, itemWidth, itemHeight, totalWidth } = useMemo(() => {
    // 获取视口宽度
    const viewportWidth = window.innerWidth;
    
    // 计算容器宽度 - 考虑页面padding
    const pagePadding = isMobile ? 32 : 48;
    const maxWidth = isMobile ? 600 : 1000;
    const containerWidth = Math.min(maxWidth, viewportWidth - pagePadding);
    
    // 固定双列显示
    const columnCount = 2;
    
         // 计算单列宽度 - 考虑所有空间占用
     const scrollbarSpace = 20; // 滚动条空间
     const containerPadding = 16; // 容器内边距 (左右8px)
     const itemPadding = 8; // 每个item的padding (左右4px * 2)
     const availableWidth = containerWidth - scrollbarSpace - containerPadding - itemPadding;
     const itemWidth = Math.floor(availableWidth / columnCount);
    
    // 计算高度 - 图片区域 + 信息区域
    const imageHeight = Math.floor(itemWidth / aspectRatio);
    const infoHeight = isMobile ? 80 : 90; // 文件名+按钮区域高度
    const itemHeight = imageHeight + infoHeight + 16; // +16 为padding
    
    if (debug) {
      console.log('布局计算:', {
        viewportWidth,
        containerWidth,
        itemWidth,
        itemHeight,
        imageHeight,
        infoHeight
      });
    }
    
    return {
      columnCount,
      itemWidth,
      itemHeight,
      totalWidth: containerWidth
    };
  }, [isMobile, aspectRatio, debug]);

  // 计算网格尺寸
  const rowCount = Math.ceil(photos.length / columnCount);
  
  // Debug信息
  if (debug) {
    console.log('=== VirtualPhotoGrid 布局信息 ===');
    console.log('总照片数:', photos.length);
    console.log('网格配置:', { 
      columnCount, 
      itemWidth, 
      itemHeight, 
      totalWidth, 
      rowCount,
      viewportWidth: window.innerWidth,
      isMobile 
    });
    console.log('================================');
  }

  // 虚拟滚动单元格渲染器
  const Cell = useCallback(({ columnIndex, rowIndex, style }) => {
    const photoIndex = rowIndex * columnCount + columnIndex;
    const photo = photos[photoIndex];
    
    // console.log('渲染单元格:', { columnIndex, rowIndex, photoIndex, photo: photo?.name });
    
    if (!photo) {
      return <div style={style} />;
    }

    return (
              <PhotoItem
          key={photo.id}
          photo={photo}
          onCrop={onCropPhoto}
          onDelete={onDeletePhoto}
          formatFileSize={formatFileSize}
          style={style}
          isMobile={isMobile}
          debug={debug}
        />
    );
  }, [photos, columnCount, onCropPhoto, onDeletePhoto, formatFileSize, isMobile]);

  // 性能统计
  const performanceStats = useMemo(() => {
    // 虚拟滚动只渲染可见区域的元素
    const visibleRows = Math.ceil(containerHeight / itemHeight) + 4; // +4为缓冲区
    const renderedNodes = Math.min(photos.length, visibleRows * columnCount);
    
    return {
      totalPhotos: photos.length,
      renderedNodes: renderedNodes,
      gridCols: columnCount,
      itemSize: `${itemWidth}x${itemHeight}`
    };
  }, [photos.length, columnCount, itemWidth, itemHeight, containerHeight]);

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

  // Debug控制面板
  const DebugPanel = () => (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '12px',
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: 1000,
      minWidth: '200px'
    }}>
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
        🚀 虚拟滚动性能监控
      </div>
      <div>总照片数: {performanceStats.totalPhotos}</div>
      <div>渲染节点: {performanceStats.renderedNodes}</div>
      <div>网格列数: {performanceStats.gridCols}</div>
      <div>项目尺寸: {performanceStats.itemSize}</div>
      <div style={{ 
        color: '#4CAF50',
        fontWeight: 'bold',
        marginTop: '8px'
      }}>
        ✅ 高性能虚拟滚动模式
      </div>
      <div style={{ 
        fontSize: '10px',
        color: '#ccc',
        marginTop: '4px'
      }}>
        内存节省: {Math.round((1 - performanceStats.renderedNodes / performanceStats.totalPhotos) * 100)}%
      </div>
    </div>
  );

    // 始终使用虚拟滚动（已移除传统渲染）

  // 使用虚拟滚动
  debug && console.log('使用虚拟滚动，照片数量:', photos.length);
  
  return (
    <>
      {debug && <DebugPanel />}
      <div style={{
        width: '100%',
        maxWidth: `${totalWidth}px`,
        height: `${containerHeight}px`,
        border: '1px solid #e8e8e8',
        borderRadius: '8px',
        overflow: 'hidden',
        margin: '0 auto',
        background: '#fafafa'
      }}>
        <Image.PreviewGroup>
          <Grid
            columnCount={columnCount}
            columnWidth={itemWidth}
            width={totalWidth}
            height={containerHeight}
            rowCount={rowCount}
            rowHeight={itemHeight}
            overscanRowCount={1}
            overscanColumnCount={0}
            style={{ 
              outline: 'none'
            }}
          >
            {Cell}
          </Grid>
        </Image.PreviewGroup>
      </div>
    </>
  );
};

export default VirtualPhotoGrid; 