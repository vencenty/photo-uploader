import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout, theme } from 'antd';
import OrderQueryPage from './pages/OrderQueryPage';
import OrderUploadPage from './pages/OrderUploadPage';
import SubmitSuccessPage from './pages/SubmitSuccessPage';

const { Content, Footer } = Layout;

function App() {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  
  // 跟踪屏幕宽度
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    
    // 防止iOS Safari地址栏变化导致的高度问题
    const handleOrientationChange = () => {
      setTimeout(() => {
        setWindowWidth(window.innerWidth);
      }, 100);
    };
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // 判断是否是移动设备
  const isMobile = windowWidth < 768;

  return (
      <Layout className="layout" style={{ 
        minHeight: '100vh',
        background: '#ffffff' // 使用白色背景，去掉灰色边距感
      }}>
      <Content style={{ 
        padding: 0, // 完全去掉padding
        overflowX: 'hidden',
        // 移动端优化
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100vh' // 占满整个视口高度
      }}>
        <div
          style={{
            background: colorBgContainer,
            minHeight: '100vh',
            padding: isMobile ? '16px' : '20px', // 只保留内容的内边距
            // 移动端优化
            flex: 1,
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
            width: '100%'
          }}
        >
          <Routes>
            <Route path="/" element={<OrderQueryPage />} />
            <Route path="/upload" element={<OrderUploadPage />} />
            <Route path="/success" element={<SubmitSuccessPage />} />
          </Routes>
        </div>
      </Content>
      <Footer style={{ 
        textAlign: 'center',
        background: '#ffffff',
        width: '100%',
        padding: isMobile ? '12px 16px' : '16px 20px',
        color: '#666',
        fontSize: isMobile ? '12px' : '14px',
        borderTop: '1px solid #f0f0f0'
      }}>
        照片上传系统 ©{new Date().getFullYear()} 
      </Footer>
    </Layout>
  );
}

export default App;