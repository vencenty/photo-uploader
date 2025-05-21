import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { 
  Form, Input, Button, Card, Typography, message, 
  Checkbox, Row, Col, Space, 
  Modal, Spin, Statistic, Tooltip 
} from 'antd';
import { 
  SaveOutlined, InfoCircleOutlined 
} from '@ant-design/icons';
import { getOrderInfo, submitOrder } from '../services/api';
import PhotoUploader from '../components/PhotoUploader';
import { uploadConfig } from '../config/app.config';

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
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

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
  
  // 修改：改用对象存储每个尺寸的上传状态
  const [uploadingPhotosBySize, setUploadingPhotosBySize] = useState({});
  
  // 计算总上传数
  const totalUploadingPhotos = useMemo(() => {
    return Object.values(uploadingPhotosBySize).reduce((total, count) => total + count, 0);
  }, [uploadingPhotosBySize]);
  
  // 添加表单是否完整有效的状态
  const [formValid, setFormValid] = useState(false);

  // 计算总照片数
  useEffect(() => {
    let total = 0;
    Object.values(sizePhotos).forEach(photos => {
      total += photos.length;
    });
    setTotalPhotos(total);
  }, [sizePhotos]);

  // 查询订单信息（从API获取）
  useEffect(() => {
    const fetchOrderInfo = async () => {
      if (!orderSnFromQuery) return;
      
      setLoadingData(true);
      try {
        // 调用API获取订单信息
        const response = await getOrderInfo(orderSnFromQuery);
        console.log('订单查询结果:', response);
        
        if (response.code === 0) {
          // 设置默认值
          const formData = {
            order_sn: orderSnFromQuery,
            receiver: '',
            remark: ''
          };
          
          // 如果查询到数据，使用返回的数据
          if (response.data) {
            // 根据API返回的数据结构提取所需信息
            formData.receiver = response.data.receiver || '';
            formData.remark = response.data.remark || '';
            
            // 如果有照片数据，设置选中的尺寸和照片
            if (response.data.photos && Array.isArray(response.data.photos)) {
              const newSizePhotos = {};
              const newSelectedSizes = [];
              
              // 处理每种规格的照片
              response.data.photos.forEach(item => {
                if (item.spec && Array.isArray(item.urls) && item.urls.length > 0) {
                  // 添加到选中的尺寸
                  newSelectedSizes.push(item.spec);
                  
                  // 创建照片对象数组
                  newSizePhotos[item.spec] = item.urls.map(url => ({
                    id: uuidv4(),
                    name: url.split('/').pop() || '照片',
                    url: uploadConfig.imageProxyUrl + url,
                    serverUrl: url,
                    status: 'done'
                  }));
                }
              });
              
              // 更新状态
              setSelectedSizes(newSelectedSizes);
              setSizePhotos(newSizePhotos);
            }
            
            message.success('订单信息加载成功');
          } else {
            message.info('未查询到订单信息，将创建新订单');
          }
          
          // 设置到表单
          form.setFieldsValue(formData);
          setOrderInfo(formData);
        } else {
          message.warning(response.msg || '获取订单信息失败');
          // 仍然设置订单号
          form.setFieldsValue({ order_sn: orderSnFromQuery });
          setOrderInfo({ order_sn: orderSnFromQuery, receiver: '', remark: '' });
        }
      } catch (error) {
        console.error('获取订单信息失败:', error);
        message.error('获取订单信息失败，请稍后重试');
        // 出错时仍然设置订单号
        form.setFieldsValue({ order_sn: orderSnFromQuery });
        setOrderInfo({ order_sn: orderSnFromQuery, receiver: '', remark: '' });
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
    
    // 为新选择的尺寸初始化上传计数
    const newUploadingCounts = { ...uploadingPhotosBySize };
    checkedValue.forEach(size => {
      if (newUploadingCounts[size] === undefined) {
        newUploadingCounts[size] = 0;
      }
    });
    
    setUploadingPhotosBySize(newUploadingCounts);
  };

  // 为特定尺寸更新上传计数的处理函数
  const handleUploadingCountChange = (size, countUpdater) => {
    setUploadingPhotosBySize(prev => {
      const currentCount = prev[size] || 0;
      const newCount = typeof countUpdater === 'function' 
        ? countUpdater(currentCount)
        : countUpdater;
      
      const result = {
        ...prev,
        [size]: newCount
      };
      
      // 当上传计数发生变化并且变为0时，手动触发一次表单验证
      // 这有助于解决上传完成后按钮没有启用的问题
      const allFinished = Object.values(result).every(count => count === 0);
      if (allFinished && currentCount > 0 && newCount === 0) {
        // 使用setTimeout确保状态更新后再检查表单有效性
        setTimeout(() => {
          checkFormValidity();
        }, 100);
      }
      
      return result;
    });
  };
  
  // 提取检查表单有效性的函数，以便可以手动调用
  const checkFormValidity = async () => {
    try {
      // 校验表单字段
      await form.validateFields(['order_sn', 'receiver']);
      
      // 检查是否选择了尺寸
      const hasSizes = selectedSizes.length > 0;
      
      // 检查是否有照片
      const hasPhotos = totalPhotos > 0;
      
      // 检查是否有正在上传的照片
      const noUploading = totalUploadingPhotos === 0;
      
      // 检查是否每个已选尺寸都上传了照片
      const allSizesHavePhotos = selectedSizes.every(size => 
        sizePhotos[size] && sizePhotos[size].length > 0
      );
      
      // 显示表单检查结果以便调试
      console.log('表单验证状态(手动检查):', {
        hasSizes,
        hasPhotos,
        noUploading,
        allSizesHavePhotos,
        uploadingPhotosBySize,
        totalUploadingPhotos,
        totalPhotos
      });
      
      // 设置表单有效性
      setFormValid(hasSizes && hasPhotos && noUploading && allSizesHavePhotos);
      
      return hasSizes && hasPhotos && noUploading && allSizesHavePhotos;
    } catch (e) {
      console.error('表单验证失败:', e);
      setFormValid(false);
      return false;
    }
  };

  // 这些函数已移至 PhotoUploader 组件

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
      
      // 检查是否有未上传完的照片
      if (totalUploadingPhotos > 0) {
        message.warning('还有照片正在上传中，请等待上传完成后提交');
        return;
      }
      
      // 检查每个已选尺寸是否都上传了照片
      const emptySelectedSizes = selectedSizes.filter(size => 
        !sizePhotos[size] || sizePhotos[size].length === 0
      );
      
      if (emptySelectedSizes.length > 0) {
        message.warning(`以下尺寸尚未上传照片: ${emptySelectedSizes.join(', ')}`);
        return;
      }
      
      // 打开确认对话框
      setIsModalOpen(true);
    }).catch(errorInfo => {
      console.log('表单验证失败:', errorInfo);
      message.error('表单验证失败，请检查填写的信息');
    });
  };
  
  // 检查表单是否有效
  useEffect(() => {
    console.log('触发表单状态检查，依赖项发生变化');
    checkFormValidity();
  }, [form, selectedSizes, totalPhotos, totalUploadingPhotos, uploadingPhotosBySize, sizePhotos]);
  
  // 确认提交
  const handleConfirmSubmit = async () => {
    setLoading(true);
    try {
      // 准备提交数据 - 按照API文档要求的格式
      const photosArray = [];
      
      // 将图片按尺寸整理，使用服务器返回的URL
      Object.entries(sizePhotos).forEach(([sizeStr, photos]) => {
        if (photos.length > 0) {
          // 从尺寸字符串中提取尺寸信息（如"3寸-满版"）
          // 获取尺寸对应的urls
          const urls = photos.map(photo => photo.serverUrl || photo.url);
          
          // 按API文档格式添加到photos数组
          photosArray.push({
            spec: sizeStr, // 照片规格，例如"3寸-满版"
            urls: urls     // 照片URL数组
          });
        }
      });
      
      // 验证一下数据
      console.log('准备提交订单数据:', {
        order_sn: orderInfo.order_sn,
        receiver: orderInfo.receiver,
        remark: orderInfo.remark,
        photos: photosArray
      });
      
      // 构建要提交的数据 - 格式要符合接口文档
      const submitData = {
        order_sn: orderInfo.order_sn,
        receiver: orderInfo.receiver,
        remark: orderInfo.remark,
        photos: photosArray // 正确的字段名是photos，不是size_photos
      };
      
      // 调用API提交订单
      const response = await submitOrder(submitData);
      
      if (response.code === 0) {
        // 统计每种尺寸的照片数量
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
        
        message.success('订单提交成功');
      } else {
        message.error(response.msg || '订单提交失败');
      }
    } catch (error) {
      console.error('提交订单失败:', error);
      message.error('提交订单失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loadingData} tip="加载订单信息...">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '10px 0' : '20px 0' }}>
        <Title level={isMobile ? 3 : 2}>订单上传</Title>
        
        {/* 订单基本信息 */}
        <Card title="订单信息" style={{ marginBottom: 16 }}>
          <Form
            form={form}
            layout="vertical"
            initialValues={orderInfo}
            onValuesChange={handleValuesChange}
          >
            <Row gutter={isMobile ? 8 : 24}>
              <Col span={isMobile ? 24 : 12}>
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
              <Col span={isMobile ? 24 : 12}>
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
              <TextArea rows={isMobile ? 3 : 4} placeholder="请输入备注信息" />
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
          style={{ marginBottom: 16 }}
        >
          <Checkbox.Group 
            value={selectedSizes}
            onChange={handleSizeToggle}
            style={{ width: '100%' }}
          >
            <Row gutter={[8, 8]}>
              {sizeOptions.map(size => (
                <Col span={isMobile ? 12 : 6} key={size}>
                  <Checkbox value={size}>{size}</Checkbox>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        </Card>
        
        {/* 照片上传区域 */}
        {selectedSizes.length > 0 && (
          <Card title="上传照片" style={{ marginBottom: 16 }}>
            {selectedSizes.map(size => (
              <div key={size} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between', 
                  alignItems: isMobile ? 'flex-start' : 'center', 
                  marginBottom: 16 
                }}>
                  <Title level={4}>{size}</Title>
                  <Text type="secondary">已上传 {sizePhotos[size]?.length || 0} 张</Text>
                </div>
                
                <PhotoUploader 
                  size={size}
                  photos={sizePhotos[size] || []}
                  onPhotosChange={setSizePhotos}
                  uploadingCount={uploadingPhotosBySize[size] || 0}
                  onUploadingCountChange={(countUpdater) => handleUploadingCountChange(size, countUpdater)}
                  isMobile={isMobile}
                />
              </div>
            ))}
          </Card>
        )}
        
        {/* 底部统计和提交 */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row', 
            justifyContent: 'space-between', 
            alignItems: isMobile ? 'center' : 'center',
            gap: isMobile ? '16px' : 0
          }}>
            <Statistic
              title="总上传照片数"
              value={totalPhotos}
              suffix="张"
            />
            
            <Tooltip title={
              !formValid 
                ? totalUploadingPhotos > 0
                  ? "有照片正在上传中，请等待上传完成"
                  : totalPhotos === 0
                    ? "请至少上传一张照片"
                    : selectedSizes.some(size => !sizePhotos[size] || sizePhotos[size].length === 0)
                      ? "每个选中的尺寸都需要上传照片"
                      : "请填写必要的订单信息"
                : ""
            }>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSubmit}
                size={isMobile ? "middle" : "large"}
                loading={totalUploadingPhotos > 0}
                disabled={!formValid}
                block={isMobile}
              >
                {totalUploadingPhotos > 0 ? `正在上传 (${totalUploadingPhotos})` : "提交订单"}
              </Button>
            </Tooltip>
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
          width={isMobile ? '95%' : 520}
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