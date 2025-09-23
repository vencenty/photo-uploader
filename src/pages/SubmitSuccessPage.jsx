import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Result, Button, Card, List, Typography, Statistic,
  Space, Empty, Divider, Row, Col, Alert
} from 'antd';
import {
  CheckCircleFilled, HomeOutlined, ProfileOutlined,
  ArrowRightOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

function SubmitSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = location;
  
  // 如果没有状态数据，可能用户直接访问了此页面
  if (!state) {
    return (
      <Result
        status="warning"
        title="无法显示订单信息"
        subTitle="没有找到订单数据，请返回查询页面"
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            返回订单页面
          </Button>
        }
      />
    );
  }

  const { total, sizePhotoCount, orderSn } = state;

  // 处理返回订单详情
  const handleBackToOrder = () => {
    navigate(`/upload?order_sn=${orderSn}`);
  };

  return (
    <div style={{ maxWidth: 800, margin: '24px auto' }}>
      <Result
        icon={<CheckCircleFilled style={{ color: '#52c41a', fontSize: 64 }} />}
        title="已经收到您的照片"
        subTitle={`订单号: ${orderSn}`}
        extra={[
          <Button 
            type="primary" 
            key="console" 
            icon={<ProfileOutlined />}
            onClick={handleBackToOrder}
          >
            继续提交
          </Button>,
          <Button 
            key="home" 
            icon={<HomeOutlined />}
            onClick={() => navigate('/')}
          >
            确认制作
          </Button>,
        ]}
      />
      
      <Card
        title="上传照片统计"
        bordered={false}
        style={{ marginTop: 24 }}
      >
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Statistic
              title="照片总数"
              value={total}
              suffix="张"
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
        </Row>
        
        <Divider />
        
        <List
          itemLayout="horizontal"
          dataSource={Object.entries(sizePhotoCount)}
          renderItem={([size, count]) => (
            <List.Item 
              extra={
                <Space>
                  <Text strong>{count}</Text>
                  <Text type="secondary">张</Text>
                </Space>
              }
            >
              <List.Item.Meta
                title={size}
              />
            </List.Item>
          )}
        />
      </Card>

      <Alert
        message="重要提醒"
        description={
          <div>
            <p style={{ marginBottom: 8 }}>请确保这里的规格和淘宝订单完全一致。</p>
            <p style={{ marginBottom: 8 }}>如果您拍了多个尺寸，比如 3寸留白-10张，5寸留白-8张。</p>
            <p>请确保这里的数量可以和淘宝订单匹配，数量不匹配我们会再次跟您确认，影响发货时效。</p>
          </div>
        }
        type="error"
        showIcon
        icon={<ExclamationCircleOutlined />}
      />
    </div>
  );
}

export default SubmitSuccessPage;