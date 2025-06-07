import React, { useState, useEffect } from 'react';
import { Alert, Modal, Button, Space } from 'antd';
import { ExclamationCircleOutlined, GlobalOutlined } from '@ant-design/icons';
import { detectBrowserFeatures } from '../utils/errorHandler.js';

const CompatibilityCheck = ({ children }) => {
  const [features, setFeatures] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [criticalIssues, setCriticalIssues] = useState([]);

  useEffect(() => {
    const browserFeatures = detectBrowserFeatures();
    setFeatures(browserFeatures);

    // 检查关键功能
    const issues = [];
    
    if (!browserFeatures.fetch && !browserFeatures.xhr) {
      issues.push('网络请求功能不完整');
    }
    
    if (!browserFeatures.formData) {
      issues.push('文件上传功能不可用');
    }
    
    if (!browserFeatures.localStorage) {
      issues.push('本地存储功能不可用');
    }

    if (!browserFeatures.es6) {
      issues.push('JavaScript版本过旧');
    }

    setCriticalIssues(issues);
    
    // 如果有关键问题，显示警告
    if (issues.length > 0) {
      setShowWarning(true);
    }
  }, []);

  const getBrowserRecommendation = () => {
    const ua = navigator.userAgent.toLowerCase();
    
    if (ua.includes('safari') && !ua.includes('chrome')) {
      return '建议升级到Safari 14或更高版本，或使用Chrome浏览器';
    }
    
    if (ua.includes('baiduboxapp') || ua.includes('baidubrowser')) {
      return '建议使用系统自带浏览器或下载Chrome浏览器以获得更好体验';
    }
    
    if (ua.includes('msie') || ua.includes('trident')) {
      return '建议使用Edge、Chrome或Firefox等现代浏览器';
    }
    
    return '建议使用Chrome、Safari、Firefox或Edge等现代浏览器';
  };

  const handleContinueAnyway = () => {
    setShowWarning(false);
    // 可以在localStorage中记住用户选择
    try {
      localStorage.setItem('compatibility_warning_dismissed', 'true');
    } catch (e) {
      // 忽略localStorage错误
    }
  };

  // 如果没有关键问题，直接渲染子组件
  if (!features || criticalIssues.length === 0) {
    return children;
  }

  return (
    <>
      {children}
      
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            浏览器兼容性提示
          </Space>
        }
        open={showWarning}
        onCancel={handleContinueAnyway}
        footer={[
          <Button key="continue" type="primary" onClick={handleContinueAnyway}>
            我知道了，继续使用
          </Button>
        ]}
        width={500}
        maskClosable={false}
      >
        <div style={{ lineHeight: '1.6' }}>
          <Alert
            message="检测到浏览器兼容性问题"
            description={
              <div>
                <p>您的浏览器可能不完全支持本网站的以下功能：</p>
                <ul style={{ marginBottom: '16px', paddingLeft: '20px' }}>
                  {criticalIssues.map((issue, index) => (
                    <li key={index} style={{ color: '#ff4d4f' }}>{issue}</li>
                  ))}
                </ul>
                <p style={{ marginBottom: '8px' }}>
                  <GlobalOutlined style={{ marginRight: '8px' }} />
                  {getBrowserRecommendation()}
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                  您仍可以继续使用，但可能会遇到功能异常或性能问题。
                </p>
              </div>
            }
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          
          <div style={{ 
            background: '#f6f6f6', 
            padding: '12px', 
            borderRadius: '6px',
            fontSize: '12px',
            color: '#666'
          }}>
            <strong>技术详情：</strong>
            <div style={{ marginTop: '8px' }}>
              Fetch API: {features.fetch ? '✓' : '✗'} | 
              FormData: {features.formData ? '✓' : '✗'} | 
              LocalStorage: {features.localStorage ? '✓' : '✗'} | 
              ES6: {features.es6 ? '✓' : '✗'}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CompatibilityCheck; 