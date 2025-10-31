import logger from '../../utils/logger';
import SystemConfig from '../../models/systemConfig.model';
import User, { IUser } from '../../models/user.model';
import { UmamiDbService } from './umamiDb.service';
import { UmamiApiService } from './umamiApi.service';
import { DatabaseService } from '../../models/database.service';
import {
  MySqlSession,
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
    // Capture the exact start time when sync begins
    const syncStartTime = new Date();

    try {
      logger.info(LOG_MESSAGES.SYNC_STARTED);

      // Determine sync window
      const syncWindow = await this.determineSyncWindow();

      logger.info(`Starting sync for window: ${syncWindow.startDate.toISOString()} to ${syncWindow.endDate.toISOString()}`);

      // Sequential execution: session sync first, then analytics
      await this.syncSessionIdsForWindow(syncWindow.startDate, syncWindow.endDate);
      await this.syncAnalyticsDataForWindow(syncWindow.startDate, syncWindow.endDate);

      // Update sync status in SystemConfig only after complete success
      await this.updateLastSuccessfulSync(syncStartTime);

      logger.info(LOG_MESSAGES.SYNC_COMPLETED);
    } catch (error) {
      logger.error(LOG_MESSAGES.SYNC_FAILED, { error });
      throw error;
    }
  }

  /**
   * Sync session IDs from MySQL to User collection for a specific date window
   */
  private async syncSessionIdsForWindow(startDate: Date, endDate: Date): Promise<void> {
    try {
      logger.info(LOG_MESSAGES.SESSION_SYNC_STARTED);

      const sessions = await UmamiDbService.getSessionsAfterDate(startDate);
      logger.debug('Fetched sessions from MySQL', { count: sessions.length });

      if (sessions.length === 0) {
        logger.info('No new sessions found for sync');
        return;
      }

      // Filter sessions to only include those from configured websites
      const configuredWebsiteIds = this.apiService.websiteIds;
      console.log('Configured website IDs for filtering:', configuredWebsiteIds);
      
      const filteredSessions = sessions.filter(session =>
        configuredWebsiteIds.includes(session.website_id)
      );

      const filteredOutCount = sessions.length - filteredSessions.length;

      logger.info('Session filtering applied', {
        totalSessions: sessions.length,
        filteredSessions: filteredSessions.length,
        filteredOutSessions: filteredOutCount,
        configuredWebsites: configuredWebsiteIds,
        uniqueWebsitesFound: [...new Set(sessions.map(s => s.website_id))]
      });
      
      if (filteredSessions.length === 0) {
        logger.info('No sessions found from configured websites');
        return;
      }

      // Update users sequentially - each session corresponds to one user
      await this.updateUserSessionsSequential(filteredSessions);

      logger.info(LOG_MESSAGES.SESSION_SYNC_COMPLETED, {
        sessionsProcessed: filteredSessions.length
      });
    } catch (error) {
      logger.error('Session ID sync failed', { error });
      throw error;
    }
  }

  /**
   * Sync analytics data from API for a specific date window
   */
  private async syncAnalyticsDataForWindow(startDate: Date, endDate: Date): Promise<void> {
    logger.info('Starting analytics sync for date window');

    try {
      // Get timestamps for the range
      const startTimestamp = startDate.getTime();
      const endTimestamp = endDate.getTime();

      logger.info('Analytics sync range', {
        startDate: startDate.toISOString().split('T')[0],
        startTimestamp,
        endDate: endDate.toISOString().split('T')[0],
        endTimestamp
      });

      // Authenticate once for all websites
      await this.apiService.authenticate();

      let totalSessionsProcessed = 0;
      let totalUsersUpdated = 0;

      // Process each website sequentially for the date range
      for (const websiteId of this.websiteIds) {
        try {
          logger.debug('Fetching sessions for website', { websiteId });
          const sessions = await this.apiService.fetchAllSessions(websiteId, startTimestamp, endTimestamp);

          logger.debug('Got sessions for website', { websiteId, sessionCount: sessions.length });

          if (sessions.length === 0) {
          logger.info('No sessions found for website in date range', { websiteId });
            continue;
          }

          // Update users with analytics data sequentially
          let websiteUsersUpdated = 0;

          const matchedSessions: string[] = [];
          const unmatchedSessions: string[] = [];

          for (const session of sessions) {
            try {
              const result = await this.updateSingleUserAnalytics(session);
              websiteUsersUpdated += result.modifiedCount;

              if (result.matchedCount > 0) {
                matchedSessions.push(session.id);
              } else {
                unmatchedSessions.push(session.id);
              }

              logger.debug(`Updated analytics for session ${session.id}`, {
                matched: result.matchedCount,
                modified: result.modifiedCount
              });
            } catch (error) {
              logger.error(`Failed to update analytics for session ${session.id}`, { error });
              unmatchedSessions.push(session.id);
              // Continue with other sessions even if one fails
            }
          }

          console.log('=== SESSION MATCHING ANALYSIS ===');
          console.log({
            websiteId,
            totalSessions: sessions.length,
            matchedSessions,
            unmatchedSessionsCount: unmatchedSessions.length,
            unmatchedSessions
          });
          console.log('=== END SESSION MATCHING ANALYSIS ===');

          // Log missing session IDs - sessions that were returned by API but not found in MongoDB
          const missingSessionIds = sessions.filter(session => !session.id);
          if (missingSessionIds.length > 0) {
            console.log('=== MISSING SESSION IDS ===');
            console.log({
              websiteId,
              missingSessionsCount: missingSessionIds.length,
              missingSessionIds: missingSessionIds.map(s => s.id)
            });
            console.log('=== END MISSING SESSION IDS ===');
          }

          totalSessionsProcessed += sessions.length;
          totalUsersUpdated += websiteUsersUpdated;

          // Update website sync status in SystemConfig
          await this.updateWebsiteSyncStatus(websiteId, endDate.toISOString().split('T')[0], sessions.length);

          logger.info(`Website ${websiteId} sync completed`, {
            sessionsProcessed: sessions.length,
            usersUpdated: websiteUsersUpdated
          });

        } catch (error) {
          logger.error('Failed to sync website', { websiteId, error });
          await this.incrementWebsiteErrorCount(websiteId);
          // Continue with other websites
        }
      }

      logger.info('Analytics sync summary', {
        totalSessionsProcessed,
        totalUsersUpdated,
        websitesProcessed: this.websiteIds.length
      });

      logger.info('Analytics sync completed', {
        totalSessionsProcessed,
        totalUsersUpdated,
        websitesProcessed: this.websiteIds.length
      });

    } catch (error) {
      logger.error('Analytics sync failed', { error });
      throw error;
    } finally {
      // Clear token after processing
      this.apiService.clearToken();
    }
  }

  /**
   * Update user session IDs sequentially (simple approach)
   */
  private async updateUserSessionsSequential(sessions: MySqlSession[]): Promise<void> {
    logger.debug(LOG_MESSAGES.BATCH_UPDATE_STARTED, { sessionCount: sessions.length });

    let updatedCount = 0;
    const db = DatabaseService.getInstance().getConnection();
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collection = db.collection('users');

    for (const session of sessions) {
      try {
        const result = await collection.updateOne(
          { email: session.distinct_id.toLowerCase() },
          {
            $set: {
              session_id: session.session_id,
              updatedAt: new Date()
            }
          }
        );

        updatedCount += result.modifiedCount;
        logger.debug('Updated session for user', {
          email: session.distinct_id,
          matched: result.matchedCount,
          modified: result.modifiedCount
        });

      } catch (error) {
        logger.error('Failed to update session for user', {
          email: session.distinct_id,
          error: error instanceof Error ? error.message : error
        });
        // Continue with other sessions even if one fails
      }
    }

    logger.info('Session sync completed', { updatedCount, totalSessions: sessions.length });

    if (updatedCount === 0) {
      throw new Error('No users were updated with session IDs');
    }
  }

  /**
   * Update single user analytics data (avoiding Mongoose bulkWrite timeout issues)
   */
  private async updateSingleUserAnalytics(session: UmamiSession): Promise<BatchUpdateResult> {
    const db = DatabaseService.getInstance().getConnection();
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collection = db.collection('users');

    try {
      const result = await collection.updateOne(
        { session_id: session.id },
        {
          $set: {
            umamiAnalytics: {
              id: session.id,
              websiteId: session.websiteId,
              browser: session.browser || '',
              os: session.os || '',
              device: session.device || '',
              screen: session.screen || '',
              language: session.language || '',
              country: session.country || '',
              region: session.region || '',
              city: session.city || '',
              firstAt: new Date(session.firstAt),
              lastAt: new Date(session.lastAt),
              visits: session.visits || 0,
              views: String(session.views || 0), // Ensure string type
              createdAt: new Date(session.createdAt),
            },
            updatedAt: new Date()
          }
        }
      );

      // Note: Individual session matching is now handled in the main loop analysis

      return {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        insertedCount: 0,
        deletedCount: 0
      } as BatchUpdateResult;
    } catch (error) {
      logger.error(`Failed to update analytics for session ${session.id}`, { error });
      throw error;
    }
  }

  
  /**
   * Update individual website sync status
   */
  private async updateWebsiteSyncStatus(websiteId: string, syncDay: string, sessionsProcessed: number): Promise<void> {
    try {
      const db = DatabaseService.getInstance().getConnection();
      if (!db) {
        throw new Error('Database connection not established');
      }

      const collection = db.collection('systemconfigs');
      const status: WebsiteSyncStatus = {
        lastSync: new Date(),
        lastDaySynced: syncDay,
        sessionsProcessed,
        errorCount: 0, // Reset error count on successful sync
      };

      await collection.updateOne(
        { _id: 'global' as any },
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
      const db = DatabaseService.getInstance().getConnection();
      if (!db) {
        throw new Error('Database connection not established');
      }

      const collection = db.collection('systemconfigs');
      await collection.updateOne(
        { _id: 'global' as any },
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
    const websiteIdsStr = process.env['UMAMI_WEBSITE_IDS'] || '';
    return websiteIdsStr.split(',').map(id => id.trim()).filter(Boolean);
  }

  /**
   * Get current sync status from SystemConfig
   */
  static async getSyncStatus(): Promise<UmamiSyncStatus | null> {
    try {
      const db = DatabaseService.getInstance().getConnection();
      if (!db) {
        return null;
      }

      const collection = db.collection('systemconfigs');
      const config = await collection.findOne({ _id: 'global' as any });
      return config?.umamiSync || null;
    } catch (error) {
      logger.error('Failed to get sync status', { error });
      return null;
    }
  }

  /**
   * Determine sync window based on last successful sync
   */
  private async determineSyncWindow(): Promise<{
    startDate: Date;
    endDate: Date;
    syncType: 'initial' | 'incremental';
  }> {
    const db = DatabaseService.getInstance().getConnection();
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collection = db.collection('systemconfigs');
    const config = await collection.findOne({ _id: 'global' as any });
    const lastSuccessfulSync = config?.umamiSync?.lastSuccessfulSync;
    const today = new Date();

    if (!lastSuccessfulSync) {
      // Initial sync - sync configurable days from environment
      const initialSyncDays = parseInt(process.env['INITIAL_SYNC_DAYS'] || '7');
      const startDate = new Date(Date.now() - initialSyncDays * 24 * 60 * 60 * 1000);

      logger.info('Initial sync detected - syncing configured days', {
        initialSyncDays,
        startDate: startDate.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      });

      return {
        startDate,
        endDate: today,
        syncType: 'initial'
      };
    }

    // Always sync from last sync time (minus buffer) to today
    const bufferHours = DEFAULT_CONFIG.SYNC_BUFFER_HOURS;
    const startDate = new Date(new Date(lastSuccessfulSync).getTime() - bufferHours * 60 * 60 * 1000);
    
    logger.info('Syncing from last successful time (with buffer) to current time', {
      lastSyncTime: lastSuccessfulSync,
      startDateWithBuffer: startDate.toISOString(),
      currentTime: today.toISOString(),
      bufferHours
    });

    return {
      startDate, // Last sync time minus buffer
      endDate: today,                          
      syncType: 'incremental'
    };
  }

  /**
   * Update last successful sync timestamp
   */
  private async updateLastSuccessfulSync(syncStartTime: Date): Promise<void> {
    try {
      const db = DatabaseService.getInstance().getConnection();
      if (!db) {
        throw new Error('Database connection not established');
      }

      const collection = db.collection('systemconfigs');

      const updateData = {
        'umamiSync.lastSuccessfulSync': syncStartTime,
        'umamiSync.lastSessionSync': syncStartTime,
        'umamiSync.lastAnalyticsSync': syncStartTime,
      };

      await collection.updateOne(
        { _id: 'global' as any },
        {
          $set: updateData,
          $setOnInsert: {
            createdAt: new Date(),
            type: 'system'
          }
        },
        { upsert: true }
      );

      logger.info('Updated last successful sync timestamp', {
        syncStartTime: syncStartTime.toISOString()
      });
    } catch (error) {
      logger.error('Failed to update last successful sync timestamp', { error });
      // Don't throw here as this is not critical for the sync process
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