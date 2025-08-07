import React, { memo } from 'react';
import { Modal, Button } from 'antd';
import { getAspectRatioByName } from '../config/photo';
import { getProxiedImageUrl } from '../utils/imageUtils';
import { debugInfo, debugSuccess, debugWarning, debugError } from '../utils/debug';


/**
 * 留白预览组件
 * 参考photo-preview.html实现留白相纸效果预览
 */
const WhiteBorderPreview = memo(({ 
  visible, 
  onClose, 
  imageUrl, 
  size,
  isMobile = false 
}) => {
  const [imageInfo, setImageInfo] = React.useState(null);
  const [processedImageUrl, setProcessedImageUrl] = React.useState(null);
  const [useCssTransform, setUseCssTransform] = React.useState(false);

  // 获取图片尺寸信息并处理图片
  React.useEffect(() => {
    if (visible && imageUrl) {
      const processImage = async () => {
        try {
          // 获取图片尺寸
          const imgElement = new window.Image();
          
          // 尝试设置跨域属性
          try {
            imgElement.crossOrigin = 'anonymous';
          } catch (e) {
            debugInfo('设置跨域属性失败，继续加载');
          }
          
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
            
            imgElement.src = getProxiedImageUrl(imageUrl);
          });
          
          debugInfo('留白预览图片尺寸', info.width, "x", info.height);
          debugInfo('是否需要旋转', info.height < info.width);
          debugInfo('图片URL', getProxiedImageUrl(imageUrl));
          setImageInfo(info);

          // 🎯 使用 Canvas 处理图片旋转，参考 photo-preview.html
          // 对于正方形相纸，不需要旋转图片
          const aspectRatio = getAspectRatioByName(size);
          const isSquare = Math.abs(aspectRatio - 1) < 0.01;
          
          if (!isSquare && info.height < info.width) {
            // 横图需要旋转为竖图
            try {
              const canvas = document.createElement('canvas');
              canvas.width = info.height;  // 旋转后宽度变为原高度
              canvas.height = info.width;  // 旋转后高度变为原宽度
              
              const ctx = canvas.getContext('2d');
              ctx.translate(canvas.width / 2, canvas.height / 2);
              ctx.rotate(Math.PI / 2);
              ctx.drawImage(imgElement, -info.width / 2, -info.height / 2);
              
              const processedUrl = canvas.toDataURL('image/jpeg', 0.9);
              debugSuccess('图片已通过 Canvas 旋转处理');
              setProcessedImageUrl(processedUrl);
            } catch (canvasError) {
              debugWarning('Canvas 处理失败，使用 CSS transform 作为备选方案', canvasError);
              // 如果 Canvas 处理失败（通常是跨域问题），回退到 CSS transform
              setProcessedImageUrl(getProxiedImageUrl(imageUrl));
              setUseCssTransform(true);
            }
          } else {
            // 竖图或正方形相纸直接使用原图
            setProcessedImageUrl(getProxiedImageUrl(imageUrl));
          }
        } catch (err) {
          debugError('处理图片失败', err);
          setImageInfo(null);
          setProcessedImageUrl(null);
        }
      };
      
      processImage();
    }
  }, [visible, imageUrl]);

  // 关闭预览时清理状态
  const handleClose = () => {
    setImageInfo(null);
    setProcessedImageUrl(null);
    setUseCssTransform(false);
    onClose();
  };

  // 相纸样式 - 参考 photo-preview.html，固定为竖向相纸
  const photoPreviewStyle = {
    padding: (() => {
      const aspectRatio = getAspectRatioByName(size);
      // 对于正方形，使用更均匀的padding
      if (Math.abs(aspectRatio - 1) < 0.01) {
        return '4mm';
      }
      return '3mm';
    })(),
    background: 'white',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
    border: '1px solid #ccc',
    boxSizing: 'border-box',
    // 根据相纸尺寸的宽高比计算实际预览尺寸
    ...(() => {
      const aspectRatio = getAspectRatioByName(size);
      
      // 对于正方形，使用固定的正方形尺寸
      if (Math.abs(aspectRatio - 1) < 0.01) {
        const squareSize = isMobile ? 300 : 380;
        debugInfo('正方形相纸尺寸', `${squareSize}px x ${squareSize}px`);
        return {
          width: `${squareSize}px`,
          height: `${squareSize}px`
        };
      }
      
      // 对于其他比例，设置基准高度，然后根据宽高比计算宽度
      const baseHeight = isMobile ? 340 : 425;
      const calculatedWidth = baseHeight * aspectRatio;
      
      return {
        width: `${calculatedWidth}px`,
        height: `${baseHeight}px`
      };
    })(),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    margin: '0px',
    position: 'relative'
  };

  // 🎯 优化图片样式，确保留白效果正确
  const imageStyle = {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    // 确保图片能够正确显示
    display: 'block',
    // 🚀 如果 Canvas 处理失败，使用 CSS transform 作为备选方案
    ...(useCssTransform && imageInfo && imageInfo.height < imageInfo.width ? {
      transform: 'rotate(90deg)',
      transformOrigin: 'center center',
    } : {}),
  };

  return (
    <Modal
      title={`【${size} 】- 留白效果预览`}
      open={visible}
      onCancel={handleClose}
      footer={[
        <Button key="close" onClick={handleClose}>
          关闭
        </Button>
      ]}
      width={isMobile ? '95%' : 800}
      centered
      styles={{
        body: {
          padding: isMobile ? '10px' : '20px',
          textAlign: 'center',
          minHeight: isMobile ? '500px' : '650px'
        }
      }}
    >


      {/* 预览说明 */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '10px',
        background: '#f0f8ff',
        borderRadius: '4px',
        fontSize: isMobile ? '12px' : '14px',
        color: '#1890ff'
      }}>
        <strong>📷 预览说明：</strong>
        <br />
        以下展示的是 {size} 留白相纸的实际打印效果，所有图片已自动调整为竖向显示，四周保留白边。
        {imageInfo && imageInfo.height < imageInfo.width && (
          <>
            <br />
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
              🔄 已自动旋转横图为竖图显示
            </span>
          </>
        )}
      </div>

      {/* 相纸预览区域 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: isMobile ? '380px' : '480px',
        padding: '10px'
      }}>
        <div style={photoPreviewStyle}>
          {processedImageUrl ? (
            <img 
              src={processedImageUrl} 
              alt="预览图片" 
              style={imageStyle}
            />
          ) : (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              color: '#999',
              fontSize: '14px'
            }}>
              加载中...
            </div>
          )}
        </div>
      </div>

      {/* 底部提示 */}
      <div style={{ 
        marginTop: '20px',
        fontSize: isMobile ? '11px' : '12px',
        color: '#666',
        lineHeight: '1.5'
      }}>
        <div>💡 <strong>提示：</strong></div>
        <div>• 实际打印时会保留白边效果，图片不会被裁切</div>
        <div>• 系统已自动将横图调整为竖向显示，模拟真实打印效果</div>
        <div>• 此预览完全模拟打印机的处理方式</div>
        <div>• 预览效果仅供参考，实际效果可能因打印设备略有差异</div>
      </div>
    </Modal>
  );
});

// 设置组件显示名称，便于调试
WhiteBorderPreview.displayName = 'WhiteBorderPreview';

export default WhiteBorderPreview; 