import React, { useState, useCallback, useMemo } from 'react';
import { Modal, Button, message } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import ReactCrop from 'react-easy-crop';
import styled from 'styled-components';

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
 */
const ImageCropper = ({ 
  image, 
  originalImage,
  visible, 
  onClose, 
  onCropComplete,
  aspectRatio = 4/3,
  isMobile = false
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
    try {
      // 使用原图进行裁剪以保证质量
      const imageUrlForCrop = originalImage || image;
      const croppedBlob = await getCroppedImg(imageUrlForCrop, croppedAreaPixels);
      
      // 创建文件对象
      const fileName = `cropped-image-${Date.now()}.jpg`;
      const file = new File([croppedBlob], fileName, { type: 'image/jpeg' });
      
      onCropComplete(file);
      onClose();
    } catch (e) {
      console.error('裁剪图片出错:', e);
      message.error('图片裁剪失败，请重试');
    } finally {
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
          fontSize: isMobile ? '18px' : '16px',
          fontWeight: 600,
          color: '#333'
        }}>
          裁剪图片
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
            确认裁剪
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
        <ReactCrop
          image={image}
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

                 <ZoomControl>
           <span className="zoom-label">缩放</span>
           <input
             type="range"
             value={zoom}
             min={1}
             max={3}
             step={isMobile ? 0.2 : 0.1}
             onChange={(e) => {
               const newZoom = parseFloat(e.target.value);
               debouncedZoomChange(newZoom);
             }}
             className="zoom-range"
           />
           <span className="zoom-value">{zoom.toFixed(1)}x</span>
         </ZoomControl>
      </ControlsContainer>
    </Modal>
  );
};

/**
 * 获取裁剪后的图片
 * @param {string} imageSrc 图片URL
 * @param {Object} pixelCrop 裁剪区域数据
 * @returns {Promise<Blob>} 裁剪后的图片Blob
 */
const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // 设置画布大小为裁剪的尺寸
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // 绘制裁剪的图像区域
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // 将画布转换为blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 0.95);
  });
};

/**
 * 创建图像对象
 * @param {string} url 图片URL
 * @returns {Promise<HTMLImageElement>}
 */
const createImage = (url) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
};

export default ImageCropper; 