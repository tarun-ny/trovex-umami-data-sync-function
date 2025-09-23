import { Pool } from 'pg';
import logger from '../../utils/logger';
import { PostgresSession } from './umami.types';
import { DEFAULT_CONFIG, ERROR_MESSAGES } from './umami.constants';

const pool = new Pool({
  host: process.env.UMAMI_DB_HOST,
  port: parseInt(process.env.UMAMI_DB_PORT || '5432'),
  database: process.env.UMAMI_DB_NAME,
  user: process.env.UMAMI_DB_USER,
  password: process.env.UMAMI_DB_PASSWORD,
  ssl: process.env.UMAMI_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a connection
});

export class UmamiDbService {
  /**
   * Get sessions created after specified timestamp from Umami PostgreSQL database
   * @param startTime - The timestamp to get sessions after
   * @returns Array of sessions
   */
  static async getSessionsCreatedAfter(startTime: Date): Promise<PostgresSession[]> {
    const query = `
      SELECT session_id, created_at, distinct_id
      FROM session
      WHERE created_at >= $1
      ORDER BY created_at ASC
    `;

    try {
      const result = await pool.query(query, [startTime]);
      console.log('Umami sessions query executed:', result);
      logger.debug('Umami sessions query result:', { count: result.rows.length, startTime });

      return result.rows.map(row => ({
        session_id: row.session_id,
        created_at: new Date(row.created_at),
        distinct_id: row.distinct_id,
      }));
    } catch (error) {
      logger.error('Error querying Umami sessions:', error);
      throw new Error(ERROR_MESSAGES.DB_CONNECTION_FAILED);
    }
  }

  /**
   * Get sessions created within the last specified hours (for session sync)
   * @param hours - Number of hours to look back
   * @returns Array of sessions
   */
  static async getRecentSessions(hours: number = DEFAULT_CONFIG.SESSION_SYNC_WINDOW_HOURS): Promise<PostgresSession[]> {
    const startTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.getSessionsCreatedAfter(startTime);
  }

  /**
   * Get sessions created after a specific start date (for dynamic sync windows)
   * @param startDate - Start date to get sessions after
   * @returns Array of sessions
   */
  static async getSessionsAfterDate(startDate: Date): Promise<PostgresSession[]> {
    return this.getSessionsCreatedAfter(startDate);
  }

  /**
   * Test the database connection
   * @returns true if connection is successful
   */
  static async testConnection(): Promise<boolean> {
    try {
      const result = await pool.query('SELECT NOW()');
      logger.info('Umami database connection test successful:', result.rows[0]);
      return true;
    } catch (error) {
      logger.error('Umami database connection test failed:', error);
      return false;
    }
  }

  /**
   * Get database pool statistics for monitoring
   * @returns Pool statistics
   */
  static async getPoolStats(): Promise<{
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  }> {
    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  }

  /**
   * Close the connection pool
   */
  static async closePool(): Promise<void> {
    try {
      await pool.end();
      logger.info('Umami database connection pool closed');
    } catch (error) {
      logger.error('Error closing Umami database connection pool:', error);
    }
  }
}

// Export pool for direct access if needed
export { pool };