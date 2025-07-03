import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Space } from 'antd';
import { RotateLeftOutlined, RotateRightOutlined } from '@ant-design/icons';
import { getAspectRatioByName } from '../config/photo';

/**
 * 留白预览组件
 * 参考photo-preview.html实现留白相纸效果预览
 */
const WhiteBorderPreview = ({ 
  visible, 
  onClose, 
  imageUrl, 
  size,
  isMobile = false 
}) => {
  const [rotation, setRotation] = useState(0); // 旋转角度
  const [autoRotated, setAutoRotated] = useState(false); // 是否已自动旋转
  const imageRef = useRef(null);

  // 左转90度
  const rotateLeft = () => {
    setRotation(prev => prev - 90);
  };

  // 右转90度
  const rotateRight = () => {
    setRotation(prev => prev + 90);
  };

  // 重置旋转角度
  const resetRotation = () => {
    setRotation(0);
    setAutoRotated(false);
  };

  // 关闭预览时重置旋转角度
  const handleClose = () => {
    resetRotation();
    onClose();
  };

  // 检测图片是否需要自动旋转
  const checkAutoRotation = () => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    
    // 确保图片已经加载完成
    if (!img.naturalWidth || !img.naturalHeight) return;

    const imageAspectRatio = img.naturalWidth / img.naturalHeight;
    const paperAspectRatio = getAspectRatioByName(size);

    // 判断图片和相纸的方向
    const imageIsLandscape = imageAspectRatio > 1; // 图片是横向
    const paperIsLandscape = paperAspectRatio > 1; // 相纸是横向

    // 如果图片和相纸方向不一致，自动旋转90度以最大化显示
    if (imageIsLandscape !== paperIsLandscape) {
      setRotation(90);
      setAutoRotated(true);
      console.log(`自动旋转图片: 图片宽高比=${imageAspectRatio.toFixed(2)}, 相纸宽高比=${paperAspectRatio.toFixed(2)}`);
    } else {
      // 如果方向一致，确保旋转角度为0
      setRotation(0);
      setAutoRotated(false);
      console.log(`无需自动旋转: 图片宽高比=${imageAspectRatio.toFixed(2)}, 相纸宽高比=${paperAspectRatio.toFixed(2)}`);
    }
  };

  // 图片加载完成时检查是否需要自动旋转
  const handleImageLoad = () => {
    // 延迟一小段时间确保图片完全加载
    setTimeout(() => {
      checkAutoRotation();
    }, 50);
  };

  // 当 visible 或 imageUrl 改变时重置状态并准备检查自动旋转
  useEffect(() => {
    if (visible && imageUrl) {
      setRotation(0);
      setAutoRotated(false);
      
      // 如果图片已经加载，立即检查自动旋转
      setTimeout(() => {
        checkAutoRotation();
      }, 100);
    }
  }, [visible, imageUrl, size]); // 添加size依赖

  // 动态计算相纸尺寸 - 根据photo.js中的aspectRatio
  const getPaperDimensions = () => {
    const paperAspectRatio = getAspectRatioByName(size);
    console.log(`${size} 相纸宽高比: ${paperAspectRatio.toFixed(3)} ${paperAspectRatio > 1 ? '(横向)' : '(竖向)'}`);
    
    if (isMobile) {
      // 移动端：基于屏幕宽度的百分比
      const baseWidth = Math.min(window.innerWidth * 0.8, 350); // 最大350px
      const width = baseWidth;
      const height = width / paperAspectRatio;
      
      return {
        width: `${width}px`,
        height: `${height}px`
      };
    } else {
      // 桌面端：固定基准尺寸
      const baseSize = 300; // 基准尺寸300px
      
      if (paperAspectRatio > 1) {
        // 横向相纸
        const width = baseSize;
        const height = width / paperAspectRatio;
        return {
          width: `${width}px`,
          height: `${height}px`
        };
      } else {
        // 竖向相纸
        const height = baseSize;
        const width = height * paperAspectRatio;
        return {
          width: `${width}px`,
          height: `${height}px`
        };
      }
    }
  };

  const paperDimensions = getPaperDimensions();

  // 相纸样式 - 根据aspectRatio动态计算尺寸
  const photoPreviewStyle = {
    padding: '4mm',
    background: 'white',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
    border: '1px solid #ccc',
    boxSizing: 'border-box',
    width: paperDimensions.width,
    height: paperDimensions.height,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    transition: 'transform 0.3s ease',
    margin: '20px auto',
    transform: `rotate(${rotation}deg)`,
    position: 'relative'
  };

  const imageStyle = {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain'
  };

  return (
    <Modal
      title={`${size} - 留白效果预览`}
      open={visible}
      onCancel={handleClose}
      footer={[
        <Button key="close" onClick={handleClose}>
          关闭
        </Button>
      ]}
      width={isMobile ? '95%' : 800}
      centered
      bodyStyle={{
        padding: isMobile ? '10px' : '20px',
        textAlign: 'center',
        minHeight: isMobile ? '450px' : '600px'
      }}
    >
      {/* 旋转控制按钮 */}
      <div style={{ marginBottom: '20px' }}>
        <Space>
          <Button 
            icon={<RotateLeftOutlined />} 
            onClick={rotateLeft}
            size={isMobile ? 'small' : 'default'}
          >
            左转
          </Button>
          <Button 
            icon={<RotateRightOutlined />} 
            onClick={rotateRight}
            size={isMobile ? 'small' : 'default'}
          >
            右转
          </Button>
          <Button 
            onClick={resetRotation}
            size={isMobile ? 'small' : 'default'}
          >
            重置
          </Button>
        </Space>
      </div>

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
         以下展示的是 {size} 留白相纸的实际打印效果，图片会居中显示，四周保留白边。
         {autoRotated && (
           <>
             <br />
             <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
               🔄 已自动旋转图片以获得最佳显示效果
             </span>
           </>
         )}
       </div>

      {/* 相纸预览区域 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: isMobile ? '350px' : '450px',
        padding: '20px 0'
      }}>
        <div style={photoPreviewStyle}>
          {imageUrl && (
            <img 
              ref={imageRef}
              src={imageUrl} 
              alt="预览图片" 
              style={imageStyle}
              onLoad={handleImageLoad}
            />
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
         <div>• 系统会自动旋转图片以获得最佳显示效果</div>
         <div>• 您也可以手动使用旋转功能调整图片方向</div>
         <div>• 此预览仅供参考，实际效果可能因打印设备略有差异</div>
       </div>
    </Modal>
  );
};

export default WhiteBorderPreview; 