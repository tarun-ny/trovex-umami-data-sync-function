import pino from 'pino';

export interface Logger {
  info: (msg: string, metadata?: any) => void;
  error: (msg: string, metadata?: any) => void;
  warn: (msg: string, metadata?: any) => void;
  debug: (msg: string, metadata?: any) => void;
}

export function initializeLogger(platform: 'azure' | 'aws' | 'console' = 'console'): Logger {
  const baseLogger = pino({
    level: process.env.LOG_LEVEL || 'info',
    base: { platform },
    timestamp: pino.stdTimeFunctions.isoTime,
  });

  // Helper function to properly format logs for Pino
  const formatLog = (level: 'info' | 'error' | 'warn' | 'debug', msg: string, metadata?: any) => {
    if (metadata && typeof metadata === 'object') {
      // Pino expects: logger.level(obj, msg)
      baseLogger[level](metadata, msg);
    } else {
      // Just message, no metadata
      baseLogger[level](msg);
    }
  };

  return {
    info: (msg: string, metadata?: any) => formatLog('info', msg, metadata),
    error: (msg: string, metadata?: any) => formatLog('error', msg, metadata),
    warn: (msg: string, metadata?: any) => formatLog('warn', msg, metadata),
    debug: (msg: string, metadata?: any) => formatLog('debug', msg, metadata),
  };
}

// Initialize and export a default logger instance
const logger = initializeLogger();
export default logger;