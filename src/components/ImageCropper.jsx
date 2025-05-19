import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Button, Slider, message, Tabs, Select, Radio, Space, Tooltip, InputNumber, Row, Col } from 'antd';
import { 
  RotateLeftOutlined, RotateRightOutlined, ZoomInOutlined, ZoomOutOutlined,
  BgColorsOutlined, HighlightOutlined, SettingOutlined, CompressOutlined, 
  BorderOutlined, CheckOutlined, UndoOutlined, RedoOutlined
} from '@ant-design/icons';
import ReactCrop from 'react-easy-crop';
import styled from 'styled-components';

const { TabPane } = Tabs;

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

const AdjustmentControl = styled.div`
  margin-bottom: 16px;
  
  .label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  
  .reset {
    font-size: 12px;
    color: #1890ff;
    cursor: pointer;
  }
  
  .slider-with-input {
    display: flex;
    align-items: center;
    
    .slider {
      flex: 1;
      margin-right: 12px;
    }
  }
`;

const PresetContainer = styled.div`
  margin-bottom: 16px;
  
  .preset-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }
  
  .preset-button {
    border: 1px solid #d9d9d9;
    border-radius: 2px;
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.3s;
    
    &:hover, &.active {
      border-color: #1890ff;
      color: #1890ff;
    }
    
    &.active {
      background-color: #e6f7ff;
    }
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
  // 活动标签页
  const [activeTab, setActiveTab] = useState('basic');
  // 图像调整设置
  const [adjustments, setAdjustments] = useState({
    brightness: 0,
    contrast: 0,
    saturation: 0,
  });
  // 输出质量
  const [outputQuality, setOutputQuality] = useState(0.95);
  // 裁剪历史记录
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  // 预设区域
  const [activePreset, setActivePreset] = useState(null);
  
  // 初始加载时保存初始状态到历史记录
  useEffect(() => {
    if (visible) {
      const initialState = {
        crop: { x: 0, y: 0 },
        zoom: 1,
        rotation: 0,
        adjustments: { ...adjustments }
      };
      setHistory([initialState]);
      setHistoryIndex(0);
    }
  }, [visible]);
  
  // 保存当前状态到历史记录
  const saveToHistory = (newState) => {
    // 如果当前不是最新状态，则移除后面的历史
    const newHistory = history.slice(0, historyIndex + 1);
    // 添加新状态
    newHistory.push(newState);
    // 限制历史记录最多10步
    if (newHistory.length > 10) {
      newHistory.shift();
    }
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };
  
  // 撤销操作
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setCrop(prevState.crop);
      setZoom(prevState.zoom);
      setRotation(prevState.rotation);
      setAdjustments(prevState.adjustments);
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
      setAdjustments(nextState.adjustments);
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
        rotation,
        adjustments: { ...adjustments }
      });
    }, 500);
  }, [zoom, rotation, adjustments, saveToHistory]);

  // 缩放变化
  const onZoomChange = useCallback((newZoom) => {
    setZoom(newZoom);
    
    // 延迟保存到历史记录，避免频繁更新
    clearTimeout(window.zoomHistoryTimeout);
    window.zoomHistoryTimeout = setTimeout(() => {
      saveToHistory({
        crop,
        zoom: newZoom,
        rotation,
        adjustments: { ...adjustments }
      });
    }, 500);
  }, [crop, rotation, adjustments, saveToHistory]);

  // 裁剪完成后获取裁剪区域数据
  const handleCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 处理旋转
  const handleRotate = (direction) => {
    const newRotation = direction === 'left' 
      ? rotation - 90 
      : rotation + 90;
      
    setRotation(newRotation);
    
    saveToHistory({
      crop,
      zoom,
      rotation: newRotation,
      adjustments: { ...adjustments }
    });
  };
  
  // 处理调整变化
  const handleAdjustmentChange = (key, value) => {
    const newAdjustments = { ...adjustments, [key]: value };
    setAdjustments(newAdjustments);
    
    // 延迟保存到历史记录，避免频繁更新
    clearTimeout(window.adjustHistoryTimeout);
    window.adjustHistoryTimeout = setTimeout(() => {
      saveToHistory({
        crop,
        zoom,
        rotation,
        adjustments: newAdjustments
      });
    }, 500);
  };
  
  // 重置单个调整
  const resetAdjustment = (key) => {
    handleAdjustmentChange(key, 0);
  };
  
  // 重置所有调整
  const resetAllAdjustments = () => {
    setAdjustments({
      brightness: 0,
      contrast: 0,
      saturation: 0,
    });
    
    saveToHistory({
      crop,
      zoom,
      rotation,
      adjustments: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
      }
    });
  };
  
  // 预设裁剪区域
  const cropPresets = [
    { name: '居中', action: () => setCrop({ x: 0, y: 0 }) },
    { name: '左上', action: () => setCrop({ x: -30, y: -30 }) },
    { name: '右上', action: () => setCrop({ x: 30, y: -30 }) },
    { name: '左下', action: () => setCrop({ x: -30, y: 30 }) },
    { name: '右下', action: () => setCrop({ x: 30, y: 30 }) },
  ];
  
  // 应用预设
  const applyPreset = (index) => {
    setActivePreset(index);
    cropPresets[index].action();
    
    saveToHistory({
      crop: index === 0 ? { x: 0, y: 0 } : crop,
      zoom,
      rotation,
      adjustments: { ...adjustments }
    });
  };
  
  // 获取图片滤镜CSS样式
  const getFilterStyle = () => {
    const { brightness, contrast, saturation } = adjustments;
    return {
      filter: `
        brightness(${100 + brightness}%) 
        contrast(${100 + contrast}%) 
        saturate(${100 + saturation}%)
      `
    };
  };

  // 创建裁剪后的图片
  const createCroppedImage = useCallback(async () => {
    if (!croppedAreaPixels) {
      message.error('请先完成裁剪');
      return;
    }

    setIsLoading(true);
    try {
      const croppedBlob = await getCroppedImg(
        image,
        croppedAreaPixels,
        rotation,
        adjustments,
        outputQuality
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
  }, [croppedAreaPixels, rotation, image, adjustments, outputQuality, onCropComplete, onClose]);

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
          aspect={aspectRatio}
          onCropChange={onCropChange}
          onZoomChange={onZoomChange}
          onCropComplete={handleCropComplete}
          objectFit="contain"
          showGrid={true}
          style={getFilterStyle()}
        />
      </StyledCropContainer>
      
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
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        size={isMobile ? "small" : "middle"}
        style={{ marginTop: 16 }}
      >
        <TabPane tab={<span><SettingOutlined />基本设置</span>} key="basic">
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
          
          <PresetContainer>
            <div>预设位置:</div>
            <div className="preset-buttons">
              {cropPresets.map((preset, index) => (
                <div 
                  key={preset.name} 
                  className={`preset-button ${activePreset === index ? 'active' : ''}`}
                  onClick={() => applyPreset(index)}
                >
                  {preset.name}
                </div>
              ))}
            </div>
          </PresetContainer>
        </TabPane>
        
        <TabPane tab={<span><BgColorsOutlined />图像调整</span>} key="adjust">
          <div style={{ padding: '0 16px' }}>
            <Row gutter={[16, 0]} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Button 
                  size="small" 
                  onClick={resetAllAdjustments}
                  icon={<UndoOutlined />}
                >
                  重置所有调整
                </Button>
              </Col>
            </Row>
            
            <AdjustmentControl>
              <div className="label">
                <span>亮度</span>
                <span className="reset" onClick={() => resetAdjustment('brightness')}>重置</span>
              </div>
              <div className="slider-with-input">
                <div className="slider">
                  <Slider
                    min={-100}
                    max={100}
                    value={adjustments.brightness}
                    onChange={(value) => handleAdjustmentChange('brightness', value)}
                  />
                </div>
                <InputNumber
                  size="small"
                  min={-100}
                  max={100}
                  value={adjustments.brightness}
                  onChange={(value) => handleAdjustmentChange('brightness', value)}
                  style={{ width: 70 }}
                />
              </div>
            </AdjustmentControl>
            
            <AdjustmentControl>
              <div className="label">
                <span>对比度</span>
                <span className="reset" onClick={() => resetAdjustment('contrast')}>重置</span>
              </div>
              <div className="slider-with-input">
                <div className="slider">
                  <Slider
                    min={-100}
                    max={100}
                    value={adjustments.contrast}
                    onChange={(value) => handleAdjustmentChange('contrast', value)}
                  />
                </div>
                <InputNumber
                  size="small"
                  min={-100}
                  max={100}
                  value={adjustments.contrast}
                  onChange={(value) => handleAdjustmentChange('contrast', value)}
                  style={{ width: 70 }}
                />
              </div>
            </AdjustmentControl>
            
            <AdjustmentControl>
              <div className="label">
                <span>饱和度</span>
                <span className="reset" onClick={() => resetAdjustment('saturation')}>重置</span>
              </div>
              <div className="slider-with-input">
                <div className="slider">
                  <Slider
                    min={-100}
                    max={100}
                    value={adjustments.saturation}
                    onChange={(value) => handleAdjustmentChange('saturation', value)}
                  />
                </div>
                <InputNumber
                  size="small"
                  min={-100}
                  max={100}
                  value={adjustments.saturation}
                  onChange={(value) => handleAdjustmentChange('saturation', value)}
                  style={{ width: 70 }}
                />
              </div>
            </AdjustmentControl>
          </div>
        </TabPane>
        
        <TabPane tab={<span><CompressOutlined />输出设置</span>} key="output">
          <div style={{ padding: '0 16px' }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}>输出质量:</div>
              <Select
                style={{ width: '100%' }}
                value={outputQuality}
                onChange={setOutputQuality}
                options={[
                  { value: 0.95, label: '高质量 (95%)' },
                  { value: 0.85, label: '标准质量 (85%)' },
                  { value: 0.75, label: '平衡质量 (75%)' },
                  { value: 0.65, label: '低质量 (65%)' },
                ]}
              />
            </div>
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

/**
 * 获取裁剪后的图片
 * @param {string} imageSrc 图片URL
 * @param {Object} pixelCrop 裁剪区域数据
 * @param {number} rotation 旋转角度
 * @param {Object} adjustments 图像调整参数
 * @param {number} quality 输出质量 0-1
 * @returns {Promise<Blob>} 裁剪后的图片Blob
 */
const getCroppedImg = async (imageSrc, pixelCrop, rotation = 0, adjustments = {}, quality = 0.95) => {
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
  
  // 应用图像调整
  if (adjustments && (adjustments.brightness !== 0 || adjustments.contrast !== 0 || adjustments.saturation !== 0)) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyAdjustments(imageData.data, adjustments);
    ctx.putImageData(imageData, 0, 0);
  }

  // 将画布转换为blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', quality);
  });
};

/**
 * 应用图像调整
 * @param {Uint8ClampedArray} data 图像数据
 * @param {Object} adjustments 调整参数
 */
const applyAdjustments = (data, adjustments) => {
  const brightness = adjustments.brightness / 100;
  const contrast = adjustments.contrast / 100;
  const saturation = adjustments.saturation / 100;
  
  for (let i = 0; i < data.length; i += 4) {
    // 获取RGB值
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    
    // 转换为HSL
    const hsl = rgbToHsl(r, g, b);
    
    // 应用亮度
    if (brightness !== 0) {
      hsl.l = Math.max(0, Math.min(1, hsl.l * (1 + brightness)));
    }
    
    // 应用饱和度
    if (saturation !== 0) {
      hsl.s = Math.max(0, Math.min(1, hsl.s * (1 + saturation)));
    }
    
    // 转回RGB
    const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    r = rgb.r;
    g = rgb.g;
    b = rgb.b;
    
    // 应用对比度
    if (contrast !== 0) {
      const factor = (259 * (contrast + 1)) / (255 * (1 - contrast));
      r = Math.max(0, Math.min(255, factor * (r - 128) + 128));
      g = Math.max(0, Math.min(255, factor * (g - 128) + 128));
      b = Math.max(0, Math.min(255, factor * (b - 128) + 128));
    }
    
    // 更新像素数据
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
};

/**
 * RGB转HSL
 */
const rgbToHsl = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0; // 灰色
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    
    h /= 6;
  }
  
  return { h, s, l };
};

/**
 * HSL转RGB
 */
const hslToRgb = (h, s, l) => {
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l; // 灰色
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
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