import React, { useState, useCallback, useMemo, useTransition } from 'react';
import { 
  Modal, Button, Card, Row, Col, Typography, Tag, Space, 
  Image, Divider, Checkbox, message, Tooltip 
} from 'antd';
import { 
  WarningOutlined, DeleteOutlined, EyeOutlined, 
  InfoCircleOutlined, CheckCircleOutlined 
} from '@ant-design/icons';
import { getCompressedImageUrl } from '../config/photo';

const { Text, Title } = Typography;

// 🚀 性能优化：预计算选中状态，避免重复计算
const useOptimizedSelection = (detectionResults, selectedPhotos) => {
  return useMemo(() => {
    if (!detectionResults) return { totalSelectable: 0, selectedCount: selectedPhotos.size };
    
    let totalSelectable = 0;
    detectionResults.details.forEach(sizeDetail => {
      sizeDetail.groups.forEach(group => {
        // 跳过第一张照片（保留照片）
        totalSelectable += group.photos.length - 1;
      });
    });
    
    return {
      totalSelectable,
      selectedCount: selectedPhotos.size,
      isAllSelected: selectedPhotos.size === totalSelectable && totalSelectable > 0
    };
  }, [detectionResults, selectedPhotos.size]);
};

// 🚀 优化：将PhotoCard组件提取到外部，避免重复创建
const PhotoCard = React.memo(({ photo, isFirst, isSelected, onSelect, isMobile }) => (
  <Col span={isMobile ? 12 : 8}>
    <Card
      size="small"
      className={isSelected ? 'selected-photo' : ''}
      style={{
        border: isSelected ? '2px solid #ff4d4f' : '1px solid #d9d9d9',
        backgroundColor: isFirst ? '#f6ffed' : '#fff',
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'all 0.2s ease'
      }}
      cover={
        <div style={{ 
          position: 'relative',
          width: '100%',
          height: isMobile ? '80px' : '100px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa',
          overflow: 'hidden'
        }}>
          <Image
            src={getCompressedImageUrl(photo.serverUrl || photo.url, 'duplicate')}
            alt={photo.name}
            style={{ 
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
            preview={false} // 🚀 优化：禁用预览减少DOM事件监听
            placeholder={
              <div style={{ 
                width: '100%', 
                height: isMobile ? '80px' : '100px',
                background: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999'
              }}>
                加载中...
              </div>
            }
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
        </div>
      }
      actions={[
        <div key="action" style={{ textAlign: 'center', width: '100%' }}>
          {!isFirst ? (
            <Checkbox
              checked={isSelected}
              onChange={(e) => onSelect(photo.id, e.target.checked)}
              style={{ fontSize: isMobile ? '12px' : '14px' }}
            >
              <span style={{ color: isSelected ? '#ff4d4f' : '#666' }}>
                选择删除
              </span>
            </Checkbox>
          ) : (
            <Tag color="green" icon={<CheckCircleOutlined />} style={{ margin: 0 }}>
              建议保留
            </Tag>
          )}
        </div>
      ]}
    >
      <Card.Meta
        title={
          <div style={{ 
            fontSize: isMobile ? '12px' : '14px',
            textAlign: 'center',
            fontWeight: '500',
            color: '#333',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {photo.name}
          </div>
        }
        description={
          <div style={{ 
            fontSize: isMobile ? '10px' : '12px',
            textAlign: 'center',
            color: '#666'
          }}>
            <div>数量: {photo.quantity || 1} 张</div>
          </div>
        }
      />
    </Card>
  </Col>
));

// 设置组件显示名称，便于调试
PhotoCard.displayName = 'PhotoCard';

// 🚀 优化：将DuplicateGroup组件提取到外部，避免重复创建
const DuplicateGroup = React.memo(({ group, groupIndex, selectedPhotos, onGroupSelect, renderPhotoCard }) => {
  const isIndeterminate = group.photos.slice(1).some(p => selectedPhotos.has(p.id)) &&
                         !group.photos.slice(1).every(p => selectedPhotos.has(p.id));
  const isAllSelected = group.photos.slice(1).every(p => selectedPhotos.has(p.id));
  
  return (
    <div style={{ 
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
        </div>
        
        <Checkbox
          indeterminate={isIndeterminate}
          checked={isAllSelected}
          onChange={(e) => onGroupSelect(group, e.target.checked)}
        >
          选择组
        </Checkbox>
      </div>

      <Row gutter={[12, 12]} justify="start" align="middle">
        {group.photos.map((photo, photoIndex) => 
          renderPhotoCard(photo, photoIndex === 0, groupIndex, photoIndex)
        )}
      </Row>
    </div>
  );
});

// 设置组件显示名称，便于调试
DuplicateGroup.displayName = 'DuplicateGroup';

/**
 * 重复图片检测结果展示弹窗
 * 
 * 🚀 性能优化特性：
 * 1. 使用React 18的并发特性(useTransition)避免阻塞UI
 * 2. 使用React.memo防止不必要的组件重新渲染
 * 3. 使用useCallback和useMemo缓存计算结果
 * 4. 批量状态更新，减少渲染次数
 * 5. 预计算选择状态，避免重复计算
 * 6. 分离组件逻辑，提高可维护性
 * 
 * 适用场景：大量重复照片(100+)的快速选择操作
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
  const [isPending, startTransition] = useTransition();
  
  // 🚀 使用优化的选择状态计算
  const selectionStats = useOptimizedSelection(detectionResults, selectedPhotos);

  // 🚀 修复：将所有Hooks放在组件顶部，在任何条件判断之前
  const handlePhotoSelect = useCallback((photoId, checked) => {
    setSelectedPhotos(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(photoId);
      } else {
        newSelected.delete(photoId);
      }
      return newSelected;
    });
  }, []);

  const handleGroupSelect = useCallback((group, checked) => {
    setSelectedPhotos(prev => {
      const newSelected = new Set(prev);
      
      // 跳过第一张照片，选择/取消选择其余的
      for (let i = 1; i < group.photos.length; i++) {
        const photoId = group.photos[i].id;
        if (checked) {
          newSelected.add(photoId);
        } else {
          newSelected.delete(photoId);
        }
      }
      
      return newSelected;
    });
  }, []);



  // 🚀 优化：缓存照片卡片渲染函数
  const renderPhotoCard = useCallback((photo, isFirst = false, groupIndex, photoIndex) => {
    const isSelected = selectedPhotos.has(photo.id);
    
    return (
      <PhotoCard
        key={photo.id}
        photo={photo}
        isFirst={isFirst}
        isSelected={isSelected}
        onSelect={handlePhotoSelect}
        isMobile={isMobile}
      />
    );
  }, [selectedPhotos, isMobile, handlePhotoSelect]);

  // 🚀 优化：智能选择使用批量更新和并发特性，避免卡顿
  const handleSmartSelect = useCallback(() => {
    // 使用 startTransition 将状态更新标记为非紧急，避免阻塞UI
    startTransition(() => {
      const newSelected = new Set();
      
      // 🚀 优化：预先计算所有需要选择的照片ID，减少循环嵌套
      const photoIdsToSelect = [];
      
      detectionResults.details.forEach(sizeDetail => {
        sizeDetail.groups.forEach(group => {
          // 跳过第一张照片，选择其余的
          for (let i = 1; i < group.photos.length; i++) {
            photoIdsToSelect.push(group.photos[i].id);
          }
        });
      });
      
      // 🚀 批量添加到Set中，减少状态更新次数
      photoIdsToSelect.forEach(id => newSelected.add(id));
      
      // 单次状态更新，避免多次渲染
      setSelectedPhotos(newSelected);
      
      // 延迟显示成功消息，避免阻塞状态更新
      setTimeout(() => {
        message.success(`已选择 ${newSelected.size} 张重复照片`);
      }, 0);
    });
  }, [detectionResults]);

  // 🚀 优化：清除所有选择使用并发特性
  const handleClearSelection = useCallback(() => {
    startTransition(() => {
      setSelectedPhotos(new Set());
    });
  }, []);

  // 🚀 优化：删除选中的照片使用useCallback
  const handleDeleteSelected = useCallback(async () => {
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
  }, [selectedPhotos.size, onDeletePhotos, onClose]);

  // 🚀 优化：计算统计信息时使用useMemo缓存
  const statistics = useMemo(() => {
    if (!detectionResults) return { totalGroups: 0, totalPhotos: 0 };
    return {
      totalGroups: detectionResults.totalGroups,
      totalPhotos: detectionResults.totalPhotos
    };
  }, [detectionResults]);

  // 🚀 条件渲染检查：如果没有检测结果，不显示弹窗
  if (!detectionResults || !detectionResults.hasDuplicates) {
    return null;
  }



  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <WarningOutlined style={{ color: '#faad14' }} />
          <span>重复图片检测结果</span>
          <Tag color="orange">
            {statistics.totalGroups} 组 / {statistics.totalPhotos} 张
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
            <Button 
              size="small" 
              onClick={handleSmartSelect}
              loading={isPending}
              disabled={isPending || selectionStats.isAllSelected}
            >
              {isPending ? '选择中...' : selectionStats.isAllSelected ? '已全选' : '全选'}
            </Button>
            <Button 
              size="small" 
              onClick={handleClearSelection}
              disabled={isPending || selectedPhotos.size === 0}
            >
              清除选择
            </Button>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              已选择 {selectionStats.selectedCount} / {selectionStats.totalSelectable} 张
            </Text>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
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
      <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0 4px' }}> {/* 🚀 减少padding */}
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

        {/* 🚀 优化：使用分批渲染减少DOM节点，提升性能 */}
        <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
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

              {/* 🚀 优化：使用React.memo的重复组组件 */}
              {sizeDetail.groups.map((group, groupIndex) => (
                <DuplicateGroup
                  key={`${sizeDetail.size}-${groupIndex}`}
                  group={group}
                  groupIndex={groupIndex}
                  selectedPhotos={selectedPhotos}
                  onGroupSelect={handleGroupSelect}
                  renderPhotoCard={renderPhotoCard}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .selected-photo {
          box-shadow: 0 4px 12px rgba(255, 77, 79, 0.4) !important;
          transform: translateY(-2px);
        }
        .selected-photo:hover {
          box-shadow: 0 6px 16px rgba(255, 77, 79, 0.5) !important;
        }
      `}</style>
    </Modal>
  );
};

export default DuplicatePhotosModal;
