import React, { useCallback, useMemo } from 'react';
import { Button, Tag, Image, Typography } from 'antd';
import { DeleteOutlined, CompressOutlined, ScissorOutlined } from '@ant-design/icons';
import { FixedSizeGrid as Grid } from 'react-window';
import { getProxiedImageUrl } from '../utils/imageUtils';

const { Text } = Typography;

// 响应式配置 - 基于百分比和视口宽度计算
const getResponsiveConfig = (containerWidth, isMobile) => {
  // 基础间距配置
  const baseMargin = isMobile ? 8 : 12;
  const columnCount = 2;
  const scrollbarWidth = 15;
  
  // 计算可用宽度
  const availableWidth = Math.max(300, containerWidth - scrollbarWidth);
  const itemWidth = Math.floor(availableWidth / columnCount);
  
  // 计算图片尺寸（保持正方形，占用item宽度的70%）
  const imageSize = Math.floor(itemWidth * 0.7);
  
  // 动态计算item高度（图片 + 信息区域 + 间距）
  const infoHeight = isMobile ? 80 : 90;
  const itemHeight = imageSize + infoHeight + baseMargin * 2;
  
  // 计算容器高度（最大显示2.5行，确保滚动效果）
  const maxVisibleRows = 2.5;
  const containerHeight = Math.min(
    itemHeight * maxVisibleRows,
    window.innerHeight * 0.6 // 不超过屏幕高度的60%
  );
  
  return {
    containerWidth: availableWidth,
    containerHeight,
    itemWidth,
    itemHeight,
    imageSize,
    infoHeight,
    margin: baseMargin,
    columnCount,
    // 响应式字体大小
    fontSize: {
      title: isMobile ? 11 : 12,
      info: isMobile ? 9 : 10,
      button: isMobile ? 9 : 10,
      tag: isMobile ? 8 : 9
    }
  };
};

/**
 * 优化的图片项组件
 */
