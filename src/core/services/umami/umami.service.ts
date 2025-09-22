import logger from '../../utils/logger';
import SystemConfig from '../../models/systemConfig.model';
import User, { IUser } from '../../models/user.model';
import { UmamiDbService } from './umamiDb.service';
import { UmamiApiService } from './umamiApi.service';
import {
  PostgresSession,
  UmamiSession,
  UmamiSyncStatus,
  WebsiteSyncStatus,
  SyncResult,
  BatchUpdateResult
} from './umami.types';
import {
  DEFAULT_CONFIG,
  ERROR_MESSAGES,
  LOG_MESSAGES,
  SYNC_STATUS
} from './umami.constants';

export class UmamiService {
  private apiService: UmamiApiService;
  private websiteIds: string[];

  constructor() {
    this.apiService = new UmamiApiService();
    this.websiteIds = this.getWebsiteIds();
  }

  /**
   * Main entry point for complete Umami sync process
   */
  async syncAllData(): Promise<void> {
    try {
      logger.info(LOG_MESSAGES.SYNC_STARTED);

      const syncDay = UmamiApiService.getYesterdayDateString();

      // Sequential execution: session sync first, then analytics
      await this.syncSessionIds();
      await this.syncAnalyticsData(syncDay);

      // Update sync status in SystemConfig
      await this.updateSyncStatus(syncDay);

      logger.info(LOG_MESSAGES.SYNC_COMPLETED);
    } catch (error) {
      logger.error(LOG_MESSAGES.SYNC_FAILED, { error });
      throw error;
    }
  }

  /**
   * Sync session IDs from PostgreSQL to User collection
   */
  private async syncSessionIds(): Promise<void> {
    try {
      logger.info(LOG_MESSAGES.SESSION_SYNC_STARTED);

      const sessions = await UmamiDbService.getRecentSessions();
      logger.debug('Fetched sessions from PostgreSQL', { count: sessions.length });

      if (sessions.length === 0) {
        logger.info('No new sessions found for sync');
        return;
      }

      // Update users in batches - each session corresponds to one user
      const batchSize = parseInt(process.env.BATCH_SIZE || DEFAULT_CONFIG.BATCH_SIZE.toString());

      for (let i = 0; i < sessions.length; i += batchSize) {
        const sessionBatch = sessions.slice(i, i + batchSize);
        await this.updateUserSessionsBatchSimple(sessionBatch);
      }

      logger.info(LOG_MESSAGES.SESSION_SYNC_COMPLETED, {
        sessionsProcessed: sessions.length
      });
    } catch (error) {
      logger.error('Session ID sync failed', { error });
      throw error;
    }
  }

  /**
   * Sync analytics data from Umami API to User collection
   */
  private async syncAnalyticsData(syncDay: string): Promise<void> {
    try {
      logger.info(LOG_MESSAGES.ANALYTICS_SYNC_STARTED, { syncDay });

      // Authenticate once for all websites
      await this.apiService.authenticate();

      const results: SyncResult[] = [];

      // Sequential processing of each website
      for (const websiteId of this.websiteIds) {
        try {
          const result = await this.syncWebsiteAnalytics(websiteId, syncDay);
          results.push(result);
        } catch (error) {
          logger.error('Failed to sync website analytics', { websiteId, error });
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            websiteId
          });
        }
      }

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      logger.info(LOG_MESSAGES.ANALYTICS_SYNC_COMPLETED, {
        totalWebsites: this.websiteIds.length,
        successful: successful.length,
        failed: failed.length,
        totalSessionsProcessed: successful.reduce((sum, r) => sum + (r.sessionsProcessed || 0), 0)
      });

