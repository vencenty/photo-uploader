import React, { useState } from 'react';
import { 
  Modal, Button, Card, Row, Col, Typography, Tag, Space, 
  Image, Divider, Checkbox, message, Tooltip 
} from 'antd';
import { 
  WarningOutlined, DeleteOutlined, EyeOutlined, 
  InfoCircleOutlined, CheckCircleOutlined 
} from '@ant-design/icons';

const { Text, Title } = Typography;

/**
 * 重复图片检测结果展示弹窗
 */
const DuplicatePhotosModal = ({ 
  visible, 
  onClose, 
  detectionResults, 
  onDeletePhotos,
  isMobile = false 
}) => {
  const [selectedPhotos, setSelectedPhotos] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // 如果没有检测结果，不显示弹窗
  if (!detectionResults || !detectionResults.hasDuplicates) {
    return null;
  }

  // 处理照片选择
  const handlePhotoSelect = (photoId, checked) => {
    const newSelected = new Set(selectedPhotos);
    if (checked) {
      newSelected.add(photoId);
    } else {
      newSelected.delete(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  // 处理组内照片选择（保留第一张，选择其余的）
  const handleGroupSelect = (group, checked) => {
    const newSelected = new Set(selectedPhotos);
    
    // 跳过第一张照片，选择/取消选择其余的
    for (let i = 1; i < group.photos.length; i++) {
      const photoId = group.photos[i].id;
      if (checked) {
        newSelected.add(photoId);
      } else {
        newSelected.delete(photoId);
      }
    }
    
    setSelectedPhotos(newSelected);
  };

  // 智能选择：每组保留第一张，选择其余的
  const handleSmartSelect = () => {
    const newSelected = new Set();
    
    detectionResults.details.forEach(sizeDetail => {
      sizeDetail.groups.forEach(group => {
        // 跳过第一张照片，选择其余的
        for (let i = 1; i < group.photos.length; i++) {
          newSelected.add(group.photos[i].id);
        }
      });
    });
    
    setSelectedPhotos(newSelected);
    message.success(`已选择 ${newSelected.size} 张重复照片`);
  };

  // 清除所有选择
  const handleClearSelection = () => {
    setSelectedPhotos(new Set());
  };

  // 删除选中的照片
  const handleDeleteSelected = async () => {
    if (selectedPhotos.size === 0) {
      message.warning('请先选择要删除的照片');
      return;
    }

    setIsDeleting(true);
    try {
      await onDeletePhotos(Array.from(selectedPhotos));
      message.success(`已删除 ${selectedPhotos.size} 张重复照片`);
      setSelectedPhotos(new Set());
      onClose();
    } catch (error) {
      console.error('删除照片失败:', error);
      message.error('删除照片失败，请重试');
    } finally {
      setIsDeleting(false);
    }
  };

  // 渲染单个照片卡片
  const renderPhotoCard = (photo, isFirst = false, groupIndex, photoIndex) => {
    const isSelected = selectedPhotos.has(photo.id);
    
    return (
      <Col span={isMobile ? 12 : 8} key={photo.id}>
        <Card
          size="small"
          className={isSelected ? 'selected-photo' : ''}
          style={{
            border: isSelected ? '2px solid #ff4d4f' : '1px solid #d9d9d9',
            backgroundColor: isFirst ? '#f6ffed' : '#fff'
          }}
          cover={
            <div style={{ position: 'relative' }}>
              <Image
                src={photo.serverUrl || photo.url}
                alt={photo.name}
                style={{ 
                  width: '100%', 
                  height: isMobile ? '80px' : '100px', 
                  objectFit: 'cover' 
                }}
                preview={{
                  mask: <EyeOutlined />
                }}
              />
              
              {/* 第一张照片标识 */}
              {isFirst && (
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  left: '4px',
                  background: '#52c41a',
                  color: '#fff',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  保留
                </div>
              )}
              
              {/* 相似度标识 */}
              {photo.similarity && photo.similarity < 1 && (
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  color: '#fff',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px'
                }}>
                  {(photo.similarity * 100).toFixed(0)}%
                </div>
              )}
            </div>
          }
          actions={[
            !isFirst ? (
              <Checkbox
                key="select"
                checked={isSelected}
                onChange={(e) => handlePhotoSelect(photo.id, e.target.checked)}
              >
                选择删除
              </Checkbox>
            ) : (
              <Tag key="keep" color="green" icon={<CheckCircleOutlined />}>
                建议保留
              </Tag>
            )
          ]}
        >
          <Card.Meta
            title={
              <div style={{ fontSize: isMobile ? '12px' : '14px' }}>
                {photo.name}
              </div>
            }
            description={
              <div style={{ fontSize: isMobile ? '10px' : '12px' }}>
                <div>数量: {photo.quantity || 1} 张</div>
                {photo.similarity && photo.similarity < 1 && (
                  <div style={{ color: '#faad14' }}>
                    相似度: {(photo.similarity * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            }
          />
        </Card>
      </Col>
    );
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <WarningOutlined style={{ color: '#faad14' }} />
          <span>重复图片检测结果</span>
          <Tag color="orange">
            {detectionResults.totalGroups} 组 / {detectionResults.totalPhotos} 张
          </Tag>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={isMobile ? '95%' : 1000}
      style={{ top: isMobile ? 20 : 40 }}
      footer={[
        <div key="footer" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          width: '100%'
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button size="small" onClick={handleSmartSelect}>
              智能选择
            </Button>
            <Button size="small" onClick={handleClearSelection}>
              清除选择
            </Button>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              已选择 {selectedPhotos.size} 张
            </Text>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={onClose}>
              关闭
            </Button>
            <Button 
              type="primary" 
              danger
              icon={<DeleteOutlined />}
              loading={isDeleting}
              disabled={selectedPhotos.size === 0}
              onClick={handleDeleteSelected}
            >
              删除选中 ({selectedPhotos.size})
            </Button>
          </div>
        </div>
      ]}
    >
      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {/* 检测摘要 */}
        <div style={{
          background: '#fff7e6',
          border: '1px solid #ffd591',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <InfoCircleOutlined style={{ color: '#faad14' }} />
            <Text strong>检测摘要</Text>
          </div>
          <Text style={{ fontSize: '14px', lineHeight: '1.6' }}>
            {detectionResults.summary}
          </Text>
          
          <Divider style={{ margin: '12px 0 8px 0' }} />
          
          <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
            <div>💡 <strong>建议操作：</strong></div>
            <div>• 每组重复图片中，第一张标记为"保留"，其余可选择删除</div>
            <div>• 点击"智能选择"可自动选择建议删除的照片</div>
            <div>• 相同照片设置多次打印不算重复，无需删除</div>
          </div>
        </div>

        {/* 按规格显示重复图片 */}
        {detectionResults.details.map((sizeDetail, sizeIndex) => (
          <div key={sizeDetail.size} style={{ marginBottom: '24px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <Title level={4} style={{ margin: 0 }}>
                {sizeDetail.size}
              </Title>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Tag color="red">
                  {sizeDetail.groupCount} 组重复
                </Tag>
                <Tag color="orange">
                  {sizeDetail.photoCount} 张照片
                </Tag>
              </div>
            </div>

            {/* 显示每组重复图片 */}
            {sizeDetail.groups.map((group, groupIndex) => (
              <div key={groupIndex} style={{ 
                marginBottom: '20px',
                padding: '16px',
                background: '#fafafa',
                borderRadius: '8px',
                border: '1px solid #f0f0f0'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Text strong>重复组 {groupIndex + 1}</Text>
                    <Text type="secondary">
                      ({group.photos.length} 张照片)
                    </Text>
                    {group.maxSimilarity && (
                      <Tag color="blue">
                        最高相似度: {(group.maxSimilarity * 100).toFixed(1)}%
                      </Tag>
                    )}
                  </div>
                  
                  <Tooltip title="选择此组中除第一张外的所有照片">
                    <Checkbox
                      indeterminate={
                        group.photos.slice(1).some(p => selectedPhotos.has(p.id)) &&
                        !group.photos.slice(1).every(p => selectedPhotos.has(p.id))
                      }
                      checked={group.photos.slice(1).every(p => selectedPhotos.has(p.id))}
                      onChange={(e) => handleGroupSelect(group, e.target.checked)}
                    >
                      选择组
                    </Checkbox>
                  </Tooltip>
                </div>

                <Row gutter={[12, 12]}>
                  {group.photos.map((photo, photoIndex) => 
                    renderPhotoCard(photo, photoIndex === 0, groupIndex, photoIndex)
                  )}
                </Row>
              </div>
            ))}
          </div>
        ))}
      </div>

      <style jsx>{`
        .selected-photo {
          box-shadow: 0 2px 8px rgba(255, 77, 79, 0.3) !important;
        }
      `}</style>
    </Modal>
  );
};

export default DuplicatePhotosModal;
