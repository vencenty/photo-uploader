// 基础Polyfills for 兼容性支持
// 引入核心polyfills
import 'core-js/stable'
import 'whatwg-fetch'

// Object.assign polyfill (for IE)
if (typeof Object.assign !== 'function') {
  Object.assign = function(target) {
    'use strict';
    if (target == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }

    var to = Object(target);
    for (var index = 1; index < arguments.length; index++) {
      var nextSource = arguments[index];
      if (nextSource != null) {
        for (var nextKey in nextSource) {
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  };
}

// Array.prototype.includes polyfill
if (!Array.prototype.includes) {
  Array.prototype.includes = function(searchElement /*, fromIndex*/ ) {
    'use strict';
    var O = Object(this);
    var len = parseInt(O.length) || 0;
    if (len === 0) {
      return false;
    }
    var n = parseInt(arguments[1]) || 0;
    var k;
    if (n >= 0) {
      k = n;
    } else {
      k = len + n;
      if (k < 0) {k = 0;}
    }
    for (;k < len; k++) {
      if (O[k] === searchElement) {
        return true;
      }
    }
    return false;
  };
}

// String.prototype.includes polyfill
if (!String.prototype.includes) {
  String.prototype.includes = function(search, start) {
    'use strict';
    if (typeof start !== 'number') {
      start = 0;
    }
    
    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
}

// Array.prototype.find polyfill
if (!Array.prototype.find) {
  Array.prototype.find = function(predicate) {
    if (this == null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = parseInt(list.length) || 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}

// Array.prototype.findIndex polyfill
if (!Array.prototype.findIndex) {
  Array.prototype.findIndex = function(predicate) {
    if (this == null) {
      throw new TypeError('Array.prototype.findIndex called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = parseInt(list.length) || 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return i;
      }
    }
    return -1;
  };
}

// Promise.prototype.finally polyfill
if (typeof Promise !== 'undefined' && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    var P = this.constructor || Promise;
    return this.then(
      function(value) {
        return P.resolve(callback()).then(function() {
          return value;
        });
      },
      function(reason) {
        return P.resolve(callback()).then(function() {
          throw reason;
        });
      }
    );
  };
}

// Element.prototype.closest polyfill (for IE)
if (!Element.prototype.closest) {
  Element.prototype.closest = function(selector) {
    var el = this;
    var matchesFn;

    // find vendor prefix
    ['matches','webkitMatchesSelector','mozMatchesSelector','msMatchesSelector','oMatchesSelector'].some(function(fn) {
      if (typeof document.body[fn] == 'function') {
        matchesFn = fn;
        return true;
      }
      return false;
    });

    var parent;

    // traverse parents
    while (el) {
      parent = el.parentElement;
      if (parent && parent[matchesFn](selector)) {
        return parent;
      }
      el = parent;
    }

    return null;
  };
}

// FormData polyfill check
if (typeof FormData === 'undefined') {
  console.warn('FormData不支持，文件上传功能可能受影响');
}

// URL polyfill check
if (typeof URL === 'undefined' && typeof webkitURL !== 'undefined') {
  window.URL = window.webkitURL;
}

// 导出检查函数
export const checkBrowserSupport = () => {
  const support = {
    fetch: typeof fetch !== 'undefined',
    formData: typeof FormData !== 'undefined',
    promise: typeof Promise !== 'undefined',
    asyncAwait: (function() {
      try {
        return (function() {}).constructor('return (async function(){})();')();
      } catch (e) {
        return false;
      }
    })(),
    es6: (function() {
      try {
        new Function("(a = 0) => a");
        return true;
      } catch (err) {
        return false;
      }
    })()
  };

  console.log('浏览器兼容性检查:', support);
  return support;
};

// 显示兼容性警告
export const showCompatibilityWarning = () => {
  const support = checkBrowserSupport();
  
  if (!support.fetch) {
    console.warn('您的浏览器不支持Fetch API，已启用兼容模式');
  }
  
  if (!support.promise) {
    console.error('您的浏览器不支持Promise，某些功能可能无法正常工作');
  }
  
  if (!support.formData) {
    console.error('您的浏览器不支持FormData，文件上传功能将无法使用');
  }
  
  return support;
}; 