import { describe, it, expect, vi, beforeEach } from 'vitest';
import pino from 'pino';
import { initializeLogger, Logger } from '../../core/utils/logger';

// Mock pino
vi.mock('pino');
const mockedPino = vi.mocked(pino);

describe('Logger - Simple Unit Tests', () => {
  let mockBaseLogger: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock base logger
    mockBaseLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };

    // Set up mock pino
    mockedPino.mockReturnValue(mockBaseLogger);
  });

  describe('initializeLogger', () => {
    it('should create logger with default configuration', () => {
      const logger = initializeLogger();

      expect(mockedPino).toHaveBeenCalledWith({
        level: 'info',
        base: { platform: 'console' },
        timestamp: pino.stdTimeFunctions.isoTime,
        serializers: {
          error: pino.stdSerializers.err,
        }
      });

      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('debug');
    });

    it('should create logger with Azure platform', () => {
      const logger = initializeLogger('azure');

      expect(mockedPino).toHaveBeenCalledWith({
        level: 'info',
        base: { platform: 'azure' },
        timestamp: pino.stdTimeFunctions.isoTime,
        serializers: {
          error: pino.stdSerializers.err,
        }
      });
    });

    it('should use custom log level from environment', () => {
      process.env.LOG_LEVEL = 'debug';

      const logger = initializeLogger();

      expect(mockedPino).toHaveBeenCalledWith({
        level: 'debug',
        base: { platform: 'console' },
        timestamp: pino.stdTimeFunctions.isoTime,
        serializers: {
          error: pino.stdSerializers.err,
        }
      });

      // Clean up
      delete process.env.LOG_LEVEL;
    });
  });

  describe('Logger Methods', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = initializeLogger();
    });

    it('should call baseLogger.info with correct Pino format (metadata first, message second)', () => {
      logger.info('Test message', { key: 'value' });

      // Pino expects: baseLogger.info(metadata, message)
      expect(mockBaseLogger.info).toHaveBeenCalledWith({ key: 'value' }, 'Test message');
    });

    it('should handle single string argument', () => {
      logger.info('Simple message');

      expect(mockBaseLogger.info).toHaveBeenCalledWith('Simple message');
    });

    it('should wrap Error objects in error key for Pino serializer', () => {
      const error = new Error('Test error');
      logger.error('Error message', error);

      // Error should be wrapped in { error: ... } for Pino's serializer
      expect(mockBaseLogger.error).toHaveBeenCalledWith({ error }, 'Error message');
    });

    it('should call baseLogger.warn with correct Pino format', () => {
      logger.warn('Warning message', { deprecated: true });

      // Pino expects: baseLogger.warn(metadata, message)
      expect(mockBaseLogger.warn).toHaveBeenCalledWith({ deprecated: true }, 'Warning message');
    });

    it('should call baseLogger.debug with correct Pino format', () => {
      logger.debug('Debug message', { step: 1 });

      // Pino expects: baseLogger.debug(metadata, message)
      expect(mockBaseLogger.debug).toHaveBeenCalledWith({ step: 1 }, 'Debug message');
    });

    it('should wrap primitive values in an object', () => {
      logger.info('Test with number', 42);

      // Primitive values should be wrapped in { value: ... }
      expect(mockBaseLogger.info).toHaveBeenCalledWith({ value: 42 }, 'Test with number');
    });
  });
});