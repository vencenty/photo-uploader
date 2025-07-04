import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'antd';
import { getProxiedImageUrl } from '../utils/imageUtils';

/**
 * 满版预览组件
 * 显示满版照片的预览效果（无白边，填满整个相纸）
 */
const FullVersionPreview = ({ 
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

  // 处理图片 - 满版照片通常已经裁剪过，直接显示
  const processImage = () => {
    if (!imageUrl || !visible) return;
    
    setIsProcessing(true);
    console.log("🚀 开始处理满版图片：", imageUrl);
    
    // 满版照片直接使用原图，因为已经裁剪过
    setProcessedImageUrl(getProxiedImageUrl(imageUrl));
    setIsProcessing(false);
    console.log("✅ 满版图片处理完成");
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

  // 相纸样式 - 满版相纸，填满整个区域
  const photoPreviewStyle = {
    padding: '2px', // 很小的padding模拟相纸边缘
    background: 'white',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
    border: '1px solid #ccc',
    boxSizing: 'border-box',
    width: isMobile ? '280px' : '350px',
    height: isMobile ? '370px' : '460px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    margin: '20px auto',
    position: 'relative'
  };

  const imageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover' // 满版使用cover，填满整个区域
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
      bodyStyle={{
        padding: isMobile ? '10px' : '20px',
        textAlign: 'center',
        minHeight: isMobile ? '500px' : '650px'
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
        minHeight: isMobile ? '420px' : '520px',
        padding: '20px 0'
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
        <div>• 满版照片会填满整个相纸区域，无留白边框</div>
        <div>• 建议使用已裁剪调整过的照片以获得最佳效果</div>
        <div>• 此预览展示的是实际打印的满版效果</div>
        <div>• 预览效果仅供参考，实际效果可能因打印设备略有差异</div>
      </div>
    </Modal>
  );
};

export default FullVersionPreview; 