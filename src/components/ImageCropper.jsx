import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Modal, Button, Slider, message, Tooltip, Switch, Spin } from 'antd';
import { 
  RotateLeftOutlined, RotateRightOutlined, ZoomInOutlined, ZoomOutOutlined,
  UndoOutlined, RedoOutlined, SwapOutlined
} from '@ant-design/icons';
import ReactCrop from 'react-easy-crop';
import styled from 'styled-components';

const StyledCropContainer = styled.div`
  position: relative;
  width: 100%;
  height: 400px;
  background: #333;
  
  @media (max-width: 768px) {
    height: 300px;
  }
`;

const Controls = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  padding: 0 16px;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    gap: 8px;
  }
`;

const ControlGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 120px;
  
  .slider-container {
    flex: 1;
    margin-left: 8px;
  }
`;

const HistoryButtons = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 16px;
  gap: 8px;
`;

/**
 * 图片裁剪组件
 * 
 * @param {Object} props 组件属性
 * @param {string} props.image 图片URL
 * @param {boolean} props.visible 是否显示裁剪弹窗
 * @param {function} props.onClose 关闭弹窗的回调
 * @param {function} props.onCropComplete 裁剪完成的回调，会传入裁剪后的图片Blob
 * @param {number} props.aspectRatio 裁剪比例（宽/高）
 * @param {boolean} props.isMobile 是否是移动设备
 */
const ImageCropper = ({ 
  image, 
  visible, 
  onClose, 
  onCropComplete,
  aspectRatio = 3/2,
  isMobile = false
}) => {
  // 裁剪区域状态
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  // 缩放比例
  const [zoom, setZoom] = useState(1);
  // 旋转角度
  const [rotation, setRotation] = useState(0);
  // 完整的裁剪区域数据
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  // 加载状态
  const [isLoading, setIsLoading] = useState(false);
  // 预加载状态
  const [isPreloading, setIsPreloading] = useState(true);
  // 裁剪历史记录
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  // 图片尺寸
  const [mediaSize, setMediaSize] = useState(null);
  // 是否翻转宽高比
  const [invertedAspectRatio, setInvertedAspectRatio] = useState(false);
  // 当前使用的裁剪宽高比
  const [currentAspectRatio, setCurrentAspectRatio] = useState(aspectRatio);
  // 是否已自动调整过宽高比
  const hasAdjustedRef = useRef(false);
  // 是否已经初始化过媒体尺寸
  const mediaInitializedRef = useRef(false);
  
  // 预加载图片并智能确定裁剪框方向
  useEffect(() => {
    if (visible && image) {
      setIsPreloading(true);
      
      const preloadImage = async () => {
        try {
          // 创建图像对象并加载图片
          const img = await createImage(image);
          
          // 检测图片方向
          const imageIsLandscape = img.naturalWidth > img.naturalHeight;
          const imageAspectRatio = img.naturalWidth / img.naturalHeight;
          
          // 检测目标裁剪比例的方向
          const targetIsLandscape = aspectRatio > 1;
          
          // 智能选择裁剪框方向：
          // 1. 如果图片和目标比例方向一致，使用原始比例
          // 2. 如果图片和目标比例方向不一致，选择更适合的方向
          let finalAspectRatio;
          let shouldInvert = false;
          
          if (imageIsLandscape === targetIsLandscape) {
            // 方向一致，使用原始比例
            finalAspectRatio = aspectRatio;
            shouldInvert = false;
          } else {
            // 方向不一致，选择更适合图片的方向
            if (imageIsLandscape) {
              // 图片是横向的，但目标比例是竖向的
              // 比较两种方向哪种更适合
              const originalFit = Math.min(1 / aspectRatio, imageAspectRatio) / Math.max(1 / aspectRatio, imageAspectRatio);
              const invertedFit = Math.min(aspectRatio, imageAspectRatio) / Math.max(aspectRatio, imageAspectRatio);
              
              if (invertedFit > originalFit) {
                // 使用横向比例更合适
                finalAspectRatio = aspectRatio;
                shouldInvert = true;
              } else {
                // 使用竖向比例更合适
                finalAspectRatio = 1 / aspectRatio;
                shouldInvert = false;
              }
            } else {
              // 图片是竖向的，但目标比例是横向的
              // 比较两种方向哪种更适合
              const originalFit = Math.min(aspectRatio, imageAspectRatio) / Math.max(aspectRatio, imageAspectRatio);
              const invertedFit = Math.min(1 / aspectRatio, imageAspectRatio) / Math.max(1 / aspectRatio, imageAspectRatio);
              
              if (invertedFit > originalFit) {
                // 使用竖向比例更合适
                finalAspectRatio = 1 / aspectRatio;
                shouldInvert = true;
              } else {
                // 使用横向比例更合适
                finalAspectRatio = aspectRatio;
                shouldInvert = false;
              }
            }
          }
          
          setInvertedAspectRatio(shouldInvert);
          setCurrentAspectRatio(finalAspectRatio);
          
          hasAdjustedRef.current = true;
        } catch (error) {
          console.error('预加载图片失败:', error);
          // 出错时使用默认设置
          setInvertedAspectRatio(false);
          setCurrentAspectRatio(aspectRatio);
        } finally {
          setIsPreloading(false);
        }
      };
      
      preloadImage();
    }
  }, [visible, image, aspectRatio]);
  
  // 初始加载时保存初始状态到历史记录
  useEffect(() => {
    if (visible) {
      // 每次打开时重置所有状态
      const initialState = {
        crop: { x: 0, y: 0 },
        zoom: 1,
        rotation: 0
      };
      setHistory([initialState]);
      setHistoryIndex(0);
      
      // 重置状态
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      
      // 重置宽高比调整标志，确保每次打开都能重新计算
      hasAdjustedRef.current = false;
      mediaInitializedRef.current = false; // 重置媒体初始化标志
      setInvertedAspectRatio(false);
      setCurrentAspectRatio(aspectRatio);
      setMediaSize(null); // 重置媒体尺寸
    }
  }, [visible, aspectRatio]);
  
  // 保存当前状态到历史记录
  const saveToHistory = useCallback((newState) => {
    // 如果当前不是最新状态，则移除后面的历史
    setHistory(prevHistory => {
      const newHistory = prevHistory.slice(0, historyIndex + 1);
      // 添加新状态
      newHistory.push(newState);
      // 限制历史记录最多10步
      if (newHistory.length > 10) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prevIndex => prevIndex + 1);
  }, [historyIndex]);
  
  // 图片加载完成后的回调
  const onMediaLoaded = useCallback((mediaSize) => {
    // 如果已经初始化过，且图片的真实尺寸没有变化，则直接返回
    if (mediaInitializedRef.current && 
        mediaSize.naturalWidth === mediaInitializedRef.current.naturalWidth &&
        mediaSize.naturalHeight === mediaInitializedRef.current.naturalHeight) {
      console.log('图片真实尺寸未变化，跳过处理');
      return;
    }
    
    console.log('媒体加载完成:', {
      width: mediaSize.width,
      height: mediaSize.height,
      naturalWidth: mediaSize.naturalWidth,
      naturalHeight: mediaSize.naturalHeight,
      timestamp: Date.now(),
      isFirstTime: !mediaInitializedRef.current
    });
    
    // 保存图片的真实尺寸信息
    const stableMediaSize = {
      naturalWidth: mediaSize.naturalWidth,
      naturalHeight: mediaSize.naturalHeight,
      width: mediaSize.width,
      height: mediaSize.height
    };
    
    // 标记为已初始化，并保存真实尺寸
    mediaInitializedRef.current = {
      naturalWidth: mediaSize.naturalWidth,
      naturalHeight: mediaSize.naturalHeight
    };
    
    console.log('更新媒体尺寸状态');
    setMediaSize(stableMediaSize);
  }, []);
    
  // 切换裁剪框宽高比
  const toggleAspectRatio = useCallback(() => {
    setInvertedAspectRatio(prev => {
      const newValue = !prev;
      setCurrentAspectRatio(newValue ? 1 / aspectRatio : aspectRatio);
      return newValue;
    });
  }, [aspectRatio]);
  
  // 撤销操作
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setCrop(prevState.crop);
      setZoom(prevState.zoom);
      setRotation(prevState.rotation);
      setHistoryIndex(historyIndex - 1);
    }
  };
  
  // 重做操作
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setCrop(nextState.crop);
      setZoom(nextState.zoom);
      setRotation(nextState.rotation);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // 裁剪变化完成后保存裁剪区域数据
  const onCropChange = useCallback((newCrop) => {
    setCrop(newCrop);
    
    // 延迟保存到历史记录，避免频繁更新
    clearTimeout(window.cropHistoryTimeout);
    window.cropHistoryTimeout = setTimeout(() => {
      saveToHistory({
        crop: newCrop,
        zoom,
        rotation
      });
    }, 500);
  }, [zoom, rotation, saveToHistory]);

  // 缩放变化
  const onZoomChange = useCallback((newZoom) => {
    setZoom(newZoom);
    
    // 延迟保存到历史记录，避免频繁更新
    clearTimeout(window.zoomHistoryTimeout);
    window.zoomHistoryTimeout = setTimeout(() => {
      saveToHistory({
        crop,
        zoom: newZoom,
        rotation
      });
    }, 500);
  }, [crop, rotation, saveToHistory]);

  // 裁剪完成后获取裁剪区域数据
  const handleCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 处理旋转
  const handleRotate = useCallback((direction) => {
    const newRotation = direction === 'left' 
      ? rotation - 90 
      : rotation + 90;
      
    setRotation(newRotation);
    
    saveToHistory({
      crop,
      zoom,
      rotation: newRotation
    });
  }, [crop, zoom, rotation, saveToHistory]);

  // 创建裁剪后的图片
  const createCroppedImage = useCallback(async () => {
    if (!croppedAreaPixels) {
      message.error('请先完成裁剪');
      return;
    }

    setIsLoading(true);
    try {
      // 注意：如果宽高比已反转，我们需要在裁剪时进行适当处理
      const croppedBlob = await getCroppedImg(
        image,
        croppedAreaPixels,
        rotation,
        invertedAspectRatio  // 传递是否反转宽高比的信息
      );
      
      // 调用完成回调，传入裁剪后的图片blob和文件名
      const fileType = 'image/jpeg';
      const fileName = `cropped-image-${Date.now()}.jpg`;
      
      // 创建文件对象
      const file = new File([croppedBlob], fileName, { type: fileType });
      
      onCropComplete(file);
      onClose();
    } catch (e) {
      console.error('裁剪图片出错:', e);
      message.error('图片裁剪失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [croppedAreaPixels, rotation, image, onCropComplete, onClose, invertedAspectRatio]);

  return (
    <Modal
      title="裁剪图片"
      open={visible}
      onCancel={onClose}
      width={isMobile ? "95%" : 800}
      styles={{ body: { padding: isMobile ? "12px" : "24px" } }}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button 
          key="confirm" 
          type="primary" 
          onClick={createCroppedImage}
          loading={isLoading}
          disabled={isPreloading}
        >
          确认裁剪
        </Button>,
      ]}
      centered
    >
      {isPreloading ? (
        <div style={{ 
          height: isMobile ? 300 : 400, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#f0f0f0'
        }}>
          <Spin tip="正在准备图片..." />
        </div>
      ) : (
        <>
          <StyledCropContainer>
            <ReactCrop
              image={image}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={currentAspectRatio}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={handleCropComplete}
              onMediaLoaded={onMediaLoaded}
              objectFit="contain"
              showGrid={true}
              restrictPosition={true}
              minZoom={0.1}
              maxZoom={10}
            />
          </StyledCropContainer>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
            <HistoryButtons>
              <Tooltip title="撤销">
                <Button 
                  icon={<UndoOutlined />} 
                  onClick={handleUndo} 
                  disabled={historyIndex <= 0}
                  size={isMobile ? "small" : "middle"}
                />
              </Tooltip>
              <Tooltip title="重做">
                <Button 
                  icon={<RedoOutlined />} 
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  size={isMobile ? "small" : "middle"}
                />
              </Tooltip>
            </HistoryButtons>
            
            <Tooltip title="切换裁剪框方向">
              <Button 
                icon={<SwapOutlined />} 
                onClick={toggleAspectRatio}
                size={isMobile ? "small" : "middle"}
              >
                {!isMobile && "切换裁剪框"}
              </Button>
            </Tooltip>
          </div>
          
          <Controls>
            <ControlGroup>
              <Button 
                icon={<RotateLeftOutlined />} 
                onClick={() => handleRotate('left')}
                size={isMobile ? "small" : "middle"}
              >
                {!isMobile && "向左旋转"}
              </Button>
              <Button 
                icon={<RotateRightOutlined />} 
                onClick={() => handleRotate('right')}
                size={isMobile ? "small" : "middle"}
              >
                {!isMobile && "向右旋转"}
              </Button>
            </ControlGroup>
            
            <ControlGroup>
              <ZoomOutOutlined />
              <div className="slider-container">
                <Slider
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={setZoom}
                />
              </div>
              <ZoomInOutlined />
            </ControlGroup>
          </Controls>
        </>
      )}
    </Modal>
  );
};

/**
 * 获取裁剪后的图片
 * @param {string} imageSrc 图片URL
 * @param {Object} pixelCrop 裁剪区域数据
 * @param {number} rotation 旋转角度
 * @param {boolean} inverted 是否反转了宽高比
 * @returns {Promise<Blob>} 裁剪后的图片Blob
 */
const getCroppedImg = async (imageSrc, pixelCrop, rotation = 0, inverted = false) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  // 设置canvas尺寸为安全区域
  canvas.width = safeArea;
  canvas.height = safeArea;

  // 将图像移动到中心，并应用旋转
  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-safeArea / 2, -safeArea / 2);

  // 在画布中心绘制图像
  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );

  // 从原始画布中提取裁剪的图像区域
  const data = ctx.getImageData(
    safeArea / 2 - image.width * 0.5 + pixelCrop.x,
    safeArea / 2 - image.height * 0.5 + pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // 设置画布大小为裁剪的尺寸
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // 将提取的图像数据放到画布上
  ctx.putImageData(data, 0, 0);

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