import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Modal, Button, Slider, message, Tooltip, Switch } from 'antd';
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
  
  // 初始加载时保存初始状态到历史记录
  useEffect(() => {
    if (visible) {
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
      setInvertedAspectRatio(false);
      setCurrentAspectRatio(aspectRatio);
      hasAdjustedRef.current = false;
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
    console.log('媒体加载完成:', mediaSize);
    setMediaSize(mediaSize);
    
    // 检测图片方向
    const isLandscape = mediaSize.naturalWidth > mediaSize.naturalHeight;
    
    // 自动调整宽高比，但只在第一次加载时自动调整
    if (isLandscape && !hasAdjustedRef.current) {
      console.log('检测到横向照片，自动调整裁剪框');
      setInvertedAspectRatio(true);
      setCurrentAspectRatio(1 / aspectRatio);
      hasAdjustedRef.current = true;
    }
    
    // 根据容器和图片大小计算适当的初始缩放
    const containerWidth = 800;
    const containerHeight = isMobile ? 300 : 400;
    
    // 计算适当的缩放比例，使图片在容器中合适显示
    const widthRatio = containerWidth / mediaSize.naturalWidth;
    const heightRatio = containerHeight / mediaSize.naturalHeight;
    
    // 选择较小的比例，确保图片在容器中完全可见
    const optimalZoom = Math.min(widthRatio, heightRatio) * 0.9;
    
    // 更新缩放级别
    setZoom(Math.max(optimalZoom, 1));
    
    // 更新历史记录
    const newState = {
      crop: { x: 0, y: 0 },
      zoom: Math.max(optimalZoom, 1),
      rotation: 0
    };
    
    setHistory(prevHistory => {
      const newHistory = prevHistory.slice(0, historyIndex + 1);
      newHistory.push(newState);
      if (newHistory.length > 10) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prevIndex => prevIndex + 1);
  }, [isMobile, historyIndex, aspectRatio]);
  
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
      bodyStyle={{ padding: isMobile ? "12px" : "24px" }}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button 
          key="confirm" 
          type="primary" 
          onClick={createCroppedImage}
          loading={isLoading}
        >
          确认裁剪
        </Button>,
      ]}
      centered
    >
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