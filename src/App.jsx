import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, theme, Button, Drawer } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import OrderQueryPage from './pages/OrderQueryPage';
import OrderUploadPage from './pages/OrderUploadPage';
import SubmitSuccessPage from './pages/SubmitSuccessPage';
import CompatibilityCheck from './components/CompatibilityCheck';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

function App() {
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  
  // 控制移动端菜单显示
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
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

  // 根据当前路径设置选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/') return ['1'];
    if (path === '/upload') return ['2'];
    if (path === '/success') return ['3'];
    return ['1'];
  };

  // 菜单项配置
  const menuItems = [
    {
      key: '1',
      label: <Link to="/">订单查询</Link>,
    },
    {
      key: '2',
      label: <Link to="/upload">订单上传</Link>,
    }
  ];

  // 关闭抽屉菜单
  const closeMenu = () => {
    setMobileMenuVisible(false);
  };

  return (
    <CompatibilityCheck>
      <Layout className="layout" style={{ minHeight: '100vh' }}>
        <Header style={{ 
          display: 'flex', 
          alignItems: 'center',
          padding: isMobile ? '0 15px' : '0 50px',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          width: '100%',
          // 移动端优化
          minHeight: isMobile ? '56px' : '64px',
          height: isMobile ? '56px' : '64px',
          // 防止点击时的高亮效果
          WebkitTapHighlightColor: 'transparent'
        }}>
        <div className="logo" style={{ marginRight: isMobile ? 'auto' : '18px' }}>照片上传系统</div>
        
        {isMobile ? (
          <>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuVisible(true)}
              style={{ 
                color: 'white',
                minHeight: '44px',
                minWidth: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            />
            <Drawer
              title="菜单"
              placement="right"
              onClose={closeMenu}
              open={mobileMenuVisible}
              styles={{ body: { padding: 0 } }}
            >
              <Menu
                theme="light"
                mode="vertical"
                defaultSelectedKeys={['1']}
                selectedKeys={getSelectedKey()}
                items={menuItems}
                onClick={closeMenu}
                style={{ borderRight: 'none' }}
              />
            </Drawer>
          </>
        ) : (
          <Menu
            theme="dark"
            mode="horizontal"
            defaultSelectedKeys={['1']}
            selectedKeys={getSelectedKey()}
            items={menuItems}
            style={{ flex: 1, minWidth: 0 }}
          />
        )}
      </Header>
      <Content style={{ 
        padding: isMobile ? '0 15px' : '0 50px', 
        marginTop: '16px',
        overflowX: 'hidden',
        // 移动端优化
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div
          style={{
            background: colorBgContainer,
            minHeight: 280,
            padding: isMobile ? 16 : 24,
            borderRadius: borderRadiusLG,
            // 移动端优化
            flex: 1,
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <Routes>
            <Route path="/" element={<OrderQueryPage />} />
            <Route path="/upload" element={<OrderUploadPage />} />
            <Route path="/success" element={<SubmitSuccessPage />} />
          </Routes>
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        照片上传系统 ©{new Date().getFullYear()} 
      </Footer>
    </Layout>
    </CompatibilityCheck>
  );
}

export default App;