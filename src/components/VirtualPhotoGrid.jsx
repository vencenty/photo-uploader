import React, { useCallback, useMemo, useRef, useState, useEffect, memo } from 'react';
import { Button, Tag, Image, Typography, Modal, InputNumber, message } from 'antd';
import { DeleteOutlined, CompressOutlined, ScissorOutlined } from '@ant-design/icons';
import { FixedSizeGrid as Grid } from 'react-window';
import { getProxiedImageUrl, processImageWithOSS } from '../utils/imageUtils';
import { getAspectRatioByName, getCompressedImageUrl } from '../config/photo';

const { Text } = Typography;

// 🚀 优化的动态自适应网格参数 - 使用缓存避免重复计算
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

  // 🚀 使用useMemo缓存布局计算，避免不必要的重新计算
  const layoutParams = useMemo(() => {
    // 针对移动端优化：调整最小宽度和最大列数
    const minItemWidth = isMobile ? 120 : 180; // 移动端最小宽度增加到120px，确保内容不被挤压
    let maxColumns = isMobile ? 3 : 5; // 移动端最多3列，桌面端最多5列
    let columnCount = Math.max(1, Math.min(maxColumns, Math.floor(containerWidth / minItemWidth)));
    if (photoCount < columnCount) columnCount = photoCount || 1;
    const itemWidth = Math.floor(containerWidth / columnCount);
    // 移动端适当增加高度比例，给内容更多垂直空间
    const heightRatio = isMobile ? 1.45 : 1.4;
    const itemHeight = Math.floor(itemWidth * heightRatio);
    
    return { columnCount, itemWidth, itemHeight };
  }, [containerWidth, isMobile, photoCount]);

  return { 
    containerRef, 
    containerWidth, 
    ...layoutParams 
  };
}

