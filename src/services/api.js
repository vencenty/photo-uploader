// API服务配置
//const API_BASE_URL = 'http://localhost:8787';
const API_BASE_URL = 'https://photo-kits-server.vencenty.cc';
// 查询订单信息（POST请求）
export const getOrderInfo = async (orderSn) => {
  try {
    // 根据API文档: https://apifox.com/apidoc/shared/b9e4e427-738a-4ccf-8d03-3570c9c1fe0a/api-294697062
    console.log('查询订单信息:', orderSn);
    
    const response = await fetch(`${API_BASE_URL}/api/order/info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Country': 'CN',
      },
      body: JSON.stringify({
        order_sn: orderSn
      }),
    });

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取订单信息失败:', error);
    throw error;
  }
};

// 上传图片（POST请求）
export const uploadPhoto = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/photo/upload`, {
      method: 'POST',
      body: formData,
      // 上传文件不设置Content-Type，让浏览器自动设置包含boundary的multipart/form-data
    });

    if (!response.ok) {
      throw new Error(`上传失败: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('上传照片失败:', error);
    throw error;
  }
};

// 提交订单（POST请求）
export const submitOrder = async (orderData) => {
  try {
    // 按照API文档格式准备数据
    // API文档: https://apifox.com/apidoc/shared/b9e4e427-738a-4ccf-8d03-3570c9c1fe0a/api-284242927
    const submitData = {
      order_sn: orderData.order_sn,
      receiver: orderData.receiver,
      remark: orderData.remark,
      photos: orderData.photos // 照片数组，包含spec和urls字段
    };
    
    console.log('提交订单数据:', JSON.stringify(submitData));
    
    const response = await fetch(`${API_BASE_URL}/api/order/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submitData)
    });

    if (!response.ok) {
      throw new Error(`提交订单失败: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('提交订单失败:', error);
    throw error;
  }
};
