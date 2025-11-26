import React, { useState, useCallback, useMemo, memo } from 'react';
import { Modal, Button, message } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import ReactCrop from 'react-easy-crop';
import styled from 'styled-components';
import { createImageWithProxy, getProxiedImageUrl, createMobileImageForCrop } from '../utils/imageUtils';

const StyledCropContainer = styled.div`
  position: relative;
  width: 100%;
  height: 400px;
  background: #333;
  border-radius: 8px;
  overflow: hidden;

  @media (max-width: 768px) {
    height: 300px;
    border-radius: 6px;
  }
`;

const ControlsContainer = styled.div`
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;

  @media (max-width: 768px) {
    padding: 12px;
    margin-top: 12px;
    border-radius: 6px;
  }
`;

const DirectionControl = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  @media (max-width: 768px) {
    margin-bottom: 12px;
  }
`;

const ZoomControl = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  .zoom-label {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    min-width: 40px;
  }

  .zoom-range {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: #e1e5e9;
    outline: none;
    -webkit-appearance: none;

    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #1890ff;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      transition: all 0.2s ease;

      &:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
      }
    }

    &::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #1890ff;
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      transition: all 0.2s ease;

      &:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
      }
    }
  }

  .zoom-value {
    font-size: 14px;
    font-weight: 500;
    color: #1890ff;
    min-width: 35px;
    text-align: right;
  }

  @media (max-width: 768px) {
    gap: 8px;

    .zoom-label {
      font-size: 13px;
      min-width: 35px;
    }

    .zoom-range {
      height: 8px;

      &::-webkit-slider-thumb {
        width: 24px;
        height: 24px;
      }

      &::-moz-range-thumb {
        width: 24px;
        height: 24px;
      }
    }

    .zoom-value {
      font-size: 13px;
      min-width: 30px;
    }
  }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => props.inverted ? '#e6f7ff' : '#f6f6f6'};
  color: ${props => props.inverted ? '#1890ff' : '#666'};

  @media (max-width: 768px) {
    font-size: 11px;
    padding: 3px 6px;
  }
`;

// 出血线样式 - 通过 CSS 注入到 react-easy-crop 的裁剪区域
const CropContainerWithBleedLines = styled.div`
  position: relative;
  width: 100%;
  height: 100%;

  /* 满版样式时，在裁剪框内显示出血线 */
  &.show-bleed-lines {
    /* 定位到 react-easy-crop 的裁剪区域 */
    .reactEasyCrop_CropArea {
      /* 出血线边框 - 内部虚线边框表示安全区域 */
      &::before {
        content: '';
        position: absolute;
        top: 8px;
        left: 8px;
        right: 8px;
        bottom: 8px;
        border: 2px dashed rgba(255, 255, 255, 0.9);
        pointer-events: none;
        z-index: 10;
        box-shadow: 0 0 0 1px rgba(255, 0, 0, 0.5);
      }

      /* 四角斜线装饰 - 左上角 */
      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 9;
        background: 
          /* 左上角斜线 */
          repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 2px,
            rgba(255, 0, 0, 0.5) 2px,
            rgba(255, 0, 0, 0.5) 4px
          ),
          /* 右上角斜线 */
          repeating-linear-gradient(
            45deg,
            transparent,
            transparent 2px,
            rgba(255, 0, 0, 0.5) 2px,
            rgba(255, 0, 0, 0.5) 4px
          );
        background-size: 8px 8px, 8px 8px;
        background-position: 0 0, 100% 0;
        /* 只在边缘8px范围内显示斜线 */
        -webkit-mask-image: 
          linear-gradient(to right, black 8px, transparent 8px, transparent calc(100% - 8px), black calc(100% - 8px)),
          linear-gradient(to bottom, black 8px, transparent 8px, transparent calc(100% - 8px), black calc(100% - 8px));
        -webkit-mask-composite: source-over;
        mask-image: 
          linear-gradient(to right, black 8px, transparent 8px, transparent calc(100% - 8px), black calc(100% - 8px)),
          linear-gradient(to bottom, black 8px, transparent 8px, transparent calc(100% - 8px), black calc(100% - 8px));
        mask-composite: add;
      }
    }
  }

  @media (max-width: 768px) {
    &.show-bleed-lines .reactEasyCrop_CropArea::before {
      top: 6px;
      left: 6px;
      right: 6px;
      bottom: 6px;
    }
  }
`;

