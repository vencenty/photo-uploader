import React, { useCallback, useMemo } from 'react';
import { Button, Tag, Image, Typography } from 'antd';
import { DeleteOutlined, CompressOutlined, ScissorOutlined } from '@ant-design/icons';
import { FixedSizeGrid as Grid } from 'react-window';

const { Text } = Typography;

// 预定义的容器尺寸配置 - 使用正方形图片预览区域
const CONTAINER_PRESETS = {
  mobile: {
    width: 350,        // 固定宽度350px
    height: 480,       // 固定高度480px (增加高度适应间距)
    itemHeight: 230,   // 每个item高度230px (增加10px间距)
    imageSize: 140,    // 图片区域正方形尺寸140px×140px
    infoHeight: 75,    // 信息区域高度75px
    margin: 5,         // 边距5px (增加边距)
    verticalGap: 10    // 垂直间距10px
  },
  desktop: {
    width: 620,        // 固定宽度620px
    height: 520,       // 固定高度520px (增加高度适应间距)
    itemHeight: 260,   // 每个item高度260px (增加10px间距)
    imageSize: 160,    // 图片区域正方形尺寸160px×160px
    infoHeight: 85,    // 信息区域高度85px
    margin: 6,         // 边距6px (增加边距)
    verticalGap: 12    // 垂直间距12px
  }
};

/**
 * 优化的图片项组件
 */
