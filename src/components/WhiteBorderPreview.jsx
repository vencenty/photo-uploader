import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'antd';
import { getProxiedImageUrl, processImageRotation } from '../utils/imageUtils';
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
  const [processedImageUrl, setProcessedImageUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 关闭预览时清理状态
  const handleClose = () => {
    setProcessedImageUrl('');
    setIsProcessing(false);
    onClose();
  };

  // 处理图片 - 使用统一的工具函数
  const processImage = async () => {
    if (!imageUrl || !visible) return;
    
    setIsProcessing(true);
    
    try {
      const rotatedUrl = await processImageRotation(imageUrl);
      setProcessedImageUrl(rotatedUrl);
    } catch (error) {
      console.error('图片处理失败：', error);
      setProcessedImageUrl(imageUrl); // 使用原图
    } finally {
      setIsProcessing(false);
    }
  };

  // 当预览打开或图片URL变化时处理图片
  useEffect(() => {
    if (visible && imageUrl) {
      processImage();
    } else {
      setProcessedImageUrl('');
      setIsProcessing(false);
    }
  }, [visible, imageUrl]);

  // 相纸样式 - 参考 photo-preview.html，固定为竖向相纸
  const photoPreviewStyle = {
    padding: '2mm',
    background: 'white',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
    border: '1px solid #ccc',
    boxSizing: 'border-box',
    // 根据相纸尺寸的宽高比计算实际预览尺寸
    ...(() => {
      const aspectRatio = getAspectRatioByName(size);
      // 设置基准高度，然后根据宽高比计算宽度
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

  const imageStyle = {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain'
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
        {isProcessing && (
          <>
            <br />
            <span style={{ color: '#faad14', fontWeight: 'bold' }}>
              🔄 正在处理图片中...
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
          {isProcessing ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#999',
              fontSize: isMobile ? '12px' : '14px'
            }}>
              处理中...
            </div>
          ) : processedImageUrl ? (
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
              fontSize: isMobile ? '12px' : '14px'
            }}>
              图片加载失败
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
};

export default WhiteBorderPreview; 