/**
 * 图片裁剪组件
 *
 * @param {Object} props 组件属性
 * @param {string} props.image 图片URL（用于预览）
 * @param {string} props.originalImage 原图URL（用于裁剪）
 * @param {boolean} props.visible 是否显示裁剪弹窗
 * @param {function} props.onClose 关闭弹窗的回调
 * @param {function} props.onCropComplete 裁剪完成的回调，会传入裁剪后的图片Blob
 * @param {number} props.aspectRatio 裁剪比例（宽/高）
 * @param {boolean} props.isMobile 是否是移动设备
 * @param {boolean} props.isFullVersion 是否是满版样式（满版时显示出血线提示）
 */
const ImageCropper = memo(({
  image,
  originalImage,
  visible,
  onClose,
  onCropComplete,
  aspectRatio = 4/3,
  isMobile = false,
  isFullVersion = false
}) => {
  // 裁剪区域状态
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  // 缩放比例
  const [zoom, setZoom] = useState(1);
  // 完整的裁剪区域数据
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  // 加载状态
  const [isLoading, setIsLoading] = useState(false);
  // 当前使用的裁剪比例
  const [currentAspectRatio, setCurrentAspectRatio] = useState(aspectRatio);
  // 是否已反转宽高比
  const [isAspectRatioInverted, setIsAspectRatioInverted] = useState(false);
  // 图片加载状态
  const [imageLoading, setImageLoading] = useState(true);

  // 图片加载完成后的回调
  const onMediaLoaded = useCallback((mediaSize) => {
    console.log('图片加载完成:', mediaSize);
    setImageLoading(false);

    // 计算图片宽高比，判断是否为横向图片
    const imageAspectRatio = mediaSize.naturalWidth / mediaSize.naturalHeight;
    const imageIsLandscape = imageAspectRatio > 1;

    // 检测目标裁剪比例的方向
    const cropIsLandscape = aspectRatio > 1;

    console.log('图片方向分析:', {
      imageAspectRatio,
      imageIsLandscape,
      cropIsLandscape,
      originalAspectRatio: aspectRatio
    });

    // 当图片方向与裁剪框方向不匹配时，自动调整裁剪框方向
    if (imageIsLandscape !== cropIsLandscape) {
      console.log('图片与裁剪框方向不匹配，自动调整裁剪框方向');
      const newAspectRatio = 1 / aspectRatio;
      setCurrentAspectRatio(newAspectRatio);
      setIsAspectRatioInverted(true);
    } else {
      console.log('图片与裁剪框方向匹配，使用原始比例');
      setCurrentAspectRatio(aspectRatio);
      setIsAspectRatioInverted(false);
    }
  }, [aspectRatio]);

  // 防抖处理裁剪变化
  const debouncedCropChange = useCallback((newCrop) => {
    setCrop(newCrop);
  }, []);

  // 防抖处理缩放变化
  const debouncedZoomChange = useCallback((newZoom) => {
    setZoom(newZoom);
  }, []);

  // 裁剪完成后获取裁剪区域数据
  const handleCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    console.log('裁剪区域:', croppedArea, croppedAreaPixels);
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 创建裁剪后的图片
  const createCroppedImage = useCallback(async () => {
    if (!croppedAreaPixels) {
      message.error('请先完成裁剪');
      return;
    }

    setIsLoading(true);
    console.log('开始裁剪图片...', croppedAreaPixels);

    try {
      // 使用原图进行裁剪以保证质量
      const imageUrlForCrop = originalImage || image;
      console.log('使用图片URL:', imageUrlForCrop);

      // 添加整体超时处理
      const cropPromise = getCroppedImg(imageUrlForCrop, croppedAreaPixels);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('裁剪操作超时，请重试')), 30000);
      });

      const croppedBlob = await Promise.race([cropPromise, timeoutPromise]);
      console.log('裁剪完成，blob大小:', croppedBlob.size);

      // 创建文件对象
      const fileName = `cropped-image-${Date.now()}.jpg`;
      const file = new File([croppedBlob], fileName, { type: 'image/jpeg' });
      console.log('文件创建完成:', file.name, file.size);

      onCropComplete(file);
      onClose();
    } catch (e) {
      console.error('裁剪图片出错:', e);
      message.error(e.message || '图片裁剪失败，请重试');
    } finally {
      console.log('裁剪流程结束，关闭loading');
      setIsLoading(false);
    }
  }, [croppedAreaPixels, image, originalImage, onCropComplete, onClose]);

  // 手动切换裁剪框方向
  const toggleAspectRatio = useCallback(() => {
    const newAspectRatio = 1 / currentAspectRatio;
    setCurrentAspectRatio(newAspectRatio);
    setIsAspectRatioInverted(!isAspectRatioInverted);
    console.log('手动切换裁剪框方向:', {
      oldRatio: currentAspectRatio,
      newRatio: newAspectRatio,
      inverted: !isAspectRatioInverted
    });
  }, [currentAspectRatio, isAspectRatioInverted]);

  // 重置状态当弹窗关闭时
  const handleClose = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCurrentAspectRatio(aspectRatio);
    setIsAspectRatioInverted(false);
    onClose();
  };

  // 当图片URL变化时重置状态
  React.useEffect(() => {
    if (visible && image) {
      setImageLoading(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      // 注意：不重置currentAspectRatio，让onMediaLoaded来处理
    }
  }, [image, visible]);

  return (
    <Modal
      title={
        <div style={{
          // fontSize: isMobile ? '18px' : '16px',
          // fontWeight: 600,
          color: '#333'
        }}>
          <h3>请调整图片</h3>
          <p style={{"color":"red"}}>1. 裁剪框某些情况可能初始化不正确，点击切换方向可解决</p>
          <p style={{"color":"red"}}>2. 调整画面请不要将肢体放在紧贴画面边缘处，满版照片输出四周会有2-3mm的出血线被裁切。请预留好构图空间。</p>
        </div>
      }

      open={visible}
      onCancel={handleClose}
      width={isMobile ? "95%" : 800}
      styles={{
        body: {
          padding: isMobile ? "16px" : "24px",
          maxHeight: isMobile ? '80vh' : 'auto',
          overflow: 'auto'
        },
        header: {
          padding: isMobile ? "16px 16px 12px" : "16px 24px"
        }
      }}
      footer={
        <div style={{
          display: 'flex',
          gap: isMobile ? '12px' : '8px',
          padding: isMobile ? '12px 0' : '0'
        }}>
          <Button
            key="cancel"
            onClick={handleClose}
            size={isMobile ? "large" : "middle"}
            style={{
              flex: isMobile ? 1 : 'none',
              height: isMobile ? '44px' : '32px',
              borderRadius: isMobile ? '8px' : '6px'
            }}
          >
            取消
          </Button>
          <Button
            key="confirm"
            type="primary"
            onClick={createCroppedImage}
            loading={isLoading}
            size={isMobile ? "large" : "middle"}
            style={{
              flex: isMobile ? 1 : 'none',
              height: isMobile ? '44px' : '32px',
              borderRadius: isMobile ? '8px' : '6px'
            }}
          >
            确认调整
          </Button>
        </div>
      }
      centered
      destroyOnClose
    >
      <StyledCropContainer>
        {imageLoading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#333',
            zIndex: 10,
            color: '#fff',
            fontSize: 14
          }}>
            图片加载中...
          </div>
        )}
        <CropContainerWithBleedLines className={isFullVersion ? 'show-bleed-lines' : ''}>
          <ReactCrop
            image={getProxiedImageUrl(image)}
            crop={crop}
            zoom={zoom}
            aspect={currentAspectRatio}
            onCropChange={debouncedCropChange}
            onCropComplete={handleCropComplete}
            onZoomChange={debouncedZoomChange}
            onMediaLoaded={onMediaLoaded}
            objectFit="contain"
            showGrid={!isMobile}
            style={{
              containerStyle: {
                backgroundColor: '#333'
              }
            }}
          />
        </CropContainerWithBleedLines>
      </StyledCropContainer>

      <ControlsContainer>
        <DirectionControl>
          <Button
            icon={<SwapOutlined />}
            onClick={toggleAspectRatio}
            size={isMobile ? "large" : "middle"}
            type="primary"
            ghost
            style={{
              borderRadius: isMobile ? '8px' : '6px',
              height: isMobile ? '44px' : '36px',
              minWidth: isMobile ? '120px' : '100px'
            }}
          >
            {isMobile ? "切换方向" : "切换方向"}
          </Button>

          <StatusBadge inverted={isAspectRatioInverted}>
            {isAspectRatioInverted ? '已调整方向' : '原始方向'}
          </StatusBadge>
        </DirectionControl>

      </ControlsContainer>
    </Modal>
  );
});

