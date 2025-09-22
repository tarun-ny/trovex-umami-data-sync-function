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
  BatchSize = "BATCH-SIZE",
  ApiPageSize = "API-PAGE-SIZE",

  // Azure Key Vault Configuration
  AzureKeyVaultUrl = "AZURE-KEY-VAULT-URL",
  AzureTenantId = "AZURE-TENANT-ID",
  AzureClientId = "AZURE-CLIENT-ID",
  AzureClientSecret = "AZURE-CLIENT-SECRET",
  AzureKeyVaultTag = "AZURE-KEY-VAULT-TAG",

  // Logging
  LogLevel = "LOG-LEVEL",
}