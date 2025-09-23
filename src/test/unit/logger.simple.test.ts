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
      });
    });

    it('should use custom log level from environment', () => {
      process.env.LOG_LEVEL = 'debug';

      const logger = initializeLogger();

      expect(mockedPino).toHaveBeenCalledWith({
        level: 'debug',
        base: { platform: 'console' },
        timestamp: pino.stdTimeFunctions.isoTime,
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

    it('should call baseLogger.info with correct arguments', () => {
      logger.info('Test message', { key: 'value' });

      expect(mockBaseLogger.info).toHaveBeenCalledWith('Test message', { key: 'value' });
    });

    it('should handle single string argument', () => {
      logger.info('Simple message');

      expect(mockBaseLogger.info).toHaveBeenCalledWith('Simple message');
    });

    it('should call baseLogger.error with correct arguments', () => {
      const error = new Error('Test error');
      logger.error('Error message', error);

      expect(mockBaseLogger.error).toHaveBeenCalledWith('Error message', error);
    });

    it('should call baseLogger.warn with correct arguments', () => {
      logger.warn('Warning message', { deprecated: true });

      expect(mockBaseLogger.warn).toHaveBeenCalledWith('Warning message', { deprecated: true });
    });

    it('should call baseLogger.debug with correct arguments', () => {
      logger.debug('Debug message', { step: 1 });

      expect(mockBaseLogger.debug).toHaveBeenCalledWith('Debug message', { step: 1 });
    });
  });
});