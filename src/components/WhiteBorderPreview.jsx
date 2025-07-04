import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'antd';
import { getProxiedImageUrl } from '../utils/imageUtils';


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

  // 处理图片 - 参考 photo-preview.html 逻辑
  const processImage = () => {
    if (!imageUrl || !visible) return;
    
    setIsProcessing(true);
    console.log("🚀 开始处理图片：", imageUrl);
    
    const image = new Image();
    // 尝试设置跨域，如果失败则忽略
    try {
      image.crossOrigin = 'anonymous';
    } catch (e) {
      console.log("跨域设置失败，继续处理");
    }
    
    image.onload = () => {
      try {
        const w = image.naturalWidth || image.width;
        const h = image.naturalHeight || image.height;
        
        console.log("🖼️ 图片加载成功！原始尺寸：", w, "x", h);
        console.log("📐 宽高比：", (w/h).toFixed(2), w > h ? "（横图，需要旋转）" : "（竖图，直接显示）");
        
        if (w > h) {
          console.log("🔄 开始旋转横图...");
          
          // 横图需要旋转成竖图（参考 photo-preview.html 逻辑）
          const canvas = document.createElement("canvas");
          canvas.width = h;  // 旋转后宽度是原高度
          canvas.height = w; // 旋转后高度是原宽度
          const ctx = canvas.getContext("2d");
          
          console.log("🎨 Canvas尺寸：", canvas.width, "x", canvas.height);
          
          // 移动到画布中心
          ctx.translate(h / 2, w / 2);
          // 顺时针旋转90度
          ctx.rotate(Math.PI / 2);
          // 绘制图片
          ctx.drawImage(image, -w / 2, -h / 2, w, h);
          
          // 转换为 data URL
          const rotatedImageUrl = canvas.toDataURL("image/jpeg", 0.95);
          setProcessedImageUrl(rotatedImageUrl);
          console.log("✅ 横图旋转完成！");
        } else {
          console.log("📱 竖图直接显示，无需处理");
          // 竖图直接使用原图
          setProcessedImageUrl(imageUrl);
        }
        
        setIsProcessing(false);
      } catch (error) {
        console.error("❌ 图片处理出错：", error);
        // 出错时使用原图
        setProcessedImageUrl(imageUrl);
        setIsProcessing(false);
      }
    };
    
    image.onerror = (error) => {
      console.error("❌ 图片加载失败：", error);
      console.log("📷 尝试直接使用原图URL");
      setProcessedImageUrl(imageUrl); // 失败时使用原图
      setIsProcessing(false);
    };
    
    console.log("📥 设置图片源并开始加载...");
    image.src = getProxiedImageUrl(imageUrl);
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
    padding: '4mm',
    background: 'white',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
    border: '1px solid #ccc',
    boxSizing: 'border-box',
    // 参考photo-preview.html的尺寸比例，但适配屏幕大小
    width: isMobile ? '240px' : '300px',
    height: isMobile ? '340px' : '425px', // 保持89:127的比例
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    margin: '20px auto',
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
        <div>• 实际打印时会保留白边效果，图片不会被裁切</div>
        <div>• 系统已自动将横图调整为竖向显示，模拟真实打印效果</div>
        <div>• 此预览完全模拟打印机的处理方式</div>
        <div>• 预览效果仅供参考，实际效果可能因打印设备略有差异</div>
      </div>
    </Modal>
  );
};

export default WhiteBorderPreview; 