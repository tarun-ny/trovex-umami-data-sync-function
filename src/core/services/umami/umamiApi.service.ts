import axios, { all } from 'axios';
import logger from '../../utils/logger';
import {
  UmamiSession,
  UmamiApiResponse,
  UmamiAuthResponse,
  UmamiLoginRequest,
  SyncResult
} from './umami.types';
import {
  API_ENDPOINTS,
  DEFAULT_CONFIG,
  ERROR_MESSAGES,
  LOG_MESSAGES
} from './umami.constants';

export class UmamiApiService {
  private baseUrl: string;
  private username: string;
  private password: string;
  private currentToken: string | null = null;
  public websiteIds: string[];

  constructor() {
    this.baseUrl = process.env.UMAMI_API_BASE_URL || '';
    this.username = process.env.UMAMI_API_USERNAME || '';
    this.password = process.env.UMAMI_API_PASSWORD || '';
    this.websiteIds = this.getWebsiteIds();

    if (!this.baseUrl || !this.username || !this.password) {
      throw new Error(ERROR_MESSAGES.MISSING_CONFIG);
    }
  }

  /**
   * Authenticate with Umami API and get access token
   * @returns Access token
   */
  async authenticate(): Promise<string> {
    try {
      const loginData: UmamiLoginRequest = {
        username: this.username,
        password: this.password,
      };

      const response = await axios.post<UmamiAuthResponse>(
        `${this.baseUrl}${API_ENDPOINTS.LOGIN}`,
        loginData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      this.currentToken = response.data.token;
      logger.debug('Successfully authenticated with Umami API');
      return this.currentToken;
    } catch (error) {
      logger.error('Umami API authentication failed', { error });
      throw new Error(ERROR_MESSAGES.API_AUTH_FAILED);
    }
  }

  /**
   * Get current token
   * @returns Access token
   */
  getToken(): string {
    if (!this.currentToken) {
      throw new Error('No token available. Call authenticate() first.');
    }
    return this.currentToken;
  }

  /**
   * Clear the current token (call after all sync is complete)
   */
  clearToken(): void {
    this.currentToken = null;
    logger.debug('Umami API token cleared');
  }

  /**
   * Fetch sessions from Umami API for a specific website and time range
   * @param websiteId - The website ID
   * @param startTimestamp - Start timestamp in milliseconds
   * @param endTimestamp - End timestamp in milliseconds
   * @param page - Page number for pagination
   * @param pageSize - Number of sessions per page
   * @returns API response with sessions data
   */
  private async fetchSessionsPage(
    websiteId: string,
    startTimestamp: number,
    endTimestamp: number,
    page: number,
    pageSize: number = DEFAULT_CONFIG.API_PAGE_SIZE
  ): Promise<UmamiApiResponse> {
    try {
      const token = this.getToken();
      const url = `${this.baseUrl}${API_ENDPOINTS.SESSIONS.replace('{websiteId}', websiteId)}`;

      const response = await axios.get<UmamiApiResponse>(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: {
          startAt: startTimestamp,
          endAt: endTimestamp,
          page,
          pageSize,
        },
      });

      logger.debug('Fetched sessions page', {
        websiteId,
        page,
        count: response.data.data.length,
        total: response.data.count
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch sessions from Umami API', {
        websiteId,
        page,
        error
      });
      throw new Error(ERROR_MESSAGES.API_REQUEST_FAILED);
    }
  }

  /**
   * Fetch all sessions for a website within a time range (handles pagination)
   * @param websiteId - The website ID
   * @param startTimestamp - Start timestamp in milliseconds
   * @param endTimestamp - End timestamp in milliseconds
   * @returns Array of all sessions
   */
  async fetchAllSessions(
    websiteId: string,
    startTimestamp: number,
    endTimestamp: number
  ): Promise<UmamiSession[]> {
    const allSessions: UmamiSession[] = [];
    let page = 1;
    let hasMoreData = true;

    logger.info(LOG_MESSAGES.WEBSITE_SYNC_STARTED, { websiteId });

    try {
      while (hasMoreData) {
        const response = await this.fetchSessionsPage(
          websiteId,
          startTimestamp,
          endTimestamp,
          page
        );

        allSessions.push(...response.data);

        // Check if we have more data
        hasMoreData = response.data.length === response.pageSize;
        page++;

        // Safety check to prevent infinite loops
        if (page > 1000) {
          logger.warn('Reached maximum page limit, stopping pagination', { websiteId, page });
          break;
        }
      }

      logger.info(LOG_MESSAGES.WEBSITE_SYNC_COMPLETED, {
        websiteId,
        sessionsCount: allSessions.length
      });

      const sessionIds = allSessions.map(s => s.id);

      console.log('=== UMAMI API COMPLETE SESSIONS DATA ===');
      console.log({
        websiteId,
        count: allSessions.length,
        sessionIds
      });
      console.log('=== END UMAMI API SESSIONS DATA ===');

      return allSessions;
    } catch (error) {
      logger.error('Failed to fetch all sessions for website', { websiteId, error });
      throw error;
    }
  }

  /**
   * Get timestamp range for a specific day
   * @param dateStr - Date string in YYYY-MM-DD format
   * @returns Start and end timestamps in milliseconds
   */
  static getDayTimestamps(dateStr: string): { startTimestamp: number; endTimestamp: number } {
    const date = new Date(dateStr);
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

    return {
      startTimestamp: startOfDay.getTime(),
      endTimestamp: endOfDay.getTime() - 1, // End of the day
    };
  }

  /**
   * Get yesterday's date string in YYYY-MM-DD format
   * @returns Yesterday's date string
   */
  static getYesterdayDateString(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  /**
   * Get configured website IDs from environment
   */
  private getWebsiteIds(): string[] {
    const websiteIdsStr = process.env.UMAMI_WEBSITE_IDS || '';
    return websiteIdsStr.split(',').map(id => id.trim()).filter(Boolean);
  }
}