import { beforeAll, afterAll } from 'vitest';
import { loadEnv } from '../core/config/env';
import { DatabaseService } from '../core/models/database.service';

let databaseService: DatabaseService;

// Setup before all tests
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');

  try {
    // Load environment variables
    await loadEnv();
    console.log('✅ Environment variables loaded');

    // Initialize database connection
    databaseService = DatabaseService.getInstance();
    await databaseService.connect();
    console.log('✅ Database connected for tests');

  } catch (error) {
    console.error('❌ Test setup failed:', error);
    throw error;
  }
});

// Cleanup after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');

  try {
    // Close database connection
    if (databaseService && databaseService.isConnected()) {
      await databaseService.disconnect();
      console.log('✅ Database connection closed');
    }

  } catch (error) {
    console.error('❌ Test cleanup failed:', error);
    throw error;
  }
});

// Export for use in test files
export { databaseService };