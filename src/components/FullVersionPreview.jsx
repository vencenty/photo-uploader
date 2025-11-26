import React, { memo } from 'react';
import { Modal, Button } from 'antd';
import { getAspectRatioByName } from '../config/photo';
import { getProxiedImageUrl } from '../utils/imageUtils';
import { debugInfo, debugSuccess, debugWarning, debugError } from '../utils/debug';
import { bleedLineConfig } from '../config/bleedLine.config';

/**
 * 满版预览组件
 * 显示满版照片的预览效果（无白边，填满整个相纸）
 */
const FullVersionPreview = memo(({ 
  visible, 
  onClose, 
  imageUrl, 
  size,
  isMobile = false 
}) => {
  const [imageInfo, setImageInfo] = React.useState(null);
  const [processedImageUrl, setProcessedImageUrl] = React.useState(null);
  const [useCssTransform, setUseCssTransform] = React.useState(false);

  // 获取图片尺寸信息
  React.useEffect(() => {
    if (visible && imageUrl) {
      const processImage = async () => {
        try {
          // 获取图片尺寸
          const imgElement = new window.Image();
          try {
            imgElement.crossOrigin = 'anonymous';
          } catch (e) {
            debugInfo('设置跨域属性失败，继续加载');
          }

          const info = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('图片加载超时')), 10000);
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

          debugInfo('满版预览图片尺寸', info.width, 'x', info.height);
          setImageInfo(info);

          // 正方形相纸不做旋转
          const aspectRatio = getAspectRatioByName(size);
          const isSquare = Math.abs(aspectRatio - 1) < 0.01;

          if (!isSquare && info.height < info.width) {
            // 横图 → 竖图：优先使用 Canvas 实旋转
            try {
              const canvas = document.createElement('canvas');
              canvas.width = info.height;
              canvas.height = info.width;
              const ctx = canvas.getContext('2d');
              ctx.translate(canvas.width / 2, canvas.height / 2);
              ctx.rotate(Math.PI / 2);
              ctx.drawImage(imgElement, -info.width / 2, -info.height / 2);
              const processedUrl = canvas.toDataURL('image/jpeg', 0.9);
              debugSuccess('满版预览：图片已通过 Canvas 旋转处理');
              setProcessedImageUrl(processedUrl);
              setUseCssTransform(false);
            } catch (canvasError) {
              debugWarning('满版预览：Canvas 处理失败，使用 CSS transform 作为备选方案', canvasError);
              setProcessedImageUrl(getProxiedImageUrl(imageUrl));
              setUseCssTransform(true);
            }
          } else {
            // 竖图或正方形
            setProcessedImageUrl(getProxiedImageUrl(imageUrl));
            setUseCssTransform(false);
          }
        } catch (err) {
          debugError('满版预览处理图片失败', err);
          setImageInfo(null);
          setProcessedImageUrl(null);
          setUseCssTransform(false);
        }
      };

      processImage();
    }
  }, [visible, imageUrl, size]);

  // 关闭预览时清理状态
  const handleClose = () => {
    setImageInfo(null);
    setProcessedImageUrl(null);
    setUseCssTransform(false);
    onClose();
  };

  // 从配置获取出血线参数
  const bleedWidth = isMobile ? bleedLineConfig.mobileWidth : bleedLineConfig.width;
  const bleedColor = bleedLineConfig.color;
  const safeAreaBorderColor = bleedLineConfig.safeAreaBorderColor;
  const safeAreaBorderWidth = bleedLineConfig.safeAreaBorderWidth;
  const stripeGap = bleedLineConfig.stripeGap;
  const stripeWidth = bleedLineConfig.stripeWidth;

  // 相纸样式 - 满版相纸，填满整个区域
  const photoPreviewStyle = {
    background: 'transparent', // 不要白色
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
    border: 'none',
    padding: 0,
    // 根据相纸尺寸的宽高比计算实际预览尺寸
    ...(() => {
      const aspectRatio = getAspectRatioByName(size);
      // 设置基准高度，然后根据宽高比计算宽度
      const baseHeight = isMobile ? 370 : 460;
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
    margin: '20px auto',
    position: 'relative'
  };

  // 出血线覆盖层样式
  const bleedLineOverlayStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 10,
  };

  // 安全区域边框样式（内部虚线框）
  const safeAreaStyle = {
    position: 'absolute',
    top: bleedWidth,
    left: bleedWidth,
    right: bleedWidth,
    bottom: bleedWidth,
    border: `${safeAreaBorderWidth}px dashed ${safeAreaBorderColor}`,
    boxShadow: `0 0 0 1px ${bleedColor}`,
    pointerEvents: 'none',
    zIndex: 11,
  };

  // 生成斜线背景的CSS
  const stripePattern = `
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent ${stripeGap}px,
      ${bleedColor} ${stripeGap}px,
      ${bleedColor} ${stripeGap + stripeWidth}px
    )
  `;

  // 四边出血区域的通用样式
  const bleedAreaBaseStyle = {
    position: 'absolute',
    background: stripePattern,
    pointerEvents: 'none',
  };

  // 顶部出血区域
  const bleedTopStyle = {
    ...bleedAreaBaseStyle,
    top: 0,
    left: 0,
    right: 0,
    height: bleedWidth,
  };

  // 底部出血区域
  const bleedBottomStyle = {
    ...bleedAreaBaseStyle,
    bottom: 0,
    left: 0,
    right: 0,
    height: bleedWidth,
  };

  // 左侧出血区域
  const bleedLeftStyle = {
    ...bleedAreaBaseStyle,
    top: bleedWidth,
    left: 0,
    bottom: bleedWidth,
    width: bleedWidth,
  };

  // 右侧出血区域
  const bleedRightStyle = {
    ...bleedAreaBaseStyle,
    top: bleedWidth,
    right: 0,
    bottom: bleedWidth,
    width: bleedWidth,
  };

  const imageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover', // 满版必须用cover
    // 如果 Canvas 失败，使用 CSS transform 旋转
    ...(useCssTransform && imageInfo && imageInfo.height < imageInfo.width ? {
      transform: 'rotate(90deg)',
      transformOrigin: 'center center',
    } : {}),
  };

  return (
    <Modal
      title={`【${size}】- 满版效果预览`}
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
        background: '#f6ffed',
        borderRadius: '4px',
        fontSize: isMobile ? '12px' : '14px',
        color: '#52c41a'
      }}>
        <strong>📷 预览说明：</strong>
        <br />
        以下展示的是 {size} 满版相纸的实际打印效果，图片会填满整个相纸区域，无白边。
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
        minHeight: isMobile ? '420px' : '520px',
        padding: '20px 0'
      }}>
        <div style={photoPreviewStyle}>
          {processedImageUrl ? (
            <>
              <img
                src={processedImageUrl}
                alt="预览图片"
                style={imageStyle}
              />
              {/* 出血线覆盖层 */}
              <div style={bleedLineOverlayStyle}>
                {/* 四边出血区域斜线 */}
                <div style={bleedTopStyle} />
                <div style={bleedBottomStyle} />
                <div style={bleedLeftStyle} />
                <div style={bleedRightStyle} />
                {/* 安全区域边框 */}
                <div style={safeAreaStyle} />
              </div>
            </>
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

      {/* 出血线图例说明 */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#fff7e6',
        borderRadius: '6px',
        border: '1px solid #ffd591',
        fontSize: isMobile ? '11px' : '12px',
        color: '#d46b08'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div style={{
            width: '20px',
            height: '12px',
            background: `repeating-linear-gradient(-45deg, transparent, transparent 2px, ${bleedColor} 2px, ${bleedColor} 4px)`,
            border: `1px solid ${bleedColor}`,
            borderRadius: '2px'
          }} />
          <span><strong>红色斜线区域</strong> = 出血区（打印时会被裁切掉，约2-3mm）</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '20px',
            height: '12px',
            border: `2px dashed ${safeAreaBorderColor}`,
            background: 'rgba(255,255,255,0.3)',
            borderRadius: '2px'
          }} />
          <span><strong>白色虚线内</strong> = 安全区域（重要内容请放在此范围内）</span>
        </div>
      </div>

      {/* 底部提示 */}
      <div style={{ 
        marginTop: '12px',
        fontSize: isMobile ? '11px' : '12px',
        color: '#666',
        lineHeight: '1.5'
      }}>
        <div>💡 <strong>提示：</strong></div>
        <div>• 满版照片会填满整个相纸区域，无留白边框</div>
        <div>• <span style={{ color: '#d46b08' }}>红色斜线区域的内容会在打印时被裁切</span></div>
        <div>• 请确保人物肢体、重要文字等在白色虚线内</div>
        <div>• 预览效果仅供参考，实际效果可能因打印设备略有差异</div>
      </div>
    </Modal>
  );
});

// 设置组件显示名称，便于调试
FullVersionPreview.displayName = 'FullVersionPreview';

export default FullVersionPreview; 