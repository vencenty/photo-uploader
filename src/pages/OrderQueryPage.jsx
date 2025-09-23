import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, Alert } from 'antd';
import { SearchOutlined, ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { getOrderInfo } from '../services/api';
import { InfoCircleOutlined } from '@ant-design/icons';
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

      // 🚀 修复：根据服务端返回的code判断成功或失败
      if (response.code === 0) {
        // code === 0 表示成功，有订单记录
        message.success({ content: '查询到订单信息', key: 'order-load-success' });
        // 查询成功时跳转到上传页面
        navigate(`/upload?order_sn=${orderSn}`);
      } else {
        // code !== 0 表示失败，直接显示服务端错误信息
        const errorMessage = response.msg || '查询订单失败';
        message.error(errorMessage);

        // 设置错误信息用于显示
        setErrorInfo({
          type: 'server',
          message: errorMessage,
          description: response.msg || '服务端返回错误，请检查订单号是否正确或联系客服'
        });
      }
    } catch (error) {
      console.error('查询订单网络错误:', error);

      // 这里只处理网络错误、超时等异常情况
      message.error(error.message || '查询订单失败');

      // 设置错误信息用于显示
      let errorType = 'network';
      let errorDescription = '网络连接异常，请检查网络后重试';

      if (error.message) {
        if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
          errorType = 'server';
          errorDescription = '服务器暂时不可用，请稍后重试或联系客服';
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
          errorType = 'notfound';
          errorDescription = '接口不存在，请联系技术支持';
        } else if (error.message.includes('timeout') || error.message.includes('超时')) {
          errorType = 'timeout';
          errorDescription = '请求超时，请检查网络连接后重试';
        }
      }

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
        <Alert message={"温馨提示"}
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          description={
            <div>
              <p>
                1. <b style={{ color: 'red' }}>未下单的用户</b>可以用<b style={{ color: 'red' }}>手机号作为订单</b>进行上传。</p>
              <p>2.上传的时候支持
                <b style={{ color: 'red' }}>多次提交</b>，只要输入订单号就可以重新进入进行编辑，确认全部上传完毕后告诉客服开始制作。</p>
              <p>
                3. <b style={{ color: 'red' }}>上传为无损压缩</b>，请放心使用
              </p>
            </div>
          }
        />

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
