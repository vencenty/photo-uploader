
// 照片尺寸配置
export const PHOTO = [
    {
      "name": "3寸-满版",
      "aspectRatio": 5/7,
      "need_resize": true
    },
    {
      "name": "3寸-留白",
      "aspectRatio": 5/7,
      "need_resize": false,
    },
    {
    "name": "3寸-拍立得",
    "aspectRatio": 64/55.4,
    "need_resize": true,
    },
    {
      "name": "4寸-满版",
      "aspectRatio": 3/4,
      "need_resize": true
    },
    {
      "name": "4寸-留白",
      "aspectRatio": 3/4,
      "need_resize": false
    },
    {
      "name": "5寸-满版",
      "aspectRatio": 7/10,
      "need_resize": true
    },
    {
      "name": "5寸-留白",
      "aspectRatio": 7/10,
      "need_resize": false
    },
    {
      "name": "6寸-满版",
      "aspectRatio": 2/3,
      "need_resize": true
    },
    {
      "name": "6寸-留白",
      "aspectRatio": 2/3,
      "need_resize": false
    },
    {
      "name": "7寸-满版",
      "aspectRatio": 5/7,
      "need_resize": true
    },
    {
      "name": "7寸-留白",
      "aspectRatio": 5/7,
      "need_resize": false
    },
    {
      "name": "8寸-满版",
      "aspectRatio": 3/4,
      "need_resize": true
    },
    {
      "name": "8寸-留白",
      "aspectRatio": 3/4,
      "need_resize": false
    },
    {
      "name": "10寸-满版",
      "aspectRatio": 4/5,
      "need_resize": true
    },
    {
      "name": "10寸-留白",
      "aspectRatio": 4/5
    },
    {
      "name": "12寸-满版",
      "aspectRatio": 1/1.414,
      "need_resize": true
    },
    {
      "name": "12寸-留白",
      "aspectRatio": 1/1.414
    }
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
