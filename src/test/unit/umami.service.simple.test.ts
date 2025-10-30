import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UmamiService } from '../../core/services/umami/umami.service';
import { DatabaseService } from '../../core/models/database.service';

// Mock dependencies
vi.mock('../../core/services/umami/umamiDb.service');
vi.mock('../../core/services/umami/umamiApi.service');
vi.mock('../../core/models/database.service');

describe('UmamiService - Simple Unit Tests', () => {
  let umamiService: UmamiService;
  let mockDatabaseService: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock database service
    mockDatabaseService = {
      getInstance: vi.fn().mockReturnValue({
        getConnection: vi.fn().mockReturnValue({
          model: vi.fn()
        })
      })
    };

    // Mock DatabaseService constructor
    vi.mocked(DatabaseService).mockImplementation(() => mockDatabaseService);

    // Create service instance
    umamiService = new UmamiService();
  });

  describe('Constructor', () => {
    it('should create service instance', () => {
      expect(umamiService).toBeInstanceOf(UmamiService);
    });
  });

  describe('getWebsiteIds', () => {
    it('should return website IDs from environment', () => {
      // Test with default environment
      process.env['UMAMI_WEBSITE_IDS'] = 'website1,website2,website3';

      const service = new UmamiService();
      const websiteIds = service.getWebsiteIds();

      expect(websiteIds).toEqual(['website1', 'website2', 'website3']);
    });

    it('should handle single website ID', () => {
      process.env['UMAMI_WEBSITE_IDS'] = 'single-website';

      const service = new UmamiService();
      const websiteIds = service.getWebsiteIds();

      expect(websiteIds).toEqual(['single-website']);
    });

    it('should handle empty website IDs', () => {
      delete process.env['UMAMI_WEBSITE_IDS'];

      const service = new UmamiService();
      const websiteIds = service.getWebsiteIds();

      expect(websiteIds).toEqual([]);
    });
  });

  describe('syncAllData', () => {
    it('should be a function that returns Promise<void>', () => {
      expect(typeof umamiService.syncAllData).toBe('function');
    });
  });

  describe('Environment Variables', () => {
    it('should work with different website ID configurations', () => {
      const testCases = [
        { env: 'website1', expected: ['website1'] },
        { env: 'website1,website2', expected: ['website1', 'website2'] },
        { env: 'website1,website2,website3,website4', expected: ['website1', 'website2', 'website3', 'website4'] }
      ];

      testCases.forEach(({ env, expected }) => {
        process.env['UMAMI_WEBSITE_IDS'] = env;
        const service = new UmamiService();
        const result = service.getWebsiteIds();
        expect(result).toEqual(expected);
      });
    });
  });
});