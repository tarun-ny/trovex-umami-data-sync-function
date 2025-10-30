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
    serializers: {
      error: pino.stdSerializers.err, // Use Pino's built-in error serializer
    }
  });

  // Helper function to properly format logs for Pino
  const formatLog = (level: 'info' | 'error' | 'warn' | 'debug', msg: string, metadata?: any) => {
    if (!metadata) {
      // No metadata, just message
      baseLogger[level](msg);
      return;
    }

    // Handle different metadata types
    if (metadata instanceof Error) {
      // Error objects - wrap in 'error' key for Pino's serializer
      baseLogger[level]({ error: metadata }, msg);
    } else if (typeof metadata === 'object' && metadata !== null) {
      // Regular object - pass to Pino in correct order
      baseLogger[level](metadata, msg);
    } else {
      // Primitive value (string, number, boolean, undefined, null)
      // Wrap it in an object so Pino can log it properly
      baseLogger[level]({ value: metadata }, msg);
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