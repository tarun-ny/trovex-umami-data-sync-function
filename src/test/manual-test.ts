import { UmamiService } from '../core/services/umami/umami.service';
import { loadEnv } from '../core/config/env';
import { initializeLogger } from '../core/utils/logger';
import { DatabaseService } from '../core/models/database.service';

/**
 * Manual test runner for Umami sync functionality
 * This can be run locally without Azure Functions runtime
 */
async function manualTest() {
  console.log('🧪 Starting manual Umami sync test...');

  let databaseService: DatabaseService | null = null;

  try {
    // Load environment variables
    await loadEnv();
    console.log('✅ Environment variables loaded');

    // Initialize logger
    const logger = initializeLogger('console');
    console.log('✅ Logger initialized');

    // Initialize database connection
    databaseService = DatabaseService.getInstance();
    await databaseService.connect();
    console.log('✅ Database connected');

    // Test connections
    const connectionResults = await UmamiService.testConnections();
    console.log('Connection test results:', connectionResults);

    // Get sync status
    const syncStatus = await UmamiService.getSyncStatus();
    console.log('Current sync status:', syncStatus);

    // Create and run Umami service
    const umamiService = new UmamiService();
    await umamiService.syncAllData();

    console.log('✅ Manual test completed successfully');

  } catch (error) {
    console.error('❌ Manual test failed:', error);

    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }

    process.exit(1);
  } finally {
    // Ensure database connection is closed
    if (databaseService && databaseService.isConnected()) {
      try {
        await databaseService.disconnect();
        console.log('🔌 Database connection closed');
      } catch (error) {
        console.error('Failed to close database connection:', error);
      }
    }
  }
}

/**
 * Test specific components
 */
async function testConnections() {
  console.log('🔧 Testing connections...');

  try {
    await loadEnv();
    const logger = initializeLogger('console');
    const connectionResults = await UmamiService.testConnections();
    console.log('Connection test results:', connectionResults);

    return connectionResults;
  } catch (error) {
    console.error('Connection test failed:', error);
    throw error;
  }
}

/**
 * Test sync status
 */
async function testSyncStatus() {
  console.log('📊 Testing sync status...');

  try {
    await loadEnv();
    const logger = initializeLogger('console');
    const syncStatus = await UmamiService.getSyncStatus();
    console.log('Current sync status:', syncStatus);

    return syncStatus;
  } catch (error) {
    console.error('Sync status test failed:', error);
    throw error;
  }
}

// CLI argument handling
const args = process.argv.slice(2);
const command = args[0] || 'sync';

switch (command) {
  case 'sync':
    manualTest();
    break;
  case 'connections':
    testConnections()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
    break;
  case 'status':
    testSyncStatus()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
    break;
  default:
    console.log('Usage: npm run test:manual [sync|connections|status]');
    console.log('  sync        - Run full sync test');
    console.log('  connections - Test database and API connections');
    console.log('  status      - Check current sync status');
    process.exit(1);
}

// Export for programmatic use
export { manualTest, testConnections, testSyncStatus };

// Run if this file is executed directly
if (require.main === module && command === 'sync') {
  manualTest();
}