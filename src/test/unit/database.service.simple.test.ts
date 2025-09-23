import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { DatabaseService } from '../../core/models/database.service';

// Mock mongoose
vi.mock('mongoose');
const mockedMongoose = vi.mocked(mongoose);

describe('DatabaseService - Simple Unit Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };

    // Set up test environment
    process.env.MONGODB = 'mongodb://localhost:27017/test_db';

    // Reset mocks
    vi.clearAllMocks();

    // Reset singleton instance
    (DatabaseService as any).instance = null;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;

    // Reset singleton instance
    (DatabaseService as any).instance = null;
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = DatabaseService.getInstance();
      const instance2 = DatabaseService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(DatabaseService);
    });
  });

  describe('Constructor', () => {
    it('should initialize with null connection', () => {
      const service = new DatabaseService();
      expect(service.getConnection()).toBeNull();
    });
  });

  describe('connect', () => {
    it('should throw error if MONGODB_URL is not found', async () => {
      delete process.env.MONGODB;

      const service = DatabaseService.getInstance();

      await expect(service.connect())
        .rejects.toThrow('MONGODB connection string not found in environment variables');
    });

    it('should throw error if MONGODB_URL is empty string', async () => {
      process.env.MONGODB = '';

      const service = DatabaseService.getInstance();

      await expect(service.connect())
        .rejects.toThrow('MONGODB connection string not found in environment variables');
    });
  });

  describe('disconnect', () => {
    it('should handle disconnection when not connected', async () => {
      const service = DatabaseService.getInstance();

      await expect(service.disconnect()).resolves.not.toThrow();
    });
  });

  describe('getConnection', () => {
    it('should return null when not connected', () => {
      const service = DatabaseService.getInstance();

      const connection = service.getConnection();

      expect(connection).toBeNull();
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      const service = DatabaseService.getInstance();

      const isConnected = service.isConnected();

      expect(isConnected).toBe(false);
    });
  });
});