import * as dotenv from 'dotenv';
import { KeyVaultSecretEnum } from '../types/secrets';
import { AzureKeyVaultProvider } from './keyVault/AzureKeyVaultProvider';
import { ISecretProvider } from './keyVault/ISecretProvider';
import { secretProviderFactory } from './keyVault/secretProviderFactory';

dotenv.config();

/**
 * Load environment variables from appropriate source
 */
export async function loadEnv(): Promise<void> {
  const keysEnv = process.env.KEYS_ENV || 'local';

  try {
    switch (keysEnv) {
      case 'keyvault':
        await loadFromKeyVault();
        break;
      case 'local':
      default:
        loadFromLocalEnv();
        break;
    }
  } catch (error) {
    console.error('Failed to load environment variables:', error);
    throw error;
  }
}

/**
 * Load secrets from Azure Key Vault
 */
async function loadFromKeyVault(): Promise<void> {
  console.log('🔑 Loading secrets from Azure Key Vault...');

  try {
    const provider: ISecretProvider = secretProviderFactory.getSecretProvider();
    await provider.loadSecretsToEnv();
    console.log('✅ Secrets loaded successfully from Azure Key Vault');
  } catch (error) {
    console.error('❌ Failed to load secrets from Azure Key Vault:', error);
    throw error;
  }
}

/**
 * Load environment variables from local .env files
 */
function loadFromLocalEnv(): void {
  console.log('📝 Loading environment variables from local .env files...');

  // Load from multiple .env files if they exist
  const envFiles = [
    '.env.local',
    '.env.development',
    '.env'
  ];

  for (const file of envFiles) {
    if (require('fs').existsSync(file)) {
      console.log(`Loading from ${file}`);
      dotenv.config({ path: file });
    }
  }

  // Validate required environment variables for local development
  const requiredVars = [
    'MONGODB',
    'UMAMI_DB_HOST',
    'UMAMI_DB_NAME',
    'UMAMI_DB_USER',
    'UMAMI_DB_PASSWORD',
    'UMAMI_API_BASE_URL',
    'UMAMI_API_USERNAME',
    'UMAMI_API_PASSWORD',
    'UMAMI_WEBSITE_IDS'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.warn('⚠️  Missing required environment variables:', missingVars.join(', '));
    console.warn('Please check your .env.local file');
  }

  console.log('✅ Environment variables loaded from local files');
}

/**
 * Get environment variable with optional default value
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
}

/**
 * Get boolean environment variable
 */
export function getBoolEnv(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get number environment variable
 */
export function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} must be a number, got: ${value}`);
  }
  return num;
}