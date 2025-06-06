import React, { useState, useEffect, useRef } from 'react';
import { Card, Statistic, Row, Col, Progress, Tooltip, Button } from 'antd';
import { EyeOutlined, DeleteOutlined, RocketOutlined } from '@ant-design/icons';
import styled from 'styled-components';

const MonitorContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #f0f0f0;
  min-width: 250px;
  
  .monitor-header {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fafafa;
    border-radius: 8px 8px 0 0;
  }
  
  .monitor-content {
    padding: 16px;
  }
  
  .monitor-toggle {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #1890ff;
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
  }
  
  @media (max-width: 768px) {
    position: relative;
    top: auto;
    right: auto;
    margin: 16px;
    min-width: auto;
  }
`;

/**
 * 性能监控组件
 */
const PerformanceMonitor = ({ 
  totalImages = 0, 
  loadedImages = 0,
  visibleImages = 0,
  cacheSize = 0,
  showMonitor = false,
  onToggle = () => {}
}) => {
  const [memoryInfo, setMemoryInfo] = useState(null);
  const [fps, setFps] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const fpsRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  // 监控内存使用情况
  useEffect(() => {
    const updateMemoryInfo = () => {
      if (performance.memory) {
        setMemoryInfo({
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 2000);
    return () => clearInterval(interval);
  }, []);

  // 监控FPS
  useEffect(() => {
    const calculateFPS = (currentTime) => {
      frameCountRef.current++;
      
      if (currentTime - lastTimeRef.current >= 1000) {
        fpsRef.current = Math.round((frameCountRef.current * 1000) / (currentTime - lastTimeRef.current));
        setFps(fpsRef.current);
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
      }
      
      requestAnimationFrame(calculateFPS);
    };
    
    const animationId = requestAnimationFrame(calculateFPS);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // 计算加载进度
  const loadProgress = totalImages > 0 ? Math.round((loadedImages / totalImages) * 100) : 0;
  
  // 计算内存使用率
  const memoryUsage = memoryInfo ? Math.round((memoryInfo.used / memoryInfo.limit) * 100) : 0;

  // 清理缓存
  const clearCache = () => {
    if (window.gc) {
      window.gc();
    }
    // 触发垃圾回收建议
    if (performance.measureUserAgentSpecificMemory) {
      performance.measureUserAgentSpecificMemory();
    }
  };

  if (!showMonitor) {
    return (
      <Button
        className="monitor-toggle"
        onClick={onToggle}
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 1000
        }}
      >
        <EyeOutlined />
      </Button>
    );
  }

  return (
    <MonitorContainer>
      <Button
        className="monitor-toggle"
        onClick={onToggle}
      >
        ×
      </Button>
      
      <div className="monitor-header">
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          <RocketOutlined /> 性能监控
        </span>
        <Button
          type="text"
          size="small"
          onClick={() => setIsMinimized(!isMinimized)}
        >
          {isMinimized ? '展开' : '收起'}
        </Button>
      </div>
      
      {!isMinimized && (
        <div className="monitor-content">
          <Row gutter={[16, 16]}>
            {/* 图片加载统计 */}
            <Col span={24}>
              <Card size="small" title="图片加载">
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic 
                      title="总数" 
                      value={totalImages}
                      valueStyle={{ fontSize: 14 }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="已加载" 
                      value={loadedImages}
                      valueStyle={{ fontSize: 14, color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="可见" 
                      value={visibleImages}
                      valueStyle={{ fontSize: 14, color: '#1890ff' }}
                    />
                  </Col>
                </Row>
                <Progress 
                  percent={loadProgress}
                  size="small"
                  style={{ marginTop: 8 }}
                  strokeColor="#52c41a"
                />
              </Card>
            </Col>

            {/* 性能指标 */}
            <Col span={24}>
              <Card size="small" title="性能指标">
                <Row gutter={16}>
                  <Col span={12}>
                    <Tooltip title="页面帧率，60fps为最佳">
                      <Statistic 
                        title="FPS" 
                        value={fps}
                        valueStyle={{ 
                          fontSize: 14,
                          color: fps >= 50 ? '#52c41a' : fps >= 30 ? '#faad14' : '#ff4d4f'
                        }}
                      />
                    </Tooltip>
                  </Col>
                  <Col span={12}>
                    <Tooltip title="图片缓存数量">
                      <Statistic 
                        title="缓存" 
                        value={cacheSize}
                        valueStyle={{ fontSize: 14 }}
                      />
                    </Tooltip>
                  </Col>
                </Row>
              </Card>
            </Col>

            {/* 内存使用 */}
            {memoryInfo && (
              <Col span={24}>
                <Card 
                  size="small" 
                  title="内存使用"
                  extra={
                    <Tooltip title="强制垃圾回收">
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<DeleteOutlined />}
                        onClick={clearCache}
                      >
                        清理
                      </Button>
                    </Tooltip>
                  }
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Statistic 
                        title="已用" 
                        value={`${memoryInfo.used}MB`}
                        valueStyle={{ fontSize: 12 }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic 
                        title="总计" 
                        value={`${memoryInfo.total}MB`}
                        valueStyle={{ fontSize: 12 }}
                      />
                    </Col>
                  </Row>
                  <Progress 
                    percent={memoryUsage}
                    size="small"
                    style={{ marginTop: 8 }}
                    strokeColor={
                      memoryUsage > 80 ? '#ff4d4f' : 
                      memoryUsage > 60 ? '#faad14' : '#52c41a'
                    }
                  />
                  <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                    限制: {memoryInfo.limit}MB
                  </div>
                </Card>
              </Col>
            )}
          </Row>
        </div>
      )}
    </MonitorContainer>
  );
};

export default PerformanceMonitor; 