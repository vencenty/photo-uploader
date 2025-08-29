/**
 * 重复图片检测工具
 * 基于服务端返回的SHA1哈希进行重复检测，支持同规格内检测
 * 优化版本：使用服务端SHA1，避免客户端重复计算，性能极佳
 * 
 * 性能优势：
 * - 无需下载图片进行客户端计算
 * - 直接字符串比较，O(1)复杂度
 * - SHA1准确性高，避免误判
 * - 支持大量图片的快速检测
 */

/**
 * 从照片对象中提取唯一标识符
 * 优先使用服务端返回的SHA1，确保准确性和性能
 * @param {Object} photo - 照片对象
 * @returns {string} 唯一标识符
 */
const getPhotoUniqueId = (photo) => {
  // 优先级1: 服务端返回的SHA1哈希值（最准确）
  if (photo.sha1) {
    return photo.sha1;
  }
  
  // 优先级2: 服务端返回的MD5哈希值
  if (photo.md5) {
    return photo.md5;
  }
  
  // 优先级3: 服务端返回的其他哈希值
  if (photo.hash) {
    return photo.hash;
  }
  
  // 优先级4: 从URL中提取SHA1（如果URL包含哈希值）
  if (photo.serverUrl || photo.url) {
    const url = photo.serverUrl || photo.url;
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      
      // 查找URL中的SHA1哈希值（40个字符的十六进制字符串）
      const sha1Match = filename.match(/[a-f0-9]{40}/i);
      if (sha1Match) {
        return sha1Match[0].toLowerCase();
      }
      
      // 如果文件名看起来像其他哈希值（长度>=16且为字母数字），使用它
      if (filename && filename.length >= 16 && /^[a-zA-Z0-9._-]+$/.test(filename)) {
        return filename.split('.')[0]; // 去除扩展名
      }
    } catch (error) {
      console.warn('解析URL失败:', url);
    }
  }
  
  // 优先级5: 使用原始文件名+大小作为备用标识
  if (photo.name && photo.originalSize) {
    return `${photo.name}_${photo.originalSize}`;
  }
  
  // 最后备用：使用完整URL或ID
  return photo.serverUrl || photo.url || photo.id;
};

/**
 * 检查两张照片是否为重复（完全相同的文件）
 * @param {Object} photo1 - 第一张照片
 * @param {Object} photo2 - 第二张照片
 * @returns {boolean} 是否重复
 */
const arePhotosDuplicate = (photo1, photo2) => {
  const id1 = getPhotoUniqueId(photo1);
  const id2 = getPhotoUniqueId(photo2);
  
  // 如果唯一标识符相同，认为是重复照片
  return id1 === id2;
};

/**
 * 检测单个规格内的重复图片（优化版本）
 * 基于服务端MD5或唯一标识符进行快速检测
 * @param {Array} photos - 照片数组
 * @returns {Array} 返回重复图片组
 */
export const detectDuplicatesInSize = (photos) => {
  if (photos.length < 2) {
    return [];
  }
  
      console.log(`开始检测 ${photos.length} 张照片的重复情况（基于SHA1）...`);
  
  try {
    // 按唯一标识符分组照片
    const photoGroups = new Map();
    
    photos.forEach(photo => {
      const uniqueId = getPhotoUniqueId(photo);
      
      if (!photoGroups.has(uniqueId)) {
        photoGroups.set(uniqueId, []);
      }
      
      photoGroups.get(uniqueId).push({
        ...photo,
        uniqueId: uniqueId
      });
    });
    
    // 找出有多张照片的组（重复组）
    const duplicateGroups = [];
    
    photoGroups.forEach((groupPhotos, uniqueId) => {
      if (groupPhotos.length > 1) {
        // 按上传时间排序，第一张作为"原始"照片
        const sortedPhotos = groupPhotos.sort((a, b) => {
          const timeA = a.lastModified || a.uploadTime || 0;
          const timeB = b.lastModified || b.uploadTime || 0;
          return timeA - timeB;
        });
        
        duplicateGroups.push({
          uniqueId: uniqueId,
          photos: sortedPhotos.map((photo, index) => ({
            ...photo,
            similarity: 1.0, // MD5相同表示完全相同
            isOriginal: index === 0 // 第一张标记为原始照片
          })),
          maxSimilarity: 1.0,
          duplicateCount: sortedPhotos.length
        });
      }
    });
    
    console.log(`检测完成，发现 ${duplicateGroups.length} 组重复图片，共 ${duplicateGroups.reduce((sum, group) => sum + group.duplicateCount, 0)} 张重复照片`);
    return duplicateGroups;
    
  } catch (error) {
    console.error('重复图片检测失败:', error);
    throw error;
  }
};

