import React, { useState, useEffect } from 'react';
import { Alert, Modal, Button, Typography, Space } from 'antd';
import { ExclamationCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { getBrowserInfo, getCompatibilityAdvice } from '../utils/browserDetect.js';
import { checkBrowserSupport } from '../utils/polyfills.js';

const { Text, Paragraph } = Typography;

const CompatibilityWarning = () => {
  const [visible, setVisible] = useState(false);
  const [browserInfo, setBrowserInfo] = useState(null);
  const [compatibility, setCompatibility] = useState(null);
  const [advice, setAdvice] = useState(null);

  useEffect(() => {
    // 检查浏览器信息
    const info = getBrowserInfo();
    const support = checkBrowserSupport();
    const compatAdvice = getCompatibilityAdvice();

    setBrowserInfo(info);
    setCompatibility(support);
    setAdvice(compatAdvice);

    // 如果有兼容性问题，显示警告
    if (compatAdvice && compatAdvice.type === 'error') {
      setVisible(true);
    }

    // 检查关键功能支持
    const criticalFeatures = ['fetch', 'formData', 'promise'];
    const hasIssues = criticalFeatures.some(feature => !support[feature]);
    
    if (hasIssues) {
      setVisible(true);
    }
  }, []);

  const handleClose = () => {
    setVisible(false);
    // 记住用户的选择，避免重复提示
    localStorage.setItem('compatibility_warning_dismissed', 'true');
  };

  const getFeatureStatus = (feature) => {
    if (!compatibility) return null;
    return compatibility[feature] ? (
      <Text type="success">
        <CheckCircleOutlined /> 支持
      </Text>
    ) : (
      <Text type="danger">
        <CloseCircleOutlined /> 不支持
      </Text>
    );
  };

  const copyCurrentUrl = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      Modal.success({
        title: '链接已复制',
        content: '请在其他浏览器中打开此链接'
      });
    }).catch(() => {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      Modal.success({
        title: '链接已复制',
        content: '请在其他浏览器中打开此链接'
      });
    });
  };

  if (!browserInfo || !compatibility) return null;

  return (
    <>
      {/* 顶部警告栏 */}
      {advice && advice.type !== 'error' && (
        <Alert
          message={advice.message}
          type={advice.type}
          showIcon
          closable
          action={
            advice.action === '复制链接' && (
              <Button size="small" onClick={copyCurrentUrl}>
                复制链接
              </Button>
            )
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 兼容性详情弹窗 */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            浏览器兼容性警告
          </Space>
        }
        open={visible}
        onCancel={handleClose}
        footer={[
          <Button key="copy" onClick={copyCurrentUrl}>
            复制链接到其他浏览器
          </Button>,
          <Button key="continue" type="primary" onClick={handleClose}>
            继续使用
          </Button>
        ]}
        width={600}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {advice && (
            <Alert
              message={advice.message}
              type={advice.type}
              showIcon
            />
          )}

          <div>
            <Paragraph strong>当前浏览器信息：</Paragraph>
            <Text>
              {browserInfo.name} {browserInfo.version} 
              {browserInfo.isMobile && ' (移动端)'}
              {browserInfo.isIOS && ' (iOS)'}
              {browserInfo.isAndroid && ' (Android)'}
            </Text>
          </div>

          <div>
            <Paragraph strong>功能支持情况：</Paragraph>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>网络请求 (Fetch):</Text>
                {getFeatureStatus('fetch')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>文件上传 (FormData):</Text>
                {getFeatureStatus('formData')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>异步处理 (Promise):</Text>
                {getFeatureStatus('promise')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>ES6语法:</Text>
                {getFeatureStatus('es6')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>异步函数 (Async/Await):</Text>
                {getFeatureStatus('asyncAwait')}
              </div>
            </Space>
          </div>

          <div>
            <Paragraph strong>建议：</Paragraph>
            <ul>
              <li>使用 Chrome 58+ 或 Safari 11+ 浏览器</li>
              <li>如果在微信中打开，建议复制链接到系统浏览器</li>
              <li>确保浏览器版本是最新的</li>
              <li>如果功能异常，请尝试刷新页面</li>
            </ul>
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default CompatibilityWarning; 