      if (failed.length > 0) {
        logger.warn('Some websites failed to sync', { failed });
      }
    } catch (error) {
      logger.error('Analytics data sync failed', { error });
      throw error;
    } finally {
      // Clear token after all websites are processed
      this.apiService.clearToken();
    }
  }

  /**
   * Sync analytics data for a specific website
   */
  private async syncWebsiteAnalytics(websiteId: string, syncDay: string): Promise<SyncResult> {
    try {
      const { startTimestamp, endTimestamp } = UmamiApiService.getDayTimestamps(syncDay);
      const sessions = await this.apiService.fetchAllSessions(websiteId, startTimestamp, endTimestamp);

      if (sessions.length === 0) {
        logger.info('No sessions found for website', { websiteId, syncDay });
        return {
          success: true,
          sessionsProcessed: 0,
          usersUpdated: 0,
          websiteId
        };
      }

      // Update users with analytics data in batches
      const batchSize = parseInt(process.env.BATCH_SIZE || DEFAULT_CONFIG.BATCH_SIZE.toString());
      let totalUsersUpdated = 0;

      for (let i = 0; i < sessions.length; i += batchSize) {
        const sessionBatch = sessions.slice(i, i + batchSize);
        const result = await this.updateUserAnalyticsBatch(sessionBatch);
        totalUsersUpdated += result.modifiedCount;
      }

      // Update website sync status
      await this.updateWebsiteSyncStatus(websiteId, syncDay, sessions.length);

      return {
        success: true,
        sessionsProcessed: sessions.length,
        usersUpdated: totalUsersUpdated,
        websiteId
      };
    } catch (error) {
      await this.incrementWebsiteErrorCount(websiteId);
      throw error;
    }
  }

  /**
   * Update user session IDs in batches (simplified - one session per user)
   */
  private async updateUserSessionsBatchSimple(sessions: PostgresSession[]): Promise<void> {
    logger.debug(LOG_MESSAGES.BATCH_UPDATE_STARTED, { batchSize: sessions.length });

    const bulkOps = sessions.map(session => ({
      updateOne: {
        filter: { email: session.distinct_id.toLowerCase() },
        update: {
          session_id: session.session_id
        }
      }
    }));

    try {
      const result: BatchUpdateResult = await User.bulkWrite(bulkOps, { ordered: false });
      logger.debug(LOG_MESSAGES.BATCH_UPDATE_COMPLETED, {
        matched: result.matchedCount,
        modified: result.modifiedCount
      });
    } catch (error) {
      logger.error('Batch session update failed', { error });
      throw new Error(ERROR_MESSAGES.BATCH_UPDATE_FAILED);
    }
  }

  /**
   * Update user analytics data in batches
   */
  private async updateUserAnalyticsBatch(sessions: UmamiSession[]): Promise<BatchUpdateResult> {
    logger.debug(LOG_MESSAGES.BATCH_UPDATE_STARTED, { batchSize: sessions.length });

    const bulkOps = sessions.map(session => ({
      updateOne: {
        filter: { session_id: session.id },
        update: {
          umamiAnalytics: {
            id: session.id,
            websiteId: session.websiteId,
            browser: session.browser,
            os: session.os,
            device: session.device,
            screen: session.screen,
            language: session.language,
            country: session.country,
            region: session.region,
            city: session.city,
            firstAt: new Date(session.firstAt),
            lastAt: new Date(session.lastAt),
            visits: session.visits,
            views: session.views,
            createdAt: new Date(session.createdAt),
          }
        }
      }
    }));

    try {
      const result = await User.bulkWrite(bulkOps, { ordered: false });
      logger.debug(LOG_MESSAGES.BATCH_UPDATE_COMPLETED, {
        matched: result.matchedCount,
        modified: result.modifiedCount
      });
      return result;
    } catch (error) {
      logger.error('Batch analytics update failed', { error });
      throw new Error(ERROR_MESSAGES.BATCH_UPDATE_FAILED);
    }
  }

  /**
   * Update overall sync status in SystemConfig
   */
  private async updateSyncStatus(syncDay: string): Promise<void> {
    try {
      const updateData = {
        'umamiSync.lastSessionSync': new Date(),
        'umamiSync.lastAnalyticsSync': new Date(),
      };

      await SystemConfig.findOneAndUpdate(
        { _id: 'global' },
        { $set: updateData },
        { upsert: true, new: true }
      );

      logger.debug('Updated sync status in SystemConfig', { syncDay });
    } catch (error) {
      logger.error('Failed to update sync status', { error });
      // Don't throw here as this is not critical for the sync process
    }
  }

  /**
   * Update individual website sync status
   */
  private async updateWebsiteSyncStatus(websiteId: string, syncDay: string, sessionsProcessed: number): Promise<void> {
    try {
      const status: WebsiteSyncStatus = {
        lastSync: new Date(),
        lastDaySynced: syncDay,
        sessionsProcessed,
        errorCount: 0, // Reset error count on successful sync
      };

      await SystemConfig.findOneAndUpdate(
        { _id: 'global' },
        {
          $set: {
            [`umamiSync.websiteSyncStatus.${websiteId}`]: status
          }
        },
        { upsert: true }
      );

      logger.debug('Updated website sync status', { websiteId, sessionsProcessed });
    } catch (error) {
      logger.error('Failed to update website sync status', { websiteId, error });
      // Don't throw here as this is not critical for the sync process
    }
  }

  /**
   * Increment error count for a website
   */
  private async incrementWebsiteErrorCount(websiteId: string): Promise<void> {
    try {
      await SystemConfig.findOneAndUpdate(
        { _id: 'global' },
        {
          $inc: {
            [`umamiSync.websiteSyncStatus.${websiteId}.errorCount`]: 1
          }
        },
        { upsert: true }
      );
    } catch (error) {
      logger.error('Failed to increment website error count', { websiteId, error });
      // Don't throw here as this is not critical for the sync process
    }
  }

  /**
   * Get configured website IDs from environment
   */
  public getWebsiteIds(): string[] {
    const websiteIdsStr = process.env.UMAMI_WEBSITE_IDS || '';
    return websiteIdsStr.split(',').map(id => id.trim()).filter(Boolean);
  }

  /**
   * Get current sync status from SystemConfig
   */
  static async getSyncStatus(): Promise<UmamiSyncStatus | null> {
    try {
      const config = await SystemConfig.findById('global');
      return config?.umamiSync || null;
    } catch (error) {
      logger.error('Failed to get sync status', { error });
      return null;
    }
  }

  /**
   * Test both database and API connections
   */
  static async testConnections(): Promise<{
    database: boolean;
    api: boolean;
    websiteIds: string[];
  }> {
    const [dbResult, apiService] = await Promise.all([
      UmamiDbService.testConnection(),
      Promise.resolve(new UmamiApiService())
    ]);

    const websiteIds = apiService.websiteIds;
    let apiResult = false;

    try {
      // Test API by attempting to authenticate
      if (websiteIds.length > 0) {
        await apiService['authenticate']();
        apiResult = true;
      }
    } catch (error) {
      logger.error('API connection test failed', { error });
    }

    return {
      database: dbResult,
      api: apiResult,
      websiteIds
    };
  }
}