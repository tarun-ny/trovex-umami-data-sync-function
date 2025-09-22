import pino from 'pino';

export interface Logger {
  info: (msg: string, ...args: any[]) => void;
  error: (msg: string, ...args: any[]) => void;
  warn: (msg: string, ...args: any[]) => void;
  debug: (msg: string, ...args: any[]) => void;
}

export function initializeLogger(platform: 'azure' | 'aws' | 'console' = 'console'): Logger {
  const baseLogger = pino({
    level: process.env.LOG_LEVEL || 'info',
    base: { platform },
    timestamp: pino.stdTimeFunctions.isoTime,
  });

  return {
    info: (msg: string, ...args: any[]) => baseLogger.info(msg, ...args),
    error: (msg: string, ...args: any[]) => baseLogger.error(msg, ...args),
    warn: (msg: string, ...args: any[]) => baseLogger.warn(msg, ...args),
    debug: (msg: string, ...args: any[]) => baseLogger.debug(msg, ...args),
  };
}

// Initialize and export a default logger instance
const logger = initializeLogger();
export default logger;