// Umami Integration Configuration Constants

// Environment variable names (matching Key Vault format)
export const UMAMI_ENV_VARS = {
  DB_HOST: 'UMAMI-DB-HOST',
  DB_PORT: 'UMAMI-DB-PORT',
  DB_NAME: 'UMAMI-DB-NAME',
  DB_USER: 'UMAMI-DB-USER',
  DB_PASSWORD: 'UMAMI-DB-PASSWORD',
  DB_SSL: 'UMAMI-DB-SSL',
  API_BASE_URL: 'UMAMI-API-BASE-URL',
  API_USERNAME: 'UMAMI-API-USERNAME',
  API_PASSWORD: 'UMAMI-API-PASSWORD',
  WEBSITE_IDS: 'UMAMI-WEBSITE-IDS',
  INITIAL_SYNC_DAYS: 'INITIAL-SYNC-DAYS',
  SESSION_SYNC_WINDOW_HOURS: 'SESSION-SYNC-WINDOW-HOURS',
  BATCH_SIZE: 'BATCH-SIZE',
  API_PAGE_SIZE: 'API-PAGE-SIZE',
} as const;

// Default configuration values
export const DEFAULT_CONFIG = {
  INITIAL_SYNC_DAYS: 7,
  SESSION_SYNC_WINDOW_HOURS: 24,
  BATCH_SIZE: 100,
  API_PAGE_SIZE: 100,
  DB_PORT: 3306,
  DB_SSL: false,
} as const;

// API endpoints
export const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  SESSIONS: '/api/websites/{websiteId}/sessions',
} as const;

// Date formats
export const DATE_FORMATS = {
  DATE_ONLY: 'YYYY-MM-DD',
  ISO_8601: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
} as const;

// Sync status
export const SYNC_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PARTIAL: 'partial',
  IN_PROGRESS: 'in_progress',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  MISSING_CONFIG: 'Missing required configuration',
  DB_CONNECTION_FAILED: 'Failed to connect to Umami MySQL database',
  API_AUTH_FAILED: 'Failed to authenticate with Umami API',
  API_REQUEST_FAILED: 'Failed to fetch data from Umami API',
  INVALID_WEBSITE_ID: 'Invalid website ID',
  NO_SESSIONS_FOUND: 'No sessions found for the specified time period',
  BATCH_UPDATE_FAILED: 'Failed to update user records in batch',
} as const;

// Log messages
export const LOG_MESSAGES = {
  SYNC_STARTED: 'Umami sync process started',
  SYNC_COMPLETED: 'Umami sync process completed successfully',
  SYNC_FAILED: 'Umami sync process failed',
  SESSION_SYNC_STARTED: 'Session ID sync started',
  SESSION_SYNC_COMPLETED: 'Session ID sync completed',
  ANALYTICS_SYNC_STARTED: 'Analytics data sync started',
  ANALYTICS_SYNC_COMPLETED: 'Analytics data sync completed',
  WEBSITE_SYNC_STARTED: 'Started sync for website',
  WEBSITE_SYNC_COMPLETED: 'Completed sync for website',
  BATCH_UPDATE_STARTED: 'Started batch update of user records',
  BATCH_UPDATE_COMPLETED: 'Completed batch update of user records',
} as const;