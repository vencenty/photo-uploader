import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { getSizeOptions } from '../config/photo';

const { Title, Text } = Typography;
const { TextArea } = Input;

// 支持的尺寸选项 - 从配置文件获取
const sizeOptions = getSizeOptions();

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
  const calcTotalUploading = useCallback(() => {
    console.log("计算总上传数:", uploadingPhotosBySize);
    return Object.values(uploadingPhotosBySize).reduce((total, count) => total + count, 0);
  }, [uploadingPhotosBySize]);

  // 计算总照片数
  useEffect(() => {
    let total = 0;
    Object.entries(sizePhotos).forEach(([size, photos]) => {
      // 只统计选中尺寸的照片
      if (selectedSizes.includes(size)) {
        total += photos.length;
      }
    });
    setTotalPhotos(total);
  }, [sizePhotos, selectedSizes]);

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
    // 获取已取消选择的尺寸
    const unselectedSizes = selectedSizes.filter(size => !checkedValue.includes(size));

    setSelectedSizes(checkedValue);

    // 为新选择的尺寸初始化照片数组
    const newSizePhotos = { ...sizePhotos };

    // 移除已取消选择的尺寸的照片
    unselectedSizes.forEach(size => {
      delete newSizePhotos[size];
    });

    // 为新选择的尺寸初始化照片数组
    checkedValue.forEach(size => {
      if (!newSizePhotos[size]) {
        newSizePhotos[size] = [];
      }
    });

    setSizePhotos(newSizePhotos);

    // 为新选择的尺寸初始化上传计数
    const newUploadingCounts = { ...uploadingPhotosBySize };

    // 移除已取消选择的尺寸的上传计数
    unselectedSizes.forEach(size => {
      delete newUploadingCounts[size];
    });

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

      console.log(`上传计数更新 [${size}]: ${currentCount} -> ${newCount}`, result);

      // 无论计数如何变化，都立即触发检查
      // 使用较短的超时确保状态及时更新
      setTimeout(() => {
        // 检查是否所有上传都已完成
        const allFinished = Object.values(result).every(count => count === 0);
        console.log('所有上传是否完成:', allFinished);

        // 计算总上传数
        const total = Object.values(result).reduce((sum, count) => sum + count, 0);
        console.log('当前总上传数:', total);
      }, 50);

      return result;
    });
  };

  // 实际执行提交验证的函数
  const actualSubmit = () => {
    // 防止重复提交 - 如果已经在加载状态则不处理
    if (loading) {
      message.info('正在处理，请稍候...');
      return;
    }

    form.validateFields().then(values => {
      // 检查基本表单字段
      if (!orderInfo.order_sn) {
        message.error('请输入订单号');
        return;
      }

      if (!orderInfo.receiver) {
        message.error('请输入收货人');
        return;
      }

      // 检查是否有照片
      if (totalPhotos === 0) {
        message.error('请至少上传一张照片');
        return;
      }

      // 检查是否有未上传完的照片
      const currentTotalUploading = calcTotalUploading();
      if (currentTotalUploading > 0) {
        message.warning('还有照片正在上传中，请等待上传完成后提交');
        return;
      }

      // 打开确认对话框
      setIsModalOpen(true);
    }).catch(errorInfo => {
      console.log('表单验证失败:', errorInfo);
      message.error('表单验证失败，请检查填写的信息');
    });
  };

  // 提交订单前验证
  const handleSubmit = () => {
    // 直接执行提交验证
    actualSubmit();
  };

  // 确认提交
  const handleConfirmSubmit = async () => {
    setLoading(true);
    try {
      // 准备提交数据 - 按照API文档要求的格式
      const photosArray = [];

      // 将图片按尺寸整理，使用服务器返回的URL
      Object.entries(sizePhotos).forEach(([sizeStr, photos]) => {
        // 确保只处理选中的尺寸
        if (selectedSizes.includes(sizeStr) && photos.length > 0) {
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
        photos: photosArray
      };

      // 调用API提交订单
      const response = await submitOrder(submitData);

      if (response.code === 0) {
        // 统计每种尺寸的照片数量
        const sizePhotoCount = {};
        Object.entries(sizePhotos).forEach(([size, photos]) => {
          // 只统计选中的尺寸
          if (selectedSizes.includes(size)) {
            sizePhotoCount[size] = photos.length;
          }
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
        // 处理各种错误情况
        setIsModalOpen(false); // 无论什么错误都先关闭对话框

        if (response.code === -1 && response.msg && response.msg.includes('订单已经进入处理流程')) {
          // 订单已进入处理流程的特殊错误
          Modal.error({
            title: '订单无法修改',
            content: response.msg || '订单已经进入处理流程，无法重新上传图片，如有疑问请联系客服',
            okText: '知道了'
          });
        } else {
          // 其他错误
          message.error(response.msg || '订单提交失败');
        }
      }
    } catch (error) {
      console.error('提交订单失败:', error);

      // 关闭确认对话框
      setIsModalOpen(false);

      // 处理错误情况
      if (error.response && error.response.data) {
        // API返回了错误信息
        const errorData = error.response.data;

        if (errorData.code === -1 && errorData.msg && errorData.msg.includes('订单已经进入处理流程')) {
          // 订单已进入处理流程的特殊错误
          Modal.error({
            title: '订单无法修改',
            content: errorData.msg || '订单已经进入处理流程，无法重新上传图片，如有疑问请联系客服',
            okText: '知道了'
          });
        } else {
          // 其他API错误
          message.error(errorData.msg || '订单提交失败');
        }
      } else if (error.message && error.message.includes('Network Error')) {
        // 网络错误
        Modal.error({
          title: '网络连接错误',
          content: '提交订单时网络连接异常，请检查网络后重试',
          okText: '知道了'
        });
      } else {
        // 其他未知错误
        message.error('提交订单失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loadingData} tip="加载订单信息...">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '10px 0' : '20px 0' }}>
        <Title level={isMobile ? 3 : 2}>订单上传</Title>

        {/* 温馨提示 */}
        <div style={{ 
          background: '#fff2f0', 
          border: '1px solid #ffccc7', 
          borderRadius: '6px', 
          padding: '12px 16px',
          marginBottom: '20px',
          fontSize: isMobile ? '12px' : '14px',
          lineHeight: '1.6'
        }}>
          <div style={{ 
            fontWeight: 'bold', 
            color: '#ff4d4f', 
            marginBottom: '8px',
            fontSize: isMobile ? '13px' : '15px'
          }}>
            📋 温馨提示：
          </div>
          <div style={{ color: '#ff4d4f', marginBottom: '6px' }}>
            1. 用此链接上传照片全部为原图上传
          </div>
          <div style={{ color: '#ff4d4f' }}>
            2. 【满版照片和拍立得尺寸照片】请您一定要点击照片进行裁剪，若不裁剪系统会默认按照照片居中进行裁切（会影响出片效果）。另外裁剪请留好构图空间，不要人物或者肢体紧贴画面边缘，满版照片输出四周会有2-3mm的出血线被裁切。
          </div>
        </div>

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
              calcTotalUploading() > 0
                ? "有照片正在上传中，请等待上传完成"
                : totalPhotos === 0
                  ? "请至少上传一张照片"
                  : !orderInfo.order_sn
                    ? "请输入订单号"
                    : !orderInfo.receiver
                      ? "请输入收货人"
                      : selectedSizes.length === 0
                        ? "请至少选择一种尺寸"
                        : ""
            }>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSubmit}
                size={isMobile ? "middle" : "large"}
                loading={calcTotalUploading() > 0}
                disabled={!orderInfo.order_sn || !orderInfo.receiver }
                block={isMobile}
              >
                {calcTotalUploading() > 0 ? `正在上传 (${calcTotalUploading()})` : "提交订单"}
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