const PhotoItem = React.memo(({
  photo,
  onCrop,
  onDelete,
  onPreview,
  onQuantityChange,
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
  
  // 添加状态来管理图片尺寸信息
  const [imageInfo, setImageInfo] = useState(null);
  
  // 数量修改相关状态
  const [isQuantityModalVisible, setIsQuantityModalVisible] = useState(false);
  const [tempQuantity, setTempQuantity] = useState(photo.quantity || 1);
  
  // 处理数量修改
  const handleQuantityConfirm = () => {
    if (tempQuantity < 1 || tempQuantity > 10000) {
      message.error('数量必须在1-10000之间');
      return;
    }
    onQuantityChange(photo.id, tempQuantity);
    setIsQuantityModalVisible(false);
    message.success(`已设置数量为 ${tempQuantity} 张`);
  };
  
  // 打开数量修改弹窗
  const showQuantityModal = () => {
    setTempQuantity(photo.quantity || 1);
    setIsQuantityModalVisible(true);
  };
  
  // 🚀 使用CSS transform旋转 - 更高效的图片处理方案
  useEffect(() => {
    const getImageInfo = async () => {
      if (!photo.url) return;
      
      console.log(`🔍 PhotoItem ${photo.name} - 开始获取图片尺寸`);
      
      try {
        // 获取图片尺寸
        const imgElement = new window.Image();
        const info = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('图片加载超时'));
          }, 10000);
          
          imgElement.onload = () => {
            clearTimeout(timeout);
            const w = imgElement.naturalWidth || imgElement.width;
            const h = imgElement.naturalHeight || imgElement.height;
            resolve({ width: w, height: h });
          };
          
          imgElement.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('图片加载失败'));
          };
          
          imgElement.src = getProxiedImageUrl(photo.url);
        });
        
        console.log(`🖼️ PhotoItem ${photo.name} - 图片尺寸:`, info.width, "x", info.height);
        setImageInfo(info);
      } catch (error) {
        console.error(`❌ PhotoItem ${photo.name} - 获取图片尺寸失败:`, error);
        setImageInfo(null);
      }
    };
    
    getImageInfo();
  }, [photo.url, photo.lastModified, photo.name]);
  
  // 🔍 调试：监控useEffect触发（只在图片处理时）
  useEffect(() => {
    if (photo.url) {
      console.log(`📸 PhotoItem useEffect 触发 - ${photo.name}:`, {
        url: photo.url,
        lastModified: photo.lastModified,
        cropped: photo.cropped
      });
    }
  }, [photo.url, photo.lastModified]); // 移除photo.name和photo.cropped避免额外触发
  
  // 计算预览框的实际尺寸 - 重新设计高度分配
  const btnHeight = 50; // 固定按钮区域高度为50px（减少了10px）
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
  
  // 图片样式 - 使用固定尺寸，添加CSS transform旋转
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
    // 🚀 CSS transform旋转 - 如果宽>高，旋转90度
    // 注意：这里使用 height < width 的判断，与原始逻辑一致
    ...(imageInfo && imageInfo.height < imageInfo.width ? {
      transform: 'rotate(90deg)',
      transformOrigin: 'center center',
      // 调整尺寸以适应旋转后的图片
      width: previewHeight,
      height: previewWidth,
    } : {}),
  };
  
  return (
    <div style={{ ...style, padding: itemWidth < 130 ? 4 : 12, boxSizing: 'border-box' }}> {/* 移动端减少外边距 */}
      <div style={{
        width: '100%',
        height: '100%',
        background: '#fff',
        borderRadius: itemWidth < 130 ? 6 : 12, // 小屏幕时减少圆角
        boxShadow: itemWidth < 130 
          ? '0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' 
          : '0 3px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)', // 小屏幕时减少阴影
        border: '1px solid #f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)';
      }}
      >
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
          // 根据卡片宽度动态调整padding，给图片更多空间
          padding: itemWidth < 130 ? '8px 4px 4px 4px' : '20px 12px 12px 12px',
          boxSizing: 'border-box',
        }}>
          <Image
            src={getProxiedImageUrl(getCompressedImageUrl(photo.url, 'thumbnail'))}
            alt={photo.name}
            style={imageStyle}
            preview={showPreview ? false : {
              src: getProxiedImageUrl(photo.serverUrl || photo.url),
              mask: <div style={{ fontSize: 12, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '4px 8px', borderRadius: '4px' }}>预览</div>
            }}
            onClick={showPreview ? () => onPreview(photo) : undefined}
            placeholder={<div style={{ width: previewWidth, height: previewHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 12 }}>加载中...</div>}
          />
          {/* 数量角标 */}
          <div 
            style={{
              position: 'absolute',
              top: itemWidth < 130 ? 3 : 8,
              left: itemWidth < 130 ? 3 : 8,
              background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
              color: 'white',
              padding: itemWidth < 130 ? '1px 5px' : '3px 10px', // 小屏幕时进一步减少padding
              borderRadius: itemWidth < 130 ? 10 : 16, // 小屏幕时减少圆角
              fontSize: itemWidth < 130 ? 9 : 11, // 小屏幕时减少字体
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: itemWidth < 130 
                ? '0 2px 6px rgba(82, 196, 26, 0.3), 0 1px 2px rgba(0,0,0,0.08)'
                : '0 3px 8px rgba(82, 196, 26, 0.4), 0 1px 3px rgba(0,0,0,0.1)',
              minWidth: itemWidth < 130 ? 24 : 36, // 小屏幕时减少最小宽度
              textAlign: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              border: itemWidth < 130 ? '1px solid rgba(255,255,255,0.8)' : '1.5px solid rgba(255,255,255,0.9)',
              userSelect: 'none',
              zIndex: 10
            }}
            onClick={showQuantityModal}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.1) translateY(-1px)';
              e.target.style.boxShadow = '0 4px 12px rgba(82, 196, 26, 0.5), 0 2px 6px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1) translateY(0)';
              e.target.style.boxShadow = '0 3px 8px rgba(82, 196, 26, 0.4), 0 1px 3px rgba(0,0,0,0.1)';
            }}
            title="点击修改数量"
          >
            {photo.quantity || 1}张
          </div>

          {/* 状态标签 */}
          <div style={{ 
            position: 'absolute', 
            top: itemWidth < 130 ? 2 : 6, 
            right: itemWidth < 130 ? 2 : 6, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: itemWidth < 130 ? 1 : 2 
          }}>
            {showPreview && (
              <Tag color={previewType === 'whiteBorder' ? 'cyan' : 'orange'} size="small" style={{ 
                fontSize: itemWidth < 130 ? 7 : 10, 
                padding: itemWidth < 130 ? '0 3px' : '0 4px', 
                margin: 0,
                lineHeight: itemWidth < 130 ? '10px' : '16px',
                height: itemWidth < 130 ? '12px' : 'auto'
              }}>
                {itemWidth < 130 
                  ? (previewType === 'whiteBorder' ? '预览' : '预览') // 小屏幕时去掉emoji
                  : (previewType === 'whiteBorder' ? '📷 预览' : '🖼️ 预览')
                }
              </Tag>
            )}
            {photo.compressed && (
              <Tag color="blue" size="small" style={{ 
                fontSize: itemWidth < 130 ? 7 : 10, 
                padding: itemWidth < 130 ? '0 3px' : '0 4px', 
                margin: 0,
                lineHeight: itemWidth < 130 ? '10px' : '16px',
                height: itemWidth < 130 ? '12px' : 'auto'
              }}>
                <CompressOutlined style={{ fontSize: itemWidth < 130 ? 7 : 10 }} /> 
                {itemWidth < 130 ? '' : '压缩'} {/* 小屏幕时只显示图标 */}
              </Tag>
            )}
            {photo.cropped && (
              <Tag color="green" size="small" style={{ 
                fontSize: itemWidth < 130 ? 7 : 10, 
                padding: itemWidth < 130 ? '0 3px' : '0 4px', 
                margin: 0,
                lineHeight: itemWidth < 130 ? '10px' : '16px',
                height: itemWidth < 130 ? '12px' : 'auto'
              }}>
                <ScissorOutlined style={{ fontSize: itemWidth < 130 ? 7 : 10 }} />
                {itemWidth < 130 
                  ? '' // 小屏幕时只显示图标
                  : (previewType === 'fullVersion' ? '已调整' : '裁剪')
                }
              </Tag>
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
          padding: itemWidth < 130 ? '0 4px' : '0 12px' // 小屏幕时进一步减少padding
        }}>
          <div style={{ 
            fontSize: itemWidth < 130 ? 9 : 12, // 小屏幕时减少字体
            color: '#333', 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            lineHeight: itemWidth < 130 ? '12px' : '16px'
          }} title={photo.name}>
            {photo.name}
          </div>
          <div style={{ 
            fontSize: itemWidth < 130 ? 8 : 10, // 小屏幕时减少字体
            color: '#999', 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            marginTop: itemWidth < 130 ? 1 : 2,
            lineHeight: itemWidth < 130 ? '10px' : '12px'
          }}>
            {photo.compressedSize ? formatFileSize(photo.compressedSize) : ''}
          </div>
        </div>
        {/* 按钮区域 - 现代化设计 */}
        <div style={{ 
          width: '100%', 
          height: btnHeight, 
          display: 'flex', 
          gap: itemWidth < 130 ? 4 : 10, // 小屏幕时进一步减少间距
          padding: itemWidth < 130 ? '3px 4px' : '7px 16px', // 小屏幕时减少padding
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa'
        }}>
          <Button
            type="default"
            // icon={<ScissorOutlined style={{ fontSize: itemWidth < 130 ? 10 : 13 }} />}
            onClick={() => onCrop(photo)}
            style={{ 
              flex: 1, 
              height: itemWidth < 130 ? '24px' : '32px', // 小屏幕时进一步减少高度
              fontSize: itemWidth < 130 ? 9 : 12, // 小屏幕时减少字体
              borderRadius: itemWidth < 130 ? 4 : 8, // 小屏幕时减少圆角
              border: '1px solid #e0e0e0',
              background: 'white',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 500,
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: itemWidth < 130 
                ? '0 1px 2px rgba(0,0,0,0.03)' 
                : '0 1px 2px rgba(0,0,0,0.05)',
              padding: itemWidth < 130 ? '0 4px' : '0 8px'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#40a9ff';
              e.target.style.color = '#40a9ff';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 2px 6px rgba(64, 169, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#e0e0e0';
              e.target.style.color = '';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
            }}
          >
            调整
          </Button>
          <Button
            danger
            // icon={<DeleteOutlined style={{ fontSize: itemWidth < 130 ? 10 : 13 }} />}
            onClick={() => onDelete(photo.id)}
            style={{ 
              flex: 1, 
              height: itemWidth < 130 ? '24px' : '32px', // 小屏幕时进一步减少高度
              fontSize: itemWidth < 130 ? 9 : 12, // 小屏幕时减少字体
              borderRadius: itemWidth < 130 ? 4 : 8, // 小屏幕时减少圆角
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 500,
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: itemWidth < 130 
                ? '0 1px 2px rgba(0,0,0,0.03)' 
                : '0 1px 2px rgba(0,0,0,0.05)',
              padding: itemWidth < 130 ? '0 4px' : '0 8px'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 2px 6px rgba(255, 77, 79, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
            }}
          >
            删除
          </Button>
        </div>
      </div>
      
      {/* 数量修改弹窗 */}
      <Modal
        title={
          <div style={{ 
            fontSize: 16, 
            fontWeight: 600, 
            color: '#262626',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            🖨️ 设置打印数量
          </div>
        }
        open={isQuantityModalVisible}
        onOk={handleQuantityConfirm}
        onCancel={() => setIsQuantityModalVisible(false)}
        okText="确认设置"
        cancelText="取消"
        width={420}
        centered
        styles={{
          body: { padding: '24px 0' },
          header: { borderBottom: '1px solid #f0f0f0', paddingBottom: 16 }
        }}
      >
        <div style={{ padding: '0 8px' }}>
          <div style={{ 
            marginBottom: 20, 
            fontSize: 14, 
            color: '#595959',
            textAlign: 'center'
          }}>
            为这张照片设置需要冲印的数量
          </div>
          
          <div style={{
            background: '#f8f9fa',
            padding: '20px',
            borderRadius: 12,
            border: '1px solid #e8e8e8'
          }}>
            <InputNumber
              value={tempQuantity}
              onChange={setTempQuantity}
              min={1}
              max={10000}
              style={{ 
                width: '100%',
                fontSize: 16,
                textAlign: 'center'
              }}
              placeholder="请输入数量"
              addonAfter="张"
              size="large"
              controls={{
                upIcon: <div style={{ fontSize: 12 }}>＋</div>,
                downIcon: <div style={{ fontSize: 12 }}>－</div>
              }}
            />
          </div>
          
          <div style={{ 
            marginTop: 16, 
            fontSize: 12, 
            color: '#8c8c8c',
            background: '#fafafa',
            padding: '12px',
            borderRadius: 8,
            border: '1px solid #f0f0f0'
          }}>
            <div>💡 <strong>温馨提示：</strong></div>
            <div style={{ marginTop: 4, lineHeight: 1.5 }}>
              • 数量范围：1-10000张<br/>
              • 设置后会按此数量进行冲印<br/>
              • 可随时修改，不影响其他照片
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}, (prevProps, nextProps) => {
  // 🚀 超精确的比较函数 - 避免不必要的重新渲染
  const photoChanged = (
    prevProps.photo.id !== nextProps.photo.id ||
    prevProps.photo.url !== nextProps.photo.url ||
    prevProps.photo.name !== nextProps.photo.name ||
    prevProps.photo.compressed !== nextProps.photo.compressed ||
    prevProps.photo.cropped !== nextProps.photo.cropped ||
    prevProps.photo.quantity !== nextProps.photo.quantity ||
    prevProps.photo.lastModified !== nextProps.photo.lastModified
  );
  
  const propsChanged = (
    prevProps.showPreview !== nextProps.showPreview ||
    prevProps.previewType !== nextProps.previewType ||
    prevProps.itemWidth !== nextProps.itemWidth ||
    prevProps.itemHeight !== nextProps.itemHeight ||
    prevProps.size !== nextProps.size
  );
  
  // 🔍 调试：记录组件是否重新渲染
  const shouldRerender = photoChanged || propsChanged;
  if (shouldRerender) {
    console.log(`🔄 PhotoItem ${nextProps.photo.name} 重新渲染:`, {
      photoChanged,
      propsChanged,
      photoData: {
        prevUrl: prevProps.photo.url,
        nextUrl: nextProps.photo.url,
        prevCropped: prevProps.photo.cropped,
        nextCropped: nextProps.photo.cropped,
        prevLastModified: prevProps.photo.lastModified,
        nextLastModified: nextProps.photo.lastModified
      },
      layoutData: {
        prevItemWidth: prevProps.itemWidth,
        nextItemWidth: nextProps.itemWidth,
        prevItemHeight: prevProps.itemHeight,
        nextItemHeight: nextProps.itemHeight
      }
    });
  }
  
  return !shouldRerender;
});

// 🚀 统一使用全局图片处理缓存，避免缓存冲突导致重复请求
let imageProcessCache;
if (typeof window !== 'undefined') {
  // 优先使用已存在的全局缓存
  if (!window.imageProcessCache) {
    window.imageProcessCache = new Map();
  }
  imageProcessCache = window.imageProcessCache;
} else {
  imageProcessCache = new Map();
}

const VirtualPhotoGrid = memo(({
  photos = [],
  onCropPhoto,
  onDeletePhoto,
  onPreviewPhoto,
  onQuantityChange,
  showPreview = false,
  previewType = 'whiteBorder',
  isMobile = false,
  size = '3寸',
  containerHeight
}) => {
  const { containerRef, containerWidth, columnCount, itemWidth, itemHeight } = useGridLayout(isMobile, photos.length);
  
  // 🔍 调试：监控布局参数变化和VirtualPhotoGrid重新渲染
  useEffect(() => {
    console.log('🔄 VirtualPhotoGrid 重新渲染 - 布局参数:', {
      containerWidth,
      columnCount,
      itemWidth,
      itemHeight,
      photosLength: photos.length,
      timestamp: Date.now()
    });
  }, [containerWidth, columnCount, itemWidth, itemHeight, photos.length]);
  
  // 🚨 额外调试：监控photos数组的变化
  useEffect(() => {
    console.log('📝 VirtualPhotoGrid photos数组变化:', {
      photosLength: photos.length,
      photoIds: photos.map(p => p.id),
      timestamp: Date.now()
    });
  }, [photos]);
  
  // 🚀 使用ref保存photos的最新引用，避免Cell函数重新创建
  const photosRef = useRef(photos);
  photosRef.current = photos;

  // 格式化文件大小
  const formatFileSize = useCallback((bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }, []);

  // 计算行数
  const rowCount = Math.ceil(photos.length / columnCount);

  // 🚀 缓存静态props，避免每次都传递新的对象引用  
  const staticProps = useMemo(() => ({
    itemWidth,
    itemHeight,
    size,
    showPreview,
    previewType
  }), [itemWidth, itemHeight, size, showPreview, previewType]);

  // 🚀 终极优化：单元格渲染函数 - 使用itemData避免重新创建
  const Cell = useCallback(({ columnIndex, rowIndex, style, data }) => {
    const photoIndex = rowIndex * columnCount + columnIndex;
    const photo = data.photos[photoIndex];
    if (!photo) return <div style={style} />;
    return (
      <PhotoItem
        key={photo.id}
        photo={photo}
        onCrop={data.onCropPhoto}
        onDelete={data.onDeletePhoto}
        onPreview={data.onPreviewPhoto}
        onQuantityChange={data.onQuantityChange}
        formatFileSize={data.formatFileSize}
        style={style}
        {...data.staticProps}
      />
    );
  }, [columnCount]); // 只依赖columnCount

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
          itemData={{ 
            photos: photosRef.current,
            onCropPhoto,
            onDeletePhoto,
            onPreviewPhoto,
            onQuantityChange,
            formatFileSize,
            staticProps
          }}
        >
          {Cell}
        </Grid>
      </Image.PreviewGroup>
    </div>
  );
});

// 设置组件显示名称，便于调试
VirtualPhotoGrid.displayName = 'VirtualPhotoGrid';

export default VirtualPhotoGrid;
