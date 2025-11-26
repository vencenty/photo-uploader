/**
 * 出血线配置文件
 * 用于满版照片的出血区域提示
 */

export const bleedLineConfig = {
  // 出血线宽度（像素）- PC端
  width: 8,
  
  // 出血线宽度（像素）- 移动端
  mobileWidth: 6,
  
  // 出血线颜色（支持 rgba 格式）
  color: 'rgba(255, 0, 0, 0.5)',
  
  // 安全区域边框颜色
  safeAreaBorderColor: 'rgba(255, 255, 255, 0.9)',
  
  // 安全区域边框宽度
  safeAreaBorderWidth: 2,
  
  // 斜线条纹间距（像素）
  stripeGap: 2,
  
  // 斜线条纹宽度（像素）
  stripeWidth: 2,
};

export default bleedLineConfig;


