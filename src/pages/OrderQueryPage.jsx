import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getOrderInfo } from '../services/api';

const { Title } = Typography;

function OrderQueryPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const navigate = useNavigate();

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 判断是否是移动设备
  const isMobile = windowWidth < 768;

  const handleQuery = async (values) => {
    const { orderSn } = values;

    if (!orderSn?.trim()) {
      message.error('请输入订单号');
      return;
    }

    setLoading(true);
    try {
      // 调用实际API获取订单信息
      const response = await getOrderInfo(orderSn);

      if (response.code === 0) {
        // 根据查询结果处理
        if (response.data) {
          // 有订单记录，带上订单信息跳转
          message.success('查询到订单信息');
        } else {
          // 没有订单记录，仅带订单号跳转
          message.info('未查询到订单信息，将创建新订单');
        }
      } else {
        message.warning(response.msg || '订单查询结果异常');
      }

      // 无论是否查到都跳转到上传页面
      navigate(`/upload?order_sn=${orderSn}`);
    } catch (error) {
      console.error('查询订单失败:', error);
      message.error('查询订单失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: isMobile ? '20px' : '50px',
      padding: isMobile ? '0 10px' : 0
    }}>
      <Card
        style={{
          width: isMobile ? '100%' : 500,
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          borderRadius: '8px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={isMobile ? 3 : 2}>订单查询</Title>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleQuery}
          autoComplete="off"
        >
          <Form.Item
            name="orderSn"
            label="订单号"
            rules={[{ required: true, message: '请输入订单号' }]}
          >
            <Input
              placeholder="请输入淘宝订单号"
              size={isMobile ? 'middle' : 'large'}
              allowClear
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size={isMobile ? 'middle' : 'large'}
              loading={loading}
              icon={<SearchOutlined />}
            >
              查询订单
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default OrderQueryPage;
