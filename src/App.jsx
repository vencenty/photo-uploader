import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, theme } from 'antd';
import OrderQueryPage from './pages/OrderQueryPage';
import OrderUploadPage from './pages/OrderUploadPage';
import SubmitSuccessPage from './pages/SubmitSuccessPage';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

function App() {
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 根据当前路径设置选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/') return ['1'];
    if (path === '/upload') return ['2'];
    if (path === '/success') return ['3'];
    return ['1'];
  };

  return (
    <Layout className="layout" style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <div className="logo">照片上传系统</div>
        <Menu
          theme="dark"
          mode="horizontal"
          defaultSelectedKeys={['1']}
          selectedKeys={getSelectedKey()}
          items={[
            {
              key: '1',
              label: <Link to="/">订单查询</Link>,
            },
            {
              key: '2',
              label: <Link to="/upload">订单上传</Link>,
            }
          ]}
        />
      </Header>
      <Content style={{ padding: '0 50px', marginTop: '16px' }}>
        <div
          style={{
            background: colorBgContainer,
            minHeight: 280,
            padding: 24,
            borderRadius: borderRadiusLG,
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
  );
}

export default App;