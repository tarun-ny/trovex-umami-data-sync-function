// Umami Integration TypeScript Interfaces

export interface UmamiSession {
  id: string;
  websiteId: string;
  browser: string;
  os: string;
  device: string;
  screen: string;
  language: string;
  country?: string;
  region?: string;
  city?: string;
  firstAt: Date;
  lastAt: Date;
  visits: number;
  views: string;
  createdAt: Date;
}

export interface UmamiApiResponse {
  data: UmamiSession[];
  count: number;
  page: number;
  pageSize: number;
}

export interface UmamiAuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: string;
    createdAt: Date;
    isAdmin: boolean;
  };
}

export interface UmamiLoginRequest {
  username: string;
  password: string;
}

export interface WebsiteSyncStatus {
  lastSync?: Date;
  lastDaySynced?: string;
  sessionsProcessed?: number;
  errorCount?: number;
}

export interface UmamiSyncStatus {
  lastSessionSync?: Date;
  lastAnalyticsSync?: Date;
  websiteSyncStatus?: {
    [websiteId: string]: WebsiteSyncStatus;
  };
}

export interface MySqlSession {
  session_id: string;
  created_at: Date;
  distinct_id: string;
}

export interface SyncResult {
  success: boolean;
  sessionsProcessed?: number;
  usersUpdated?: number;
  error?: string;
  websiteId?: string;
}

export interface BatchUpdateResult {
  matchedCount: number;
  modifiedCount: number;
}