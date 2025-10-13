import * as fs from 'fs';
import * as path from 'path';
import { KeyVaultSecretEnum } from '../types/secrets';
import { AzureKeyVaultProvider } from './keyVault/AzureKeyVaultProvider';
import { ISecretProvider } from './keyVault/ISecretProvider';
import { secretProviderFactory } from './keyVault/secretProviderFactory';

/**
 * Load environment variables from appropriate source
 */
export async function loadEnv(): Promise<void> {
  console.log('🔑 Loading environment variables...');

  try {
    // Step 1: Load local.settings.json (for local dev) or use process.env (for Azure)
    loadLocalSettings();
    
    // Step 2: Determine secret source - default to Key Vault unless USE_LOCAL is set
    const useLocal = process.env.USE_LOCAL === 'true';
    
    if (useLocal) {
      // Local mode: All secrets already loaded from local.settings.json
      console.log('📝 Using local.settings.json for application secrets (USE_LOCAL=true)');
      console.log('✅ All secrets loaded from local.settings.json');
    } else {
      // Azure Key Vault mode (default): Fetch app secrets from Key Vault
      console.log('🔐 Using Azure Key Vault for application secrets (default)');
      await loadFromKeyVault();
      console.log('✅ Loaded application secrets from Key Vault');
    }
  } catch (error) {
    console.error('❌ Failed to load environment variables:', error);
    throw error;
  }
}

/**
 * Load environment variables from local.settings.json
 */
function loadLocalSettings(): void {
  const localSettingsPath = path.resolve(process.cwd(), 'local.settings.json');
  
  // Check if running in Azure (process.env already populated by Azure)
  if (!fs.existsSync(localSettingsPath)) {
    console.log('📦 Running in Azure - using App Settings from process.env');
    return;
  }

  try {
    const settingsFile = fs.readFileSync(localSettingsPath, 'utf-8');
    const settings = JSON.parse(settingsFile);
    
    if (settings.Values) {
      // Load all values from local.settings.json into process.env
      Object.keys(settings.Values).forEach(key => {
        // Don't overwrite existing environment variables
        if (!process.env[key]) {
          process.env[key] = settings.Values[key];
        }
      });
      
      console.log(`✅ Loaded ${Object.keys(settings.Values).length} values from local.settings.json`);
    }
  } catch (error) {
    console.error('❌ Failed to load local.settings.json:', error);
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