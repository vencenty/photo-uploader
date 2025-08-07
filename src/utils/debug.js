/**
 * 调试工具函数
 * 统一控制调试信息的输出
 */

// 是否启用调试信息（开发环境默认启用）
const DEBUG_ENABLED = import.meta.env.DEV;

/**
 * 调试日志输出
 * @param {...any} args 要输出的参数
 */
export const debugLog = (...args) => {
  if (DEBUG_ENABLED) {
    console.log(...args);
  }
};

/**
 * 调试警告输出
 * @param {...any} args 要输出的参数
 */
export const debugWarn = (...args) => {
  if (DEBUG_ENABLED) {
    console.warn(...args);
  }
};

/**
 * 调试错误输出
 * @param {...any} args 要输出的参数
 */
export const debugError = (...args) => {
  if (DEBUG_ENABLED) {
    console.error(...args);
  }
};

/**
 * 调试信息输出（带前缀）
 * @param {string} prefix 前缀
 * @param {...any} args 要输出的参数
 */
export const debugInfo = (prefix, ...args) => {
  if (DEBUG_ENABLED) {
    console.log(`🔍 ${prefix}:`, ...args);
  }
};

/**
 * 调试成功信息输出
 * @param {string} prefix 前缀
 * @param {...any} args 要输出的参数
 */
export const debugSuccess = (prefix, ...args) => {
  if (DEBUG_ENABLED) {
    console.log(`✅ ${prefix}:`, ...args);
  }
};

/**
 * 调试警告信息输出
 * @param {string} prefix 前缀
 * @param {...any} args 要输出的参数
 */
export const debugWarning = (prefix, ...args) => {
  if (DEBUG_ENABLED) {
    console.warn(`⚠️ ${prefix}:`, ...args);
  }
};

/**
 * 调试错误信息输出
 * @param {string} prefix 前缀
 * @param {...any} args 要输出的参数
 */
export const debugErrorInfo = (prefix, ...args) => {
  if (DEBUG_ENABLED) {
    console.error(`❌ ${prefix}:`, ...args);
  }
}; 