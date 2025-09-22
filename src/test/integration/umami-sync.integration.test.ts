import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UmamiService } from '../../core/services/umami/umami.service';
import { initializeLogger } from '../../core/utils/logger';
import { DatabaseService } from '../../core/models/database.service';
import { User } from '../../core/models/user.model';
import { SystemConfig } from '../../core/models/systemConfig.model';

describe('Umami Sync Service Integration Tests', () => {
  let umamiService: UmamiService;
  let databaseService: DatabaseService;
  let logger: any;

  beforeEach(async () => {
    // Initialize test dependencies
    logger = initializeLogger('test');
    databaseService = DatabaseService.getInstance();
    umamiService = new UmamiService(logger);

    // Clean up test data
    await cleanupTestData();
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanupTestData();
  });

  describe('Database Connection', () => {
    it('should connect to MongoDB successfully', async () => {
      const connection = databaseService.getConnection();
      expect(connection).toBeDefined();
      expect(databaseService.isConnected()).toBe(true);
    });

    it('should have proper indexes on User model', async () => {
      const userModel = databaseService.getConnection()?.model('User');
      const indexes = await userModel?.listIndexes();

      const indexNames = indexes?.map((idx: any) => idx.name);
      expect(indexNames).toContain('email_1_isDeleted_-1');
      expect(indexNames).toContain('session_id_1');
    });
  });

  describe('SystemConfig Operations', () => {
    it('should create or get SystemConfig', async () => {
      const systemConfigModel = databaseService.getConnection()?.model('SystemConfig');

      // Try to get existing config
      let config = await systemConfigModel?.findOne({ _id: 'global' });

      if (!config) {
        // Create new config
        config = new systemConfigModel({
          _id: 'global',
          umamiSync: {
            lastSessionSync: new Date(),
            lastAnalyticsSync: new Date(),
            websiteSyncStatus: {
              'test-website': {
                lastSync: new Date(),
                lastDaySynced: '2024-01-01',
                sessionsProcessed: 100,
                errorCount: 0
              }
            }
          }
        });
        await config.save();
      }

      expect(config).toBeDefined();
      expect(config._id).toBe('global');
      expect(config.umamiSync).toBeDefined();
    });

    it('should update sync status', async () => {
      const systemConfigModel = databaseService.getConnection()?.model('SystemConfig');

      // Create or get config
      let config = await systemConfigModel?.findOne({ _id: 'global' });
      if (!config) {
        config = new systemConfigModel({ _id: 'global' });
      }

      // Update sync status
      config.umamiSync = {
        ...config.umamiSync,
        lastSessionSync: new Date(),
        websiteSyncStatus: {
          ...config.umamiSync?.websiteSyncStatus,
          'test-website-updated': {
            lastSync: new Date(),
            lastDaySynced: '2024-01-02',
            sessionsProcessed: 200,
            errorCount: 1
          }
        }
      };

      await config.save();

      // Verify update
      const updatedConfig = await systemConfigModel?.findOne({ _id: 'global' });
      expect(updatedConfig?.umamiSync?.websiteSyncStatus?.['test-website-updated']).toBeDefined();
    });
  });

  describe('User Model Operations', () => {
    it('should create and update user records', async () => {
      const userModel = databaseService.getConnection()?.model('User');

      // Create test user
      const userData = {
        email: 'test@example.com',
        organization: {
          _id: new mongoose.Types.ObjectId(),
          name: 'Test Organization'
        },
        isDeleted: false
      };

      const user = new userModel(userData);
      await user.save();

      expect(user._id).toBeDefined();
      expect(user.email).toBe('test@example.com');

      // Update user with session data
      user.session_id = 'test-session-id';
      user.umamiAnalytics = {
        id: 'analytics-123',
        websiteId: 'website-1',
        browser: 'Chrome',
        os: 'Windows',
        device: 'Desktop',
        screen: '1920x1080',
        language: 'en',
        firstAt: new Date(),
        lastAt: new Date(),
        visits: 5,
        views: '10',
        createdAt: new Date()
      };

      await user.save();

      // Verify update
      const updatedUser = await userModel?.findById(user._id);
      expect(updatedUser?.session_id).toBe('test-session-id');
      expect(updatedUser?.umamiAnalytics?.browser).toBe('Chrome');
    });

    it('should find users by session_id', async () => {
      const userModel = databaseService.getConnection()?.model('User');

      // Create test user with session
      const sessionData = {
        email: 'session-test@example.com',
        session_id: 'unique-session-123',
        organization: {
          _id: new mongoose.Types.ObjectId(),
          name: 'Test Organization'
        },
        isDeleted: false
      };

      const user = new userModel(sessionData);
      await user.save();

      // Find by session_id
      const foundUser = await userModel?.findOne({ session_id: 'unique-session-123' });
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe('session-test@example.com');
    });
  });

  describe('Service Integration', () => {
    it('should test database connections', async () => {
      const connectionResults = await umamiService.testConnections();

      expect(connectionResults).toBeDefined();
      expect(typeof connectionResults).toBe('object');
      // Note: This test will pass if we can connect to MongoDB
      // PostgreSQL and API tests depend on external services
    });

    it('should get sync status', async () => {
      const syncStatus = await umamiService.getSyncStatus();

      expect(syncStatus).toBeDefined();
      expect(typeof syncStatus).toBe('object');
    });
  });

  async function cleanupTestData() {
    try {
      const userModel = databaseService.getConnection()?.model('User');
      const systemConfigModel = databaseService.getConnection()?.model('SystemConfig');

      // Clean up test users
      await userModel?.deleteMany({
        email: { $in: ['test@example.com', 'session-test@example.com'] }
      });

      // Clean up test system configs (except the main one)
      await systemConfigModel?.deleteMany({
        _id: { $ne: 'global' }
      });

    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
});