const PhotoItem = React.memo(({
  photo,
  onCrop,
  onDelete,
  onPreview,
  showPreview, // 是否为可预览类型（留白或满版）
  previewType, // 预览类型：'whiteBorder' | 'fullVersion'
  formatFileSize,
  style,
  config // 使用响应式配置替代preset
}) => {
  const { imageSize, infoHeight, margin, fontSize } = config;

  return (
    <div style={style}>
      <div style={{
        margin: `${margin}px`,
        height: `calc(100% - ${margin * 2}px)`,
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
            src={getProxiedImageUrl(photo.url)}
            alt={photo.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              cursor: showPreview ? 'pointer' : 'default'
            }}
            preview={showPreview ? false : {
              src: getProxiedImageUrl(photo.serverUrl || photo.url),
              mask: <div style={{
                fontSize: `${fontSize.info}px`,
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>预览</div>
            }}
            onClick={showPreview ? () => onPreview(photo) : undefined}
            placeholder={
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                fontSize: `${fontSize.info}px`
              }}>
                加载中...
              </div>
            }
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
            {/* 预览提示 */}
            {showPreview && (
              <Tag 
                color={previewType === 'whiteBorder' ? 'cyan' : 'orange'} 
                size="small" 
                style={{
                  fontSize: `${fontSize.tag}px`,
                  lineHeight: `${fontSize.tag + 4}px`,
                  padding: '0 4px',
                  margin: 0
                }}
              >
                {previewType === 'whiteBorder' ? '📷 点击预览' : '🖼️ 点击预览'}
              </Tag>
            )}
            {photo.compressed && (
              <Tag color="blue" size="small" style={{
                fontSize: `${fontSize.tag}px`,
                lineHeight: `${fontSize.tag + 4}px`,
                padding: '0 4px',
                margin: 0
              }}>
                <CompressOutlined style={{ fontSize: `${fontSize.tag}px` }} /> 压缩
              </Tag>
            )}
            {photo.cropped && (
              <Tag color="green" size="small" style={{
                fontSize: `${fontSize.tag}px`,
                lineHeight: `${fontSize.tag + 4}px`,
                padding: '0 4px',
                margin: 0
              }}>
                <ScissorOutlined style={{ fontSize: `${fontSize.tag}px` }} /> {previewType === 'fullVersion' ? '已调整' : '裁剪'}
              </Tag>
            )}
          </div>
        </div>

        {/* 信息和按钮区域 - 使用预设高度 */}
        <div style={{
          width: '100%', // 确保信息区域占满容器宽度
          height: `${infoHeight}px`,
          padding: `6px ${margin}px ${margin}px ${margin}px`, // 响应式padding
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
          borderTop: '1px solid #f5f5f5',
          boxSizing: 'border-box'
        }}>
          {/* 文件信息区域 */}
          <div style={{
            height: `${Math.floor(infoHeight * 0.6)}px`, // 动态计算信息区域高度
            marginBottom: '6px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div
              style={{
                fontSize: `${fontSize.title}px`,
                fontWeight: 500,
                color: '#333',
                lineHeight: 1.3,
                wordBreak: 'break-word',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                flex: 1
              }}
              title={photo.name}
            >
              {photo.name}
            </div>
            {photo.compressedSize && (
              <div style={{
                fontSize: `${fontSize.info}px`,
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
            gap: '6px',
            height: `${Math.floor(infoHeight * 0.35)}px`, // 动态计算按钮区域高度
            marginTop: 'auto'
          }}>
            <Button
              type="text"
              icon={<ScissorOutlined style={{ fontSize: `${fontSize.button}px` }} />}
              onClick={() => onCrop(photo)}
              size="small"
              style={{
                flex: 1,
                height: '100%',
                fontSize: `${fontSize.button}px`,
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 0,
                transition: 'all 0.2s ease'
              }}
            >
              调整
            </Button>

            <Button
              type="text"
              danger
              icon={<DeleteOutlined style={{ fontSize: `${fontSize.button}px` }} />}
              onClick={() => onDelete(photo.id)}
              size="small"
              style={{
                flex: 1,
                height: '100%',
                fontSize: `${fontSize.button}px`,
                border: '1px solid #ff4d4f',
                borderRadius: '4px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 0,
                transition: 'all 0.2s ease'
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
 * 响应式虚拟滚动照片网格组件
 */
const VirtualPhotoGrid = ({
  photos = [],
  onCropPhoto,
  onDeletePhoto,
  onPreviewPhoto,
  showPreview = false,
  previewType = 'whiteBorder', // 'whiteBorder' | 'fullVersion'
  isMobile = false,
  aspectRatio = 1,
  containerHeight // 这个参数现在会被忽略，使用响应式计算
}) => {
  // 容器引用，用于获取实际宽度
  const containerRef = React.useRef(null);
  const [containerWidth, setContainerWidth] = React.useState(isMobile ? 350 : 620);

  // 监听容器宽度变化
  React.useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // 获取父元素的实际宽度，减去padding
        const parentWidth = rect.width || containerRef.current.offsetWidth;
        setContainerWidth(Math.max(300, parentWidth));
      }
    };

    // 初始化设置
    updateWidth();

    // 监听窗口大小变化
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 格式化文件大小
  const formatFileSize = useCallback((bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }, []);

  // 使用响应式布局配置
  const layoutConfig = useMemo(() => {
    return getResponsiveConfig(containerWidth, isMobile);
  }, [containerWidth, isMobile]);

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
        onPreview={onPreviewPhoto}
        showPreview={showPreview}
        previewType={previewType}
        formatFileSize={formatFileSize}
        style={style}
        config={layoutConfig}
      />
    );
  }, [photos, layoutConfig, onCropPhoto, onDeletePhoto, onPreviewPhoto, showPreview, previewType, formatFileSize]);

  // 空状态
  if (photos.length === 0) {
    return (
      <div ref={containerRef} style={{
        textAlign: 'center',
        padding: isMobile ? '30px 15px' : '40px 20px',
        color: '#999',
        background: '#fafafa',
        borderRadius: '8px',
        border: '1px dashed #d9d9d9',
        fontSize: isMobile ? '14px' : '16px',
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto'
      }}>
        暂无照片，请先上传照片
      </div>
    );
  }

  // 渲染网格
  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: '100%',
        height: `${layoutConfig.containerHeight}px`,
        margin: '0 auto',
        border: '1px solid #e8e8e8',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#f8f9fa'
      }}
    >
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
