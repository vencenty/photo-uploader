import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, Alert } from 'antd';
import { SearchOutlined, ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { getOrderInfo } from '../services/api';

const { Title } = Typography;

function OrderQueryPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [errorInfo, setErrorInfo] = useState(null);
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
    setErrorInfo(null); // 清除之前的错误信息
    
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
        
        // 只有在查询成功时才跳转到上传页面
        navigate(`/upload?order_sn=${orderSn}`);
      } else {
        // 查询失败，不跳转，显示错误信息
        const errorMsg = response.msg || '订单查询失败';
        message.error(`查询失败: ${errorMsg}`);
        
        // 设置错误信息用于显示
        let errorType = 'unknown';
        let errorDescription = '网络连接异常，请检查网络后重试';
        
        if (errorMsg.includes('500') || errorMsg.includes('Internal Server Error')) {
          errorType = 'server';
          errorDescription = '服务器暂时不可用，请稍后重试或联系客服';
        } else if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
          errorType = 'notfound';
          errorDescription = '订单不存在，您可以创建新订单';
        } else if (errorMsg.includes('timeout') || errorMsg.includes('超时')) {
          errorType = 'timeout';
          errorDescription = '请求超时，请检查网络连接后重试';
        }
        
        setErrorInfo({
          type: errorType,
          message: errorMsg,
          description: errorDescription
        });
      }
    } catch (error) {
      console.error('查询订单失败:', error);
      
      // 根据错误类型提供不同的错误信息
      let errorType = 'network';
      let errorDescription = '网络连接失败，请检查网络设置';
      
      if (error.message) {
        if (error.message.includes('timeout') || error.message.includes('超时')) {
          errorType = 'timeout';
          errorDescription = '请求超时，请检查网络连接后重试';
        } else if (error.message.includes('network') || error.message.includes('网络')) {
          errorType = 'network';
          errorDescription = '网络连接失败，请检查网络设置';
        } else if (error.message.includes('fetch')) {
          errorType = 'server';
          errorDescription = '无法连接到服务器，请稍后重试';
        }
      }
      
      message.error(errorDescription);
      setErrorInfo({
        type: errorType,
        message: error.message || '查询订单失败',
        description: errorDescription
      });
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

        {/* 错误信息提示区域 */}
        {errorInfo && (
          <div style={{ marginTop: 16 }}>
            <Alert
              message={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>查询失败</span>
                  <Button
                    type="link"
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      setErrorInfo(null);
                      form.submit();
                    }}
                    style={{ padding: 0, height: 'auto' }}
                  >
                    重试
                  </Button>
                </div>
              }
              description={
                <div>
                  <div style={{ marginBottom: 8 }}>
                    {errorInfo.description}
                  </div>
                  {errorInfo.type === 'server' && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      💡 如果问题持续存在，请联系客服获取帮助
                    </div>
                  )}
                  {errorInfo.type === 'network' && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      💡 请检查网络连接，或尝试刷新页面后重试
                    </div>
                  )}
                  {errorInfo.type === 'timeout' && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      💡 网络较慢，请稍后重试或检查网络设置
                    </div>
                  )}
                  {errorInfo.type === 'notfound' && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      💡 您可以尝试重新输入订单号，或创建新订单
                    </div>
                  )}
                </div>
              }
              type="error"
              showIcon
              icon={<ExclamationCircleOutlined />}
              style={{ 
                borderRadius: '6px',
                border: '1px solid #ffccc7'
              }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

export default OrderQueryPage;
