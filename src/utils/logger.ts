/**
 * [VIFIXA] Logger Utility
 * Tuân thủ LOG-001: Mọi log phải có prefix [VIFIXA]
 * Tuân thủ LOG-002: Format log chuẩn hóa
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  module: string;
  action: string;
  data?: Record<string, unknown>;
}

/**
 * Hàm logging chuẩn hóa cho toàn bộ ứng dụng Vifixa AI
 * @param level - Mức độ log (info, warn, error, debug)
 * @param module - Tên module phát sinh log
 * @param action - Hành động cụ thể
 * @param data - Dữ liệu bổ sung (optional)
 */
export function logVifixa(
  level: LogLevel,
  module: string,
  action: string,
  data?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const prefix = '[VIFIXA]';
  const logData = data ? JSON.stringify(data) : '';

  const logMessage = `${prefix} ${timestamp} [${level.toUpperCase()}] ${module}:${action} ${logData}`.trim();

  switch (level) {
    case 'error':
      console.error(logMessage);
      break;
    case 'warn':
      console.warn(logMessage);
      break;
    case 'debug':
      // Chỉ log debug trong môi trường development
      if (process.env.NODE_ENV === 'development') {
        console.debug(logMessage);
      }
      break;
    default:
      console.log(logMessage);
  }
}

/**
 * Helper để tạo logger cho một module cụ thể
 */
export function createLogger(moduleName: string) {
  return {
    info: (action: string, data?: Record<string, unknown>) =>
      logVifixa('info', moduleName, action, data),
    warn: (action: string, data?: Record<string, unknown>) =>
      logVifixa('warn', moduleName, action, data),
    error: (action: string, data?: Record<string, unknown>) =>
      logVifixa('error', moduleName, action, data),
    debug: (action: string, data?: Record<string, unknown>) =>
      logVifixa('debug', moduleName, action, data),
  };
}
