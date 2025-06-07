// API服务配置
// const API_BASE_URL = 'http://localhost:8787';
const API_BASE_URL = 'https://photo-kits-server.vencenty.cc';

// 导入错误处理工具
import { 
  getUserFriendlyErrorMessage, 
  withErrorBoundary,
  safeJsonStringify 
} from '../utils/errorHandler.js';

// Fetch polyfill检查和兼容性处理
const isFetchSupported = typeof fetch !== 'undefined';

// 兼容性的请求函数
const makeRequest = async (url, options = {}) => {
  // 如果支持fetch，使用fetch
  if (isFetchSupported) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      console.warn('Fetch请求失败，尝试备用方法:', error);
      // 如果fetch失败，fallback到XMLHttpRequest
    }
  }
  
  // 使用XMLHttpRequest作为后备
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const method = options.method || 'GET';
    
    xhr.open(method, url, true);
    
    // 设置请求头
    if (options.headers) {
      Object.keys(options.headers).forEach(key => {
        xhr.setRequestHeader(key, options.headers[key]);
      });
    }
    
    // 处理响应
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        const response = {
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          statusText: xhr.statusText,
          json: async function() {
            try {
              return JSON.parse(xhr.responseText);
            } catch (e) {
              throw new Error('JSON解析失败');
            }
          },
          text: async function() {
            return xhr.responseText;
          }
        };
        
        resolve(response);
      }
    };
    
    xhr.onerror = function() {
      reject(new Error('网络请求失败'));
    };
    
    xhr.ontimeout = function() {
      reject(new Error('请求超时'));
    };
    
    // 设置超时
    xhr.timeout = 30000; // 30秒超时
    
    // 发送请求
    if (options.body) {
      xhr.send(options.body);
    } else {
      xhr.send();
    }
  });
};

// 查询订单信息（POST请求）
export const getOrderInfo = withErrorBoundary(async (orderSn) => {
  // 根据API文档: https://apifox.com/apidoc/shared/b9e4e427-738a-4ccf-8d03-3570c9c1fe0a/api-294697062
  console.log('查询订单信息:', orderSn);
  
  const response = await makeRequest(`${API_BASE_URL}/api/order/info`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Country': 'CN',
    },
    body: safeJsonStringify({
      order_sn: orderSn
    }),
  });

  if (!response.ok) {
    const errorMessage = `请求失败: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data;
}, async (orderSn) => {
  // 错误降级方案
  console.warn('订单信息查询失败，返回默认值');
  return {
    code: -1,
    msg: '查询订单信息失败，请检查网络连接后重试',
    data: null
  };
});

// 上传图片（POST请求）
export const uploadPhoto = withErrorBoundary(async (file) => {
  // 检查FormData支持
  if (typeof FormData === 'undefined') {
    throw new Error('您的浏览器不支持文件上传功能，请使用更新版本的浏览器');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await makeRequest(`${API_BASE_URL}/api/photo/upload`, {
    method: 'POST',
    body: formData,
    // 上传文件不设置Content-Type，让浏览器自动设置包含boundary的multipart/form-data
  });

  if (!response.ok) {
    const errorMessage = `上传失败: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data;
}, async (file) => {
  // 错误降级方案
  console.warn('照片上传失败，返回错误信息');
  return {
    code: -1,
    msg: '照片上传失败，请检查网络连接或文件格式后重试',
    data: null
  };
});

// 提交订单（POST请求）
export const submitOrder = withErrorBoundary(async (orderData) => {
  // 按照API文档格式准备数据
  // API文档: https://apifox.com/apidoc/shared/b9e4e427-738a-4ccf-8d03-3570c9c1fe0a/api-284242927
  const submitData = {
    order_sn: orderData.order_sn,
    receiver: orderData.receiver,
    remark: orderData.remark,
    photos: orderData.photos // 照片数组，包含spec和metadata字段
  };
  
  console.log('提交订单数据:', safeJsonStringify(submitData));
  
  const response = await makeRequest(`${API_BASE_URL}/api/order/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: safeJsonStringify(submitData)
  });

  if (!response.ok) {
    const errorMessage = `提交订单失败: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data;
}, async (orderData) => {
  // 错误降级方案
  console.warn('订单提交失败，返回错误信息');
  return {
    code: -1,
    msg: '订单提交失败，请检查网络连接后重试',
    data: null
  };
});