const PhotoItem = React.memo(({ 
  photo, 
  onCrop, 
  onDelete, 
  formatFileSize, 
  style,
  preset
}) => {
  const { imageSize, infoHeight, margin, verticalGap } = preset;
  
  return (
    <div style={style}>
      <div style={{
        margin: `${margin}px`,
        marginBottom: `${margin + 15}px`, // 简单直接增加底部间距15px
        height: `calc(100% - ${margin * 2 + 15}px)`,
        background: '#fff',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
        border: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* 图片区域 - 固定正方形尺寸 */}
        <div style={{
          position: 'relative',
          width: `${imageSize}px`,
          height: `${imageSize}px`,
          background: '#fafafa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          margin: '0 auto' // 水平居中
        }}>
          <Image
            src={photo.url}
            alt={photo.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover' // 使用cover确保填满正方形区域
            }}
            preview={{
              src: photo.serverUrl || photo.url,
              mask: <div style={{ 
                fontSize: preset === CONTAINER_PRESETS.mobile ? '10px' : '12px',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>预览</div>
            }}
            placeholder={
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                fontSize: preset === CONTAINER_PRESETS.mobile ? '10px' : '12px'
              }}>
                加载中...
              </div>
            }
          />
          
          {/* 状态标签 */}
          {(photo.compressed || photo.cropped) && (
            <div style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              {photo.compressed && (
                <Tag color="blue" size="small" style={{ 
                  fontSize: '8px', 
                  lineHeight: '12px',
                  padding: '0 4px',
                  margin: 0
                }}>
                  <CompressOutlined style={{ fontSize: '8px' }} /> 压缩
                </Tag>
              )}
              {photo.cropped && (
                <Tag color="green" size="small" style={{ 
                  fontSize: '8px', 
                  lineHeight: '12px',
                  padding: '0 4px',
                  margin: 0
                }}>
                  <ScissorOutlined style={{ fontSize: '8px' }} /> 裁剪
                </Tag>
              )}
            </div>
          )}
        </div>
        
        {/* 信息和按钮区域 - 使用预设高度 */}
        <div style={{
          width: '100%', // 确保信息区域占满容器宽度
          height: `${infoHeight}px`,
          padding: preset === CONTAINER_PRESETS.mobile ? '6px 8px 8px 8px' : '8px 10px 10px 10px', // 增加底部padding
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
          borderTop: '1px solid #f5f5f5',
          boxSizing: 'border-box'
        }}>
          {/* 文件信息区域 */}
          <div style={{
            height: preset === CONTAINER_PRESETS.mobile ? '40px' : '45px', // 减少高度为底部间距腾出空间
            marginBottom: '6px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div 
              style={{ 
                fontSize: preset === CONTAINER_PRESETS.mobile ? '10px' : '11px',
                fontWeight: 500,
                color: '#333',
                lineHeight: 1.3,
                wordBreak: 'break-word',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: preset === CONTAINER_PRESETS.mobile ? 2 : 3,
                WebkitBoxOrient: 'vertical',
                flex: 1
              }}
              title={photo.name}
            >
              {photo.name}
            </div>
            {photo.compressedSize && (
              <div style={{ 
                fontSize: preset === CONTAINER_PRESETS.mobile ? '8px' : '9px', 
                color: '#999',
                marginTop: '2px',
                lineHeight: 1
              }}>
                {formatFileSize(photo.compressedSize)}
              </div>
            )}
          </div>
          
          {/* 按钮区域 - 固定高度 */}
          <div style={{
            display: 'flex',
            gap: '6px', // 增加按钮之间的间距
            height: preset === CONTAINER_PRESETS.mobile ? '26px' : '30px', // 增加按钮高度
            marginTop: 'auto' // 让按钮区域推到底部（但有padding间距）
          }}>
            <Button 
              type="text"
              icon={<ScissorOutlined style={{ fontSize: preset === CONTAINER_PRESETS.mobile ? '10px' : '11px' }} />}
              onClick={() => onCrop(photo)}
              size="small"
                              style={{ 
                flex: 1,
                height: '100%',
                fontSize: preset === CONTAINER_PRESETS.mobile ? '9px' : '10px',
                border: '1px solid #d9d9d9',
                borderRadius: '6px', // 增加圆角
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 0,
                transition: 'all 0.2s ease' // 添加过渡效果
              }}
            >
              裁剪
            </Button>
            
            <Button 
              type="text"
              danger
              icon={<DeleteOutlined style={{ fontSize: preset === CONTAINER_PRESETS.mobile ? '10px' : '11px' }} />}
              onClick={() => onDelete(photo.id)}
              size="small"
                              style={{ 
                flex: 1,
                height: '100%',
                fontSize: preset === CONTAINER_PRESETS.mobile ? '9px' : '10px',
                border: '1px solid #ff4d4f',
                borderRadius: '6px', // 增加圆角
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 0,
                transition: 'all 0.2s ease' // 添加过渡效果
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
 * 使用预定义尺寸的虚拟滚动照片网格组件
 */
const VirtualPhotoGrid = ({
  photos = [],
  onCropPhoto,
  onDeletePhoto,
  isMobile = false,
  aspectRatio = 1,
  containerHeight // 这个参数现在会被忽略，使用预设高度
}) => {
  // 格式化文件大小
  const formatFileSize = useCallback((bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }, []);

  // 使用预定义的布局配置
  const layoutConfig = useMemo(() => {
    // 选择预设配置
    const preset = isMobile ? CONTAINER_PRESETS.mobile : CONTAINER_PRESETS.desktop;
    
    // 固定2列
    const columnCount = 2;
    
    // 使用预设的容器宽度和高度
    const containerWidth = preset.width;
    const containerHeight = preset.height;
    
    // 计算每列宽度（减去可能的滚动条宽度）
    const scrollbarWidth = 10;
    const itemWidth = Math.floor((containerWidth - scrollbarWidth) / columnCount);
    
    // 使用预设的item高度
    const itemHeight = preset.itemHeight;
    
    return {
      columnCount,
      itemWidth,
      itemHeight,
      containerWidth,
      containerHeight,
      preset
    };
  }, [isMobile]);

  // 计算行数
  const rowCount = Math.ceil(photos.length / layoutConfig.columnCount);
  
  // 单元格渲染函数
  const Cell = useCallback(({ columnIndex, rowIndex, style }) => {
    const photoIndex = rowIndex * layoutConfig.columnCount + columnIndex;
    const photo = photos[photoIndex];
    
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
        preset={layoutConfig.preset}
      />
    );
  }, [photos, layoutConfig, onCropPhoto, onDeletePhoto, formatFileSize]);

  // 空状态
  if (photos.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: isMobile ? '30px 15px' : '40px 20px',
        color: '#999',
        background: '#fafafa',
        borderRadius: '8px',
        border: '1px dashed #d9d9d9',
        fontSize: isMobile ? '14px' : '16px',
        maxWidth: `${layoutConfig.containerWidth}px`,
        margin: '0 auto'
      }}>
        暂无照片，请先上传照片
      </div>
    );
  }

  // 渲染网格
  return (
    <div style={{
      width: `${layoutConfig.containerWidth}px`,
      height: `${layoutConfig.containerHeight}px`,
      margin: '0 auto',
      border: '1px solid #e8e8e8',
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: '#f8f9fa'
    }}>
      <Image.PreviewGroup>
        <Grid
          columnCount={layoutConfig.columnCount}
          columnWidth={layoutConfig.itemWidth}
          width={layoutConfig.containerWidth}
          height={layoutConfig.containerHeight}
          rowCount={rowCount}
          rowHeight={layoutConfig.itemHeight}
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
  );
};

export default VirtualPhotoGrid; 