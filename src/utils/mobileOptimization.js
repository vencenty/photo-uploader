// 移动端优化工具函数

// 防止页面缩放
export const preventZoom = () => {
  // 防止双击缩放
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function (event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // 防止手势缩放
  document.addEventListener('gesturestart', function (event) {
    event.preventDefault();
  });

  document.addEventListener('gesturechange', function (event) {
    event.preventDefault();
  });

  document.addEventListener('gestureend', function (event) {
    event.preventDefault();
  });
};

// 防止页面滚动回弹
export const preventBounce = () => {
  document.body.addEventListener('touchstart', function (event) {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  });

  let lastY = 0;
  document.body.addEventListener('touchmove', function (event) {
    const currentY = event.touches[0].clientY;
    if (event.touches.length > 1) {
      event.preventDefault();
      return;
    }

    // 检查是否在可滚动元素内
    const target = event.target;
    const scrollableParent = findScrollableParent(target);
    
    if (!scrollableParent) {
      event.preventDefault();
      return;
    }

    const direction = currentY > lastY ? 'down' : 'up';
    const { scrollTop, scrollHeight, clientHeight } = scrollableParent;

    // 防止顶部和底部的回弹
    if (direction === 'up' && scrollTop <= 0) {
      event.preventDefault();
    } else if (direction === 'down' && scrollTop + clientHeight >= scrollHeight) {
      event.preventDefault();
    }

    lastY = currentY;
  }, { passive: false });
};

// 查找可滚动的父元素
const findScrollableParent = (element) => {
  if (!element || element === document.body) {
    return document.body;
  }

  const { overflow, overflowY } = window.getComputedStyle(element);
  const isScrollable = overflow === 'auto' || overflow === 'scroll' || 
                      overflowY === 'auto' || overflowY === 'scroll';

  if (isScrollable && element.scrollHeight > element.clientHeight) {
    return element;
  }

  return findScrollableParent(element.parentElement);
};

// 优化输入框体验
export const optimizeInputs = () => {
  // 防止iOS输入框被键盘遮挡
  const inputs = document.querySelectorAll('input, textarea');
  
  inputs.forEach(input => {
    input.addEventListener('focus', function() {
      // 延迟滚动，等待键盘弹出
      setTimeout(() => {
        this.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 300);
    });

    // 防止输入框自动缩放
    input.addEventListener('touchstart', function() {
      this.style.fontSize = '16px';
    });
  });
};

// 优化点击体验
export const optimizeTouch = () => {
  // 移除所有元素的点击高亮
  const style = document.createElement('style');
  style.innerHTML = `
    * {
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    
    input, textarea, [contenteditable] {
      -webkit-user-select: auto;
      -khtml-user-select: auto;
      -moz-user-select: auto;
      -ms-user-select: auto;
      user-select: auto;
    }
  `;
  document.head.appendChild(style);
};

// 检测设备类型
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// 检测是否是iOS设备
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

// 检测是否是Safari浏览器
export const isSafari = () => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

// 初始化所有移动端优化
export const initMobileOptimization = () => {
  if (isMobileDevice()) {
    preventZoom();
    preventBounce();
    optimizeInputs();
    optimizeTouch();
    
    // iOS特殊处理
    if (isIOS()) {
      // 防止Safari地址栏变化导致的布局问题
      const setViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      
      setViewportHeight();
      window.addEventListener('resize', setViewportHeight);
      window.addEventListener('orientationchange', () => {
        setTimeout(setViewportHeight, 100);
      });
    }
  }
}; 