// 设置组件显示名称，便于调试
ImageCropper.displayName = 'ImageCropper';

/**
 * 获取裁剪后的图片
 * @param {string} imageSrc 图片URL
 * @param {Object} pixelCrop 裁剪区域数据
 * @returns {Promise<Blob>} 裁剪后的图片Blob
 */
const getCroppedImg = async (imageSrc, pixelCrop) => {
  console.log('开始加载图片:', imageSrc);

  // 强制使用CORS绕过方案，避免Canvas污染
  const image = await createMobileImageForCrop(imageSrc);

  console.log('图片加载完成:', image.width, 'x', image.height);

  // 安全化裁剪区域（取整、最小值约束、防越界）
  const safeCrop = {
    x: Math.max(0, Math.floor(Number(pixelCrop.x) || 0)),
    y: Math.max(0, Math.floor(Number(pixelCrop.y) || 0)),
    width: Math.max(1, Math.floor(Number(pixelCrop.width) || 0)),
    height: Math.max(1, Math.floor(Number(pixelCrop.height) || 0))
  };

  // 防止画布过大导致移动端内存崩溃（约束最大像素数）
  // 常见安全阈值：iOS/Safari 等在 ~16M 像素附近容易失败
  const MAX_CANVAS_PIXELS = 16 * 1024 * 1024; // 16,777,216
  let targetWidth = safeCrop.width;
  let targetHeight = safeCrop.height;
  const totalPixels = targetWidth * targetHeight;
  if (totalPixels > MAX_CANVAS_PIXELS) {
    const scale = Math.sqrt(MAX_CANVAS_PIXELS / totalPixels);
    targetWidth = Math.max(1, Math.floor(targetWidth * scale));
    targetHeight = Math.max(1, Math.floor(targetHeight * scale));
    console.warn('裁剪区域过大，按比例缩放以避免内存问题:', {
      original: { w: safeCrop.width, h: safeCrop.height },
      scaled: { w: targetWidth, h: targetHeight },
      scale
    });
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // 设置画布大小为裁剪的尺寸
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  console.log('画布尺寸:', canvas.width, 'x', canvas.height);

  // 绘制裁剪的图像区域
  ctx.drawImage(
    image,
    safeCrop.x,
    safeCrop.y,
    safeCrop.width,
    safeCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );
  console.log('图像绘制完成');

  // 将画布转换为 Blob，带兜底：toBlob 返回 null 或不支持时，使用 dataURL → Blob
  const canvasToBlobWithFallback = (cnv, type = 'image/jpeg', quality = 0.95, timeoutMs = 10000) => {
    return new Promise((resolve, reject) => {
      // 先尝试原生 toBlob
      try {
        if (typeof cnv.toBlob === 'function') {
          const timer = setTimeout(() => {
            console.error('canvas.toBlob 超时');
            reject(new Error('图片处理超时'));
          }, timeoutMs);

          cnv.toBlob(async (blob) => {
            clearTimeout(timer);
            if (blob) {
              console.log('Blob创建成功:', blob.size, 'bytes');
              resolve(blob);
            } else {
              console.warn('toBlob 返回 null，切换到 dataURL 兜底');
              try {
                const dataUrl = cnv.toDataURL(type, quality);
                const resp = await fetch(dataUrl);
                const fallbackBlob = await resp.blob();
                resolve(fallbackBlob);
              } catch (e) {
                reject(new Error('无法创建图片文件'));
              }
            }
          }, type, quality);
          return;
        }
      } catch (e) {
        console.warn('调用 toBlob 失败，使用 dataURL 兜底');
      }

      // 没有 toBlob，或前面出错，使用 dataURL 方案
      try {
        const dataUrl = cnv.toDataURL(type, quality);
        fetch(dataUrl).then(r => r.blob()).then(resolve).catch(() => reject(new Error('无法创建图片文件')));
      } catch (e) {
        reject(new Error('无法创建图片文件'));
      }
    });
  };

  return canvasToBlobWithFallback(canvas, 'image/jpeg', 0.95, 10000);
};



export default ImageCropper;
