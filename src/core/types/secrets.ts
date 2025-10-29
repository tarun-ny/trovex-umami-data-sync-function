/**
 * Umami Function Secret Enums
 * Based on main repository's KeyVaultSecretEnum but minimized for this function
 */
export enum KeyVaultSecretEnum {
  // Database
  MongoConnectionString = "MONGODB",

  // Umami Configuration
  UmamiDbHost = "UMAMI-DB-HOST",
  UmamiDbPort = "UMAMI-DB-PORT",
  UmamiDbName = "UMAMI-DB-NAME",
  UmamiDbUser = "UMAMI-DB-USER",
  UmamiDbPassword = "UMAMI-DB-PASSWORD",
  UmamiDbSsl = "UMAMI-DB-SSL",
  UmamiApiBaseUrl = "UMAMI-API-BASE-URL",
  UmamiApiUsername = "UMAMI-API-USERNAME",
  UmamiApiPassword = "UMAMI-API-PASSWORD",
  UmamiWebsiteIds = "UMAMI-WEBSITE-IDS",
  InitialSyncDays = "INITIAL-SYNC-DAYS",
  SessionSyncWindowHours = "SESSION-SYNC-WINDOW-HOURS",
  ApiPageSize = "API-PAGE-SIZE",

}