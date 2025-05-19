import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Form, Input, Button, Card, Typography, message, 
  Checkbox, Row, Col, Upload, Divider, Space, 
  Modal, Spin, Statistic, Tooltip 
} from 'antd';
import { 
  UploadOutlined, DeleteOutlined, SaveOutlined, 
  PictureOutlined, InfoCircleOutlined 
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

// 支持的尺寸选项
const sizeOptions = [
  '3寸-满版', '3寸-留白',
  '4寸-满版', '4寸-留白',
  '5寸-满版', '5寸-留白',
  '6寸-满版', '6寸-留白',
  '7寸-满版', '7寸-留白',
  '8寸-满版', '8寸-留白',
  '10寸-满版', '10寸-留白',
  '12寸-满版', '12寸-留白'
];

function OrderUploadPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const orderSnFromQuery = queryParams.get('order_sn') || '';
  
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // 订单信息状态
  const [orderInfo, setOrderInfo] = useState({
    order_sn: orderSnFromQuery,
    receiver: '',
    remark: ''
  });

  // 选中的尺寸状态
  const [selectedSizes, setSelectedSizes] = useState([]);

  // 每个尺寸对应的照片状态
  const [sizePhotos, setSizePhotos] = useState({});

  // 总照片数
  const [totalPhotos, setTotalPhotos] = useState(0);
  
  // 提交订单确认对话框
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 计算总照片数
  useEffect(() => {
    let total = 0;
    Object.values(sizePhotos).forEach(photos => {
      total += photos.length;
    });
    setTotalPhotos(total);
  }, [sizePhotos]);

  // 查询订单信息（实际项目中需要从API获取）
  useEffect(() => {
    const fetchOrderInfo = async () => {
      if (!orderSnFromQuery) return;
      
      setLoadingData(true);
      try {
        // 这里模拟API调用
        // const response = await fetch(`/api/order/info?order_sn=${orderSnFromQuery}`);
        // const data = await response.json();
        
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 如果查询到数据，设置到表单
        form.setFieldsValue({
          order_sn: orderSnFromQuery,
          receiver: '',
          remark: ''
        });
        
        setOrderInfo({
          order_sn: orderSnFromQuery,
          receiver: '',
          remark: ''
        });
        
        message.success('订单信息加载成功');
      } catch (error) {
        console.error('获取订单信息失败:', error);
        message.error('获取订单信息失败，请稍后重试');
      } finally {
        setLoadingData(false);
      }
    };
    
    fetchOrderInfo();
  }, [orderSnFromQuery, form]);

  // 处理表单值变化
  const handleValuesChange = (changedValues, allValues) => {
    setOrderInfo(prev => ({
      ...prev,
      ...changedValues
    }));
  };

  // 处理尺寸选择
  const handleSizeToggle = (checkedValue) => {
    setSelectedSizes(checkedValue);
    
    // 为新选择的尺寸初始化照片数组
    const newSizePhotos = { ...sizePhotos };
    checkedValue.forEach(size => {
      if (!newSizePhotos[size]) {
        newSizePhotos[size] = [];
      }
    });
    
    setSizePhotos(newSizePhotos);
  };

  // 处理照片上传的自定义操作
  const customRequest = (size) => async (options) => {
    const { file, onSuccess, onError } = options;
    
    try {
      // 这里只是模拟上传，实际项目中需要调用API上传
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newPhoto = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        url: URL.createObjectURL(file),
        status: 'done',
        originFileObj: file
      };
      
      setSizePhotos(prev => ({
        ...prev,
        [size]: [...(prev[size] || []), newPhoto]
      }));
      
      onSuccess();
    } catch (error) {
      console.error('上传照片失败:', error);
      message.error(`${file.name} 上传失败`);
      onError();
    }
  };

  // 删除照片
  const handleDeletePhoto = (size, photoId) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这张照片吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        setSizePhotos(prev => ({
          ...prev,
          [size]: prev[size].filter(photo => photo.id !== photoId)
        }));
        message.success('照片已删除');
      }
    });
  };

  // 预览照片
  const handlePreview = (photo) => {
    Modal.info({
      title: photo.name,
      width: 700,
      content: (
        <div style={{ textAlign: 'center' }}>
          <img 
            alt={photo.name} 
            src={photo.url} 
            style={{ maxWidth: '100%', maxHeight: '500px' }} 
          />
        </div>
      ),
      okText: '关闭'
    });
  };

  // 提交订单前验证
  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (selectedSizes.length === 0) {
        message.error('请至少选择一种尺寸');
        return;
      }
      
      if (totalPhotos === 0) {
        message.error('请至少上传一张照片');
        return;
      }
      
      // 打开确认对话框
      setIsModalOpen(true);
    }).catch(errorInfo => {
      console.log('表单验证失败:', errorInfo);
    });
  };
  
  // 确认提交
  const handleConfirmSubmit = async () => {
    setLoading(true);
    try {
      // 实际项目中需要调用API提交订单
      // const response = await fetch('/api/order/submit', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     order_sn: orderInfo.order_sn,
      //     receiver: orderInfo.receiver,
      //     remark: orderInfo.remark,
      //     photos: sizePhotos
      //   })
      // });
      // const data = await response.json();
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 这里模拟成功响应
      const sizePhotoCount = {};
      Object.entries(sizePhotos).forEach(([size, photos]) => {
        sizePhotoCount[size] = photos.length;
      });

      // 关闭对话框
      setIsModalOpen(false);
      
      // 跳转到成功页面
      navigate('/success', { 
        state: { 
          total: totalPhotos,
          sizePhotoCount,
          orderSn: orderInfo.order_sn
        } 
      });
    } catch (error) {
      console.error('提交订单失败:', error);
      message.error('提交订单失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loadingData} tip="加载订单信息...">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 0' }}>
        <Title level={2}>订单上传</Title>
        
        {/* 订单基本信息 */}
        <Card title="订单信息" style={{ marginBottom: 24 }}>
          <Form
            form={form}
            layout="vertical"
            initialValues={orderInfo}
            onValuesChange={handleValuesChange}
          >
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item 
                  name="order_sn" 
                  label="订单号"
                  rules={[{ required: true, message: '请输入订单号' }]}
                >
                  <Input 
                    placeholder="请输入订单号" 
                    disabled={!!orderSnFromQuery}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="receiver" 
                  label="收货人"
                  rules={[{ required: true, message: '请输入收货人' }]}
                >
                  <Input placeholder="请输入收货人" />
                </Form.Item>
              </Col>
            </Row>
            
            <Form.Item 
              name="remark" 
              label="备注"
            >
              <TextArea rows={4} placeholder="请输入备注信息" />
            </Form.Item>
          </Form>
        </Card>
        
        {/* 尺寸选择 */}
        <Card 
          title={
            <Space>
              <span>选择尺寸</span>
              <Tooltip title="请至少选择一种尺寸，可多选">
                <InfoCircleOutlined style={{ color: '#1890ff' }} />
              </Tooltip>
            </Space>
          } 
          style={{ marginBottom: 24 }}
        >
          <Checkbox.Group 
            value={selectedSizes}
            onChange={handleSizeToggle}
            style={{ width: '100%' }}
          >
            <Row gutter={[16, 16]}>
              {sizeOptions.map(size => (
                <Col span={6} key={size}>
                  <Checkbox value={size}>{size}</Checkbox>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        </Card>
        
        {/* 照片上传区域 */}
        {selectedSizes.length > 0 && (
          <Card title="上传照片" style={{ marginBottom: 24 }}>
            {selectedSizes.map(size => (
              <div key={size} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Title level={4}>{size}</Title>
                  <Text type="secondary">已上传 {sizePhotos[size]?.length || 0} 张</Text>
                </div>
                
                <Upload
                  listType="picture-card"
                  accept="image/*"
                  multiple
                  customRequest={customRequest(size)}
                  showUploadList={false}
                >
                  <div>
                    <PictureOutlined />
                    <div style={{ marginTop: 8 }}>上传照片</div>
                  </div>
                </Upload>
                
                {/* 照片预览区域 */}
                {sizePhotos[size]?.length > 0 && (
                  <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    {sizePhotos[size].map(photo => (
                      <Col key={photo.id} xs={12} sm={8} md={6} lg={4}>
                        <Card
                          hoverable
                          cover={
                            <img
                              alt={photo.name}
                              src={photo.url}
                              style={{ height: 120, objectFit: 'cover' }}
                              onClick={() => handlePreview(photo)}
                            />
                          }
                          actions={[
                            <DeleteOutlined key="delete" onClick={() => handleDeletePhoto(size, photo.id)} />
                          ]}
                          bodyStyle={{ padding: '8px', textAlign: 'center' }}
                        >
                          <Card.Meta description={
                            <Text ellipsis style={{ fontSize: 12 }}>{photo.name}</Text>
                          } />
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
              </div>
            ))}
          </Card>
        )}
        
        {/* 底部统计和提交 */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Statistic
              title="总上传照片数"
              value={totalPhotos}
              suffix="张"
            />
            
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSubmit}
              size="large"
              disabled={totalPhotos === 0}
            >
              提交订单
            </Button>
          </div>
        </Card>
        
        {/* 提交确认对话框 */}
        <Modal
          title="确认提交订单"
          open={isModalOpen}
          onOk={handleConfirmSubmit}
          onCancel={() => setIsModalOpen(false)}
          okText="确认提交"
          cancelText="取消"
          confirmLoading={loading}
        >
          <p>您确定要提交此订单吗？</p>
          <Statistic title="照片总数" value={totalPhotos} suffix="张" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">点击确认后，订单将被提交处理</Text>
          </div>
        </Modal>
      </div>
    </Spin>
  );
}

export default OrderUploadPage;