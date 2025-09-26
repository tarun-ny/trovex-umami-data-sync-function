import { createPool, Pool } from 'mysql2/promise';
import logger from '../../utils/logger';
import { MySqlSession } from './umami.types';
import { DEFAULT_CONFIG, ERROR_MESSAGES } from './umami.constants';

let pool: Pool | null = null;
let poolInitialized = false;

function ensurePool(): void {
  if (poolInitialized && pool) {
    return;
  }

  pool = createPool({
    host: process.env['UMAMI-DB-HOST'],
    port: parseInt(process.env['UMAMI-DB-PORT'] || '3306'),
    database: process.env['UMAMI-DB-NAME'],
    user: process.env['UMAMI-DB-USER'],
    password: process.env['UMAMI-DB-PASSWORD'],
    ssl: process.env['UMAMI-DB-SSL'] === 'true' ? { rejectUnauthorized: false } : undefined,
    connectionLimit: 10,
    multipleStatements: false,
    namedPlaceholders: false,
    dateStrings: false,
    supportBigNumbers: true,
    bigNumberStrings: false
  });

  poolInitialized = true;

  try {
    const target = {
      host: process.env['UMAMI-DB-HOST'],
      port: parseInt(process.env['UMAMI-DB-PORT'] || '3306'),
      database: process.env['UMAMI-DB-NAME'],
      user: process.env['UMAMI-DB-USER'],
      ssl: process.env['UMAMI-DB-SSL'] === 'true'
    };
    console.log('🛰️  Umami MySQL target:', target);
  } catch {
    // ignore
  }
}

export class UmamiDbService {
  /**
   * Get sessions created after specified timestamp from Umami MySQL database
   * @param startTime - The timestamp to get sessions after
   * @returns Array of sessions
   */
  static async getSessionsCreatedAfter(startTime: Date): Promise<MySqlSession[]> {
    ensurePool();
    const query = `
      SELECT session_id, created_at, distinct_id
      FROM session
      WHERE created_at >= ?
      ORDER BY created_at ASC
    `;

    try {
      const [result] = await (pool as Pool).execute(query, [startTime]);
      const sessionsData = (result as any[]).map((row: any) => ({
        session_id: row.session_id,
        created_at: row.created_at,
        distinct_id: row.distinct_id,
      }));

      const sessionIds = sessionsData.map((s: any) => s.session_id);

      console.log('=== MYSQL SESSIONS DATA FETCH ===');
      console.log({
        count: (result as any[]).length,
        startTime,
        sessionIds
      });
      console.log('=== END MYSQL SESSIONS DATA ===');
      logger.debug('Umami sessions query result:', { count: (result as any[]).length, startTime });

      return (result as any[]).map((row: any) => ({
        session_id: row.session_id,
        created_at: new Date(row.created_at),
        distinct_id: row.distinct_id,
      }));
    } catch (error) {
      const err: any = error;
      console.error('MySQL error details:', {
        message: err?.message,
        code: err?.code,
        errno: err?.errno,
        sqlState: err?.sqlState,
        address: err?.address,
        port: err?.port
      });
      logger.error('Error querying Umami sessions:', error);
      throw new Error(ERROR_MESSAGES.DB_CONNECTION_FAILED);
    }
  }

  /**
   * Get sessions created within the last specified hours (for session sync)
   * @param hours - Number of hours to look back
   * @returns Array of sessions
   */
  static async getRecentSessions(hours: number = DEFAULT_CONFIG.SESSION_SYNC_WINDOW_HOURS): Promise<MySqlSession[]> {
    ensurePool();
    const startTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.getSessionsCreatedAfter(startTime);
  }

  /**
   * Get sessions created after a specific start date (for dynamic sync windows)
   * @param startDate - Start date to get sessions after
   * @returns Array of sessions
   */
  static async getSessionsAfterDate(startDate: Date): Promise<MySqlSession[]> {
    ensurePool();
    return this.getSessionsCreatedAfter(startDate);
  }

  /**
   * Test the database connection
   * @returns true if connection is successful
   */
  static async testConnection(): Promise<boolean> {
    try {
      ensurePool();
      const [result] = await (pool as Pool).execute('SELECT NOW()');
      logger.info('Umami database connection test successful:', (result as any[])[0]);
      return true;
    } catch (error) {
      const err: any = error;
      console.error('MySQL connection test error details:', {
        message: err?.message,
        code: err?.code,
        errno: err?.errno,
        sqlState: err?.sqlState,
        address: err?.address,
        port: err?.port
      });
      logger.error('Umami database connection test failed:', error);
      return false;
    }
  }

  /**
   * Get database pool statistics for monitoring
   * @returns Pool statistics
   */
  static async getPoolStats(): Promise<{
    totalConnections: number;
    freeConnections: number;
    allConnections: number;
  }> {
    ensurePool();
    const connection = await (pool as Pool).getConnection();
    const stats = {
      totalConnections: 0, // MySQL2 doesn't expose these directly
      freeConnections: 0, // MySQL2 doesn't expose these directly
      allConnections: 0 // MySQL2 doesn't expose these directly
    };
    connection.release();
    return stats;
  }

  /**
   * Close the connection pool
   */
  static async closePool(): Promise<void> {
    try {
      if (pool) {
        await pool.end();
        pool = null;
        poolInitialized = false;
      }
      logger.info('Umami database connection pool closed');
    } catch (error) {
      logger.error('Error closing Umami database connection pool:', error);
    }
  }
}

// Export pool for direct access if needed (lazy-initialized)
export { pool };