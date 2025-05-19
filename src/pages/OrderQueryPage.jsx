import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Title } = Typography;

function OrderQueryPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleQuery = async (values) => {
    const { orderSn } = values;
    
    if (!orderSn?.trim()) {
      message.error('请输入订单号');
      return;
    }
    
    setLoading(true);
    try {
      // 这里模拟API调用，实际项目中应该使用真实API
      // const response = await fetch(`/api/order/info?order_sn=${orderSn}`);
      // const data = await response.json();
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 跳转到上传页面，并传递订单号
      navigate(`/upload?order_sn=${orderSn}`);
    } catch (error) {
      console.error('查询订单失败:', error);
      message.error('查询订单失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '50px' }}>
      <Card style={{ width: 500, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2}>订单查询</Title>
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
              placeholder="请输入订单号"
              size="large"
              allowClear
            />
          </Form.Item>
          
          <Form.Item style={{ marginTop: 24 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              size="large"
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