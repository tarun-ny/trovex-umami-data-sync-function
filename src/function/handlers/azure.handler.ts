import { app, InvocationContext, Timer } from '@azure/functions';
import { UmamiService } from '../../core/services/umami/umami.service';
import { loadEnv } from '../../core/config/env';
import { initializeLogger } from '../../core/utils/logger';
import { DatabaseService } from '../../core/models/database.service';
import { Logger } from '../../core/utils/logger';
import https from 'https';

async function timerTrigger(myTimer: Timer, context: InvocationContext): Promise<void> {
  context.log('🚀 Umami sync function started');

  // Get outbound IP address
  try {
    const outboundIp = await new Promise<string>((resolve, reject) => {
      https.get('https://api.ipify.org?format=json', (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const ipInfo = JSON.parse(data);
            resolve(ipInfo.ip);
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', reject);
    });
    context.log(`🌐 Current outbound IP: ${outboundIp}`);
  } catch (error) {
    context.log('⚠️  Failed to get outbound IP:', error);
  }

  // Validate timer trigger
  if (myTimer.isPastDue) {
    context.log('⚠️  Function is running late!');
  }

  let logger: Logger;
  let databaseService: DatabaseService | null = null;

  try {
    // Load environment variables
    await loadEnv();
    context.log('✅ Environment variables loaded');

    // Initialize logger
    logger = initializeLogger('azure');
    context.log('✅ Logger initialized');

    // Initialize database connection
    databaseService = DatabaseService.getInstance();
    await databaseService.connect();
    context.log('✅ Database connected');

    // Test connections
    const connectionResults = await UmamiService.testConnections();
    context.log('Connection test results:', connectionResults);

    // Get sync status
    const syncStatus = await UmamiService.getSyncStatus();
    context.log('Current sync status:', syncStatus);

    // Create and run Umami service
    const umamiService = new UmamiService();
    await umamiService.syncAllData();

    context.log('✅ Umami sync function completed successfully');

  } catch (error) {
    context.log('❌ Umami sync function failed:', error);

    // Log detailed error information
    if (error instanceof Error) {
      context.log('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }

    // Ensure database connection is closed on error
    if (databaseService) {
      try {
        await databaseService.disconnect();
      } catch (disconnectError) {
        context.log('Failed to disconnect from database:', disconnectError);
      }
    }

    // Re-throw the error to let Azure Functions know it failed
    throw error;
  } finally {
    // Ensure database connection is closed
    if (databaseService && databaseService.isConnected()) {
      try {
        await databaseService.disconnect();
        context.log('🔌 Database connection closed');
      } catch (error) {
        context.log('Failed to close database connection:', error);
      }
    }
  }
}

// Register the timer trigger with Azure Functions v4 programming model
app.timer('UmamiSync', {
  schedule: '0 */2 * * * *',
  handler: timerTrigger
});
