/**
 * Umami Function Secret Enums
 * Based on main repository's KeyVaultSecretEnum but minimized for this function
 */
export enum KeyVaultSecretEnum {
  // Database
  MongoConnectionString = "MONGODB",

  // Umami Configuration
  UmamiDbHost = "UMAMI_DB_HOST",
  UmamiDbPort = "UMAMI_DB_PORT",
  UmamiDbName = "UMAMI_DB_NAME",
  UmamiDbUser = "UMAMI_DB_USER",
  UmamiDbPassword = "UMAMI_DB_PASSWORD",
  UmamiDbSsl = "UMAMI_DB_SSL",
  UmamiApiBaseUrl = "UMAMI_API_BASE_URL",
  UmamiApiUsername = "UMAMI_API_USERNAME",
  UmamiApiPassword = "UMAMI_API_PASSWORD",
  UmamiWebsiteIds = "UMAMI_WEBSITE_IDS",
  InitialSyncDays = "INITIAL_SYNC_DAYS",
  SessionSyncWindowHours = "SESSION_SYNC_WINDOW_HOURS",
  ApiPageSize = "API_PAGE_SIZE",

}