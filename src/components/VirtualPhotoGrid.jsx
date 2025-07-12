import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Button, Tag, Image, Typography } from 'antd';
import { DeleteOutlined, CompressOutlined, ScissorOutlined } from '@ant-design/icons';
import { FixedSizeGrid as Grid } from 'react-window';
import { getProxiedImageUrl, processImageRotation } from '../utils/imageUtils';
import { getAspectRatioByName } from '../config/photo';

const { Text } = Typography;

// 动态自适应网格参数
function useGridLayout(isMobile, photoCount) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(360);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerWidth(rect.width || window.innerWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // 最小item宽度180px，最大5列，移动端最多2列
  const minItemWidth = 180;
  let maxColumns = isMobile ? 2 : 5;
  let columnCount = Math.max(1, Math.min(maxColumns, Math.floor(containerWidth / minItemWidth)));
  if (photoCount < columnCount) columnCount = photoCount || 1;
  const itemWidth = Math.floor(containerWidth / columnCount);
  const itemHeight = Math.floor(itemWidth * 1.4); // 从1.15增加到1.4，给整个卡片更多高度
  return { containerRef, containerWidth, columnCount, itemWidth, itemHeight };
}

const PhotoItem = React.memo(({
  photo,
  onCrop,
  onDelete,
  onPreview,
  showPreview,
  previewType,
  formatFileSize,
  style,
  itemWidth,
  itemHeight,
  size
}) => {
  // 获取相纸尺寸比例
  const aspectRatio = getAspectRatioByName(size);
  
  // 判断是否为留白类型
  const isWhiteBorder = size.includes('留白');
  
  // 添加状态来管理处理后的图片URL
  const [processedImageUrl, setProcessedImageUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 处理图片旋转 - 添加更稳定的依赖项和重复处理检查
  useEffect(() => {
    const processImage = async () => {
      if (!photo.url) return;
      
      // 如果已经有处理结果且URL没变，跳过重新处理
      if (processedImageUrl && processedImageUrl !== photo.url) {
        console.log("⏭️ 跳过重复处理，已有结果：", photo.url);
        return;
      }
      
      setIsProcessing(true);
      try {
        const rotatedUrl = await processImageRotation(photo.url);
        setProcessedImageUrl(rotatedUrl);
      } catch (error) {
        console.error('图片处理失败：', error);
        setProcessedImageUrl(photo.url); // 使用原图
      } finally {
        setIsProcessing(false);
      }
    };
    
    processImage();
  }, [photo.url, photo.id]); // 添加photo.id作为稳定的标识符
  
  // 计算预览框的实际尺寸 - 重新设计高度分配
  const btnHeight = 60; // 固定按钮区域高度为60px
  const textHeight = 40; // 固定文件名区域高度为40px  
  const imageHeight = itemHeight - btnHeight - textHeight; // 剩余空间全部给图片区域
  
  // 根据相纸比例计算固定的显示尺寸
  const maxPreviewWidth = itemWidth - 32; // 减去padding
  const maxPreviewHeight = imageHeight - 32; // 减去padding
  
  // 根据相纸宽高比计算实际显示尺寸（保持相纸真实比例）
  let previewWidth, previewHeight;
  if (maxPreviewWidth / maxPreviewHeight > aspectRatio) {
    // 容器更宽，以高度为准
    previewHeight = maxPreviewHeight;
    previewWidth = previewHeight * aspectRatio;
  } else {
    // 容器更高，以宽度为准
    previewWidth = maxPreviewWidth;
    previewHeight = previewWidth / aspectRatio;
  }
  
  // 图片样式 - 使用固定尺寸
  const imageStyle = {
    width: previewWidth,
    height: previewHeight,
    objectFit: isWhiteBorder ? 'contain' : 'cover',
    cursor: showPreview ? 'pointer' : 'default',
    borderRadius: isWhiteBorder ? '4px' : '0px',
    // 留白类型需要白色背景和边框来模拟相纸效果
    background: isWhiteBorder ? '#fff' : 'transparent',
    padding: isWhiteBorder ? '6px' : '0px',
    border: isWhiteBorder ? '1px solid #e6e6e6' : 'none',
    boxShadow: isWhiteBorder ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
  };
  
  return (
    <div style={{ ...style, padding: 12, boxSizing: 'border-box' }}> {/* 从8px增加到12px，增加卡片间距 */}
      <div style={{
        width: '100%',
        height: '100%',
        background: '#fff',
        borderRadius: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
      }}>
        {/* 图片区域 */}
        <div style={{
          width: '100%',
          height: imageHeight,
          background: isWhiteBorder ? '#f8f9fa' : '#fafafa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          padding: '20px 12px 12px 12px', // 顶部20px，左右和底部12px，增加更多呼吸感
          boxSizing: 'border-box',
        }}>
          {isProcessing ? (
            <div style={{ 
              width: previewWidth, 
              height: previewHeight, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#999', 
              fontSize: 12,
              background: '#f5f5f5',
              borderRadius: '4px'
            }}>
              处理中...
            </div>
          ) : (
            <Image
              src={processedImageUrl || getProxiedImageUrl(photo.url)}
              alt={photo.name}
              style={imageStyle}
              preview={showPreview ? false : {
                src: getProxiedImageUrl(photo.serverUrl || photo.url),
                mask: <div style={{ fontSize: 12, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '4px 8px', borderRadius: '4px' }}>预览</div>
              }}
              onClick={showPreview ? () => onPreview(photo) : undefined}
              placeholder={<div style={{ width: previewWidth, height: previewHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 12 }}>加载中...</div>}
            />
          )}
          {/* 状态标签 */}
          <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {showPreview && (
              <Tag color={previewType === 'whiteBorder' ? 'cyan' : 'orange'} size="small" style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>{previewType === 'whiteBorder' ? '📷 预览' : '🖼️ 预览'}</Tag>
            )}
            {photo.compressed && (
              <Tag color="blue" size="small" style={{ fontSize: 10, padding: '0 4px', margin: 0 }}><CompressOutlined style={{ fontSize: 10 }} /> 压缩</Tag>
            )}
            {photo.cropped && (
              <Tag color="green" size="small" style={{ fontSize: 10, padding: '0 4px', margin: 0 }}><ScissorOutlined style={{ fontSize: 10 }} />{previewType === 'fullVersion' ? '已调整' : '裁剪'}</Tag>
            )}
          </div>
        </div>
        {/* 文件名+大小区域 */}
        <div style={{ 
          width: '100%', 
          height: textHeight, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          padding: '0 12px' 
        }}>
          <div style={{ fontSize: 12, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={photo.name}>
            {photo.name}
          </div>
          <div style={{ fontSize: 10, color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
            {photo.compressedSize ? formatFileSize(photo.compressedSize) : ''}
          </div>
        </div>
        {/* 按钮区域 */}
        <div style={{ 
          width: '100%', 
          height: btnHeight, 
          display: 'flex', 
          gap: 10, 
          padding: '8px 12px', 
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Button
            type="text"
            icon={<ScissorOutlined style={{ fontSize: 14 }} />}
            onClick={() => onCrop(photo)}
            size="small"
            style={{ flex: 1, height: '100%', fontSize: 12, border: '1px solid #d9d9d9', borderRadius: 4, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}
          >调整</Button>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined style={{ fontSize: 14 }} />}
            onClick={() => onDelete(photo.id)}
            size="small"
            style={{ flex: 1, height: '100%', fontSize: 12, border: '1px solid #ff4d4f', borderRadius: 4, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}
          >删除</Button>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数 - 只有关键props变化时才重新渲染
  return (
    prevProps.photo.id === nextProps.photo.id &&
    prevProps.photo.url === nextProps.photo.url &&
    prevProps.photo.name === nextProps.photo.name &&
    prevProps.photo.compressed === nextProps.photo.compressed &&
    prevProps.photo.cropped === nextProps.photo.cropped &&
    prevProps.showPreview === nextProps.showPreview &&
    prevProps.previewType === nextProps.previewType &&
    prevProps.itemWidth === nextProps.itemWidth &&
    prevProps.itemHeight === nextProps.itemHeight &&
    prevProps.size === nextProps.size
  );
});

const VirtualPhotoGrid = ({
  photos = [],
  onCropPhoto,
  onDeletePhoto,
  onPreviewPhoto,
  showPreview = false,
  previewType = 'whiteBorder',
  isMobile = false,
  size = '3寸',
  containerHeight
}) => {
  const { containerRef, containerWidth, columnCount, itemWidth, itemHeight } = useGridLayout(isMobile, photos.length);

  // 格式化文件大小
  const formatFileSize = useCallback((bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }, []);

  // 计算行数
  const rowCount = Math.ceil(photos.length / columnCount);

  // 单元格渲染函数
  const Cell = useCallback(({ columnIndex, rowIndex, style }) => {
    const photoIndex = rowIndex * columnCount + columnIndex;
    const photo = photos[photoIndex];
    if (!photo) return <div style={style} />;
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
        itemWidth={itemWidth}
        itemHeight={itemHeight}
                  size={size}
      />
    );
  }, [photos, columnCount, onCropPhoto, onDeletePhoto, onPreviewPhoto, showPreview, previewType, formatFileSize, itemWidth, itemHeight, size]);

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
        height: `${Math.min(itemHeight * rowCount, window.innerHeight * 0.7)}px`,
        margin: '0 auto',
        border: '1px solid #e8e8e8',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#f8f9fa'
      }}
    >
      <Image.PreviewGroup>
        <Grid
          columnCount={columnCount}
          columnWidth={itemWidth}
          width={containerWidth}
          height={Math.min(itemHeight * rowCount, window.innerHeight * 0.7)}
          rowCount={rowCount}
          rowHeight={itemHeight}
          overscanRowCount={1}
          overscanColumnCount={0}
          style={{ outline: 'none' }}
        >
          {Cell}
        </Grid>
      </Image.PreviewGroup>
    </div>
  );
};

export default VirtualPhotoGrid;