/**
 * 检测所有规格的重复图片（优化版本）
 * @param {Object} sizePhotos - 按规格分组的照片对象 {size: photos[]}
 * @param {Array} selectedSizes - 选中的规格数组
 * @returns {Object} 返回检测结果
 */
export const detectAllDuplicates = (sizePhotos, selectedSizes) => {
  const results = {
    totalPhotos: 0,
    totalDuplicateGroups: 0,
    totalDuplicatePhotos: 0,
    sizeResults: {}
  };
  
  console.log('开始检测所有规格的重复图片（基于SHA1）...', { selectedSizes });
  
  try {
    // 遍历每个选中的规格
    selectedSizes.forEach(size => {
      const photos = sizePhotos[size] || [];
      results.totalPhotos += photos.length;
      
      if (photos.length < 2) {
        results.sizeResults[size] = {
          duplicateGroups: [],
          totalDuplicates: 0
        };
        return;
      }
      
      // 检测当前规格内的重复图片
      const duplicateGroups = detectDuplicatesInSize(photos);
      
      // 统计重复图片数量
      const totalDuplicates = duplicateGroups.reduce(
        (sum, group) => sum + group.duplicateCount, 
        0
      );
      
      results.sizeResults[size] = {
        duplicateGroups: duplicateGroups,
        totalDuplicates: totalDuplicates
      };
      
      results.totalDuplicateGroups += duplicateGroups.length;
      results.totalDuplicatePhotos += totalDuplicates;
    });
    
    console.log('所有规格检测完成:', results);
    return results;
    
  } catch (error) {
    console.error('批量检测重复图片失败:', error);
    throw error;
  }
};

/**
 * 获取建议删除的重复图片ID列表
 * 保留每组中的第一张照片，删除其余的
 * @param {Object} detectionResults - 检测结果
 * @returns {Array} 建议删除的照片ID数组
 */
export const getSuggestedDeletions = (detectionResults) => {
  const toDelete = [];
  
  Object.values(detectionResults.sizeResults).forEach(sizeResult => {
    sizeResult.duplicateGroups.forEach(group => {
      // 保留第一张照片，删除其余的
      for (let i = 1; i < group.photos.length; i++) {
        toDelete.push({
          photoId: group.photos[i].id,
          photoName: group.photos[i].name,
          size: group.photos[i].size
        });
      }
    });
  });
  
  return toDelete;
};

/**
 * 格式化检测结果用于显示
 * @param {Object} detectionResults - 检测结果
 * @returns {Object} 格式化后的结果
 */
export const formatDetectionResults = (detectionResults) => {
  if (!detectionResults || detectionResults.totalDuplicateGroups === 0) {
    return {
      hasDuplicates: false,
      summary: '未发现重复图片',
      details: []
    };
  }
  
  const details = [];
  
  Object.entries(detectionResults.sizeResults).forEach(([size, result]) => {
    if (result.duplicateGroups.length > 0) {
      details.push({
        size: size,
        groupCount: result.duplicateGroups.length,
        photoCount: result.totalDuplicates,
        groups: result.duplicateGroups
      });
    }
  });
  
  return {
    hasDuplicates: true,
    summary: `发现 ${detectionResults.totalDuplicateGroups} 组重复图片，共 ${detectionResults.totalDuplicatePhotos} 张`,
    totalGroups: detectionResults.totalDuplicateGroups,
    totalPhotos: detectionResults.totalDuplicatePhotos,
    details: details
  };
};
