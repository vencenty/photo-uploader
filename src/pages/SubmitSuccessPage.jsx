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

  const { total, sizePhotoCount, orderSn, receiver } = state;

  // 处理返回订单详情
  const handleBackToOrder = () => {
    navigate(`/upload?order_sn=${orderSn}`);
  };

  return (
    <div style={{ maxWidth: 800, margin: '24px auto', padding: '0 16px' }}>
      <Result
        icon={<CheckCircleFilled style={{ color: '#52c41a', fontSize: 64 }} />}
        title="上传成功"
        subTitle="请把下图红框区域截图给客服，以便我们核实制作。48小时左右会发货，大促期间可能会略有延迟，请耐心等待~"
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
            返回首页
          </Button>,
        ]}
      />

      <div style={{ border: '10px solid red' }}>
        {/* 基础信息卡片 - 紧凑布局 */}
        <Card
          bordered={false}
          style={{ marginBottom: 16}}
          bodyStyle={{ padding: '16px 24px' }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            flexDirection: 'column',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text type="secondary" style={{ fontSize: '14px' }}>订单号:</Text>
              <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                {orderSn}
              </Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text type="secondary" style={{ fontSize: '14px' }}>收货人:</Text>
              <Text strong style={{ fontSize: '16px' }}>
                {receiver || '未填写'}
              </Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text type="secondary" style={{ fontSize: '14px' }}>照片总数:</Text>
              <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                {total}张
              </Text>
            </div>
          </div>
        </Card>

        {/* 照片统计卡片 */}
        <Card
          title={
            <Space>
              <CheckCircleFilled style={{ color: '#52c41a' }} />
              <span style={{ color: 'red' }}>请将红框区域截图给客服</span>
            </Space>
          }
          bordered={false}
          style={{ marginBottom: 24  }}
        >
          <List
            itemLayout="horizontal"
            dataSource={Object.entries(sizePhotoCount)}
            renderItem={([size, count]) => (
              <List.Item
                style={{
                  padding: '12px 0',
                  borderBottom: '1px solid #f0f0f0'
                }}
              >
                <List.Item.Meta
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong style={{ fontSize: '16px' }}>{size}</Text>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Text
                          strong
                          style={{
                            fontSize: '18px',
                            color: '#52c41a',
                            minWidth: '40px',
                            textAlign: 'right'
                          }}
                        >
                          {count}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '14px' }}>张</Text>
                      </div>
                    </div>
                  }
                  description={
                    <div style={{ marginTop: '4px' }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        规格：{size} • 数量：{count}张
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
            locale={{ emptyText: '暂无照片数据' }}
          />


        </Card>

      </div>

      {/* 重要提醒 */}
      <Alert
        message="重要提醒"
        description={
          <div>
            <p style={{ marginBottom: 8, fontSize: '14px' }}>
              📋 请确保上述规格和数量与您的淘宝订单完全一致。
            </p>
            <p style={{ marginBottom: 8, fontSize: '14px' }}>
              📝 如果您购买了多个尺寸（如：3寸留白-10张，5寸留白-8张），请核对数量是否匹配。
            </p>
            <p style={{ marginBottom: 0, fontSize: '14px' }}>
              ⚠️ 数量不匹配时我们会再次与您确认，可能会影响发货时效。
            </p>
          </div>
        }
        type="warning"
        showIcon
        icon={<ExclamationCircleOutlined />}
        style={{ marginBottom: 24 }}
      />
    </div>
  );
}

export default SubmitSuccessPage;
