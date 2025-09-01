
// 照片尺寸配置
export const PHOTO = [
    {
      "name": "3寸-留白",
      "aspectRatio": 5/7,
      "recommendResize": false,
    },
    {
      "name": "3寸-满版",
      "aspectRatio": 5/7,
      "recommendResize": true,
    },
    {
      "name": "4寸-留白",
      "aspectRatio": 3/4,
      "recommendResize": false
    },
    {
      "name": "4寸-满版",
      "aspectRatio": 3/4,
      "recommendResize": true
    },
    {
      "name": "5寸-满版",
      "aspectRatio": 7/10,
      "recommendResize": true
    },
    {
      "name": "5寸-留白",
      "aspectRatio": 7/10,
      "recommendResize": false
    },
    {
      "name": "大5寸-满版",
      "aspectRatio": 3/4,
      "recommendResize": true
    },
    {
      "name": "大5寸-留白",
      "aspectRatio": 3/4,
      "recommendResize": false
    },
    {
      "name": "6寸-满版",
      "aspectRatio": 2/3,
      "recommendResize": true
    },
    {
      "name": "6寸-留白",
      "aspectRatio": 2/3,
      "recommendResize": false
    },
    {
      "name": "大6寸-满版",
      "aspectRatio": 3/4,
      "recommendResize": true
    },
    {
      "name": "大6寸-留白",
      "aspectRatio": 3/4,
      "recommendResize": false
    },
    {
      "name": "7寸-满版",
      "aspectRatio": 5/7,
      "recommendResize": true
    },
    {
      "name": "7寸-留白",
      "aspectRatio": 5/7,
      "recommendResize": false
    },
    {
      "name": "8寸-满版",
      "aspectRatio": 3/4,
      "recommendResize": true
    },
    {
      "name": "8寸-留白",
      "aspectRatio": 3/4,
      "recommendResize": false
    },
    {
      "name": "10寸-满版",
      "aspectRatio": 4/5,
      "recommendResize": true
    },
    {
      "name": "10寸-留白",
      "aspectRatio": 4/5
    },
    {
      "name": "A4-满版",
      "aspectRatio": 1/1.414,
      "recommendResize": true
    },
    {
      "name": "A4-留白",
      "aspectRatio": 1/1.414
    },

    {
      "name": "3寸-留白-正方形",
      "aspectRatio": 1/1.0001,
      "recommendResize": true,
    },
    {
      "name": "3寸-满版-正方形",
      "aspectRatio": 1/1.0001,
      "recommendResize": true,
    },
    {
      "name": "4寸-留白-正方形",
      "aspectRatio": 1/1.0001,
      "recommendResize": true,
    },
    {
      "name": "4寸-满版-正方形",
      "aspectRatio": 1/1.0001,
      "recommendResize": true,
    },
    {
      "name": "5寸-留白-正方形",
      "aspectRatio": 1/1.0001,
      "recommendResize": true,
    },
    {
      "name": "5寸-满版-正方形",
      "aspectRatio": 1/1.0001,
      "recommendResize": true,
    },
    {
      "name": "6寸-留白-正方形",
      "aspectRatio": 1/1.0001,
      "recommendResize": true,
    },
    {
      "name": "6寸-满版-正方形",
      "aspectRatio": 1/1.0001,
      "recommendResize": true,
    },
    {
      "name": "8寸-留白-正方形",
      "aspectRatio": 1/1.0001,
      "recommendResize": true,
    },
    {
      "name": "8寸-满版-正方形",
      "aspectRatio": 1/1.0001,
      "recommendResize": true,
    },
  ]

// 获取所有尺寸选项名称，用于尺寸选择
export const getSizeOptions = () => {
  return PHOTO.map(item => item.name);
};

// 通过尺寸名称获取宽高比
export const getAspectRatioByName = (name) => {
  const found = PHOTO.find(item => item.name === name);
  return found ? found.aspectRatio : 1;
};

// 🚀 图片压缩配置 - 用于缩略图快速加载
export const IMAGE_COMPRESSION = {
  // 列表页缩略图压缩参数
  thumbnail: '?x-oss-process=image/resize,w_720/quality,q_50',
  
  // 重复检测弹窗缩略图压缩参数  
  duplicate: '?x-oss-process=image/resize,w_400/quality,q_60',
  
  // 预览图压缩参数（如果需要）
  preview: '?x-oss-process=image/resize,w_1200/quality,q_80',
  
  // 不压缩（用于裁剪等需要原图的场景）
  original: ''
};

// 🚀 获取压缩后的图片URL
export const getCompressedImageUrl = (url, compressionType = 'thumbnail') => {
  if (!url || typeof url !== 'string') return url;
  
  // 如果已经有压缩参数，先移除
  const baseUrl = url.split('?x-oss-process=')[0];
  
  // 根据压缩类型添加相应参数
  const compression = IMAGE_COMPRESSION[compressionType];
  return compression ? `${baseUrl}${compression}` : baseUrl;
};
