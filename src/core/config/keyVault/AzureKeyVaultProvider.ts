import { ClientSecretCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import fs from "fs";
import path from "path";
import logger from "../../utils/logger";
import { KeyVaultSecretEnum } from "../../types/secrets";
import { ALL_SECRETS } from "./secreteCategories";
import dotenv from "dotenv";

// Secret name mapping: Key Vault name → Environment variable name
const SECRET_NAME_MAPPING: Record<string, string> = {
  'UMAMI-DB-HOST': 'UMAMI_DB_HOST',
  'UMAMI-DB-PORT': 'UMAMI_DB_PORT',
  'UMAMI-DB-NAME': 'UMAMI_DB_NAME',
  'UMAMI-DB-USER': 'UMAMI_DB_USER',
  'UMAMI-DB-PASSWORD': 'UMAMI_DB_PASSWORD',
  'UMAMI-DB-SSL': 'UMAMI_DB_SSL',
  'UMAMI-API-BASE-URL': 'UMAMI_API_BASE_URL',
  'UMAMI-API-USERNAME': 'UMAMI_API_USERNAME',
  'UMAMI-API-PASSWORD': 'UMAMI_API_PASSWORD',
  'UMAMI-WEBSITE-IDS': 'UMAMI_WEBSITE_IDS',
  'INITIAL-SYNC-DAYS': 'INITIAL_SYNC_DAYS',
  'SESSION-SYNC-WINDOW-HOURS': 'SESSION_SYNC_WINDOW_HOURS',
  'BATCH-SIZE': 'BATCH_SIZE',
  'API-PAGE-SIZE': 'API_PAGE_SIZE',
  'LOG-LEVEL': 'LOG_LEVEL',
  'MONGODB': 'MONGODB'
};

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const keyVaultConfig = {
  vaultUrl: process.env.AZURE_KEY_VAULT_URL!,
  tenantId: process.env.AZURE_TENANT_ID!,
  clientId: process.env.AZURE_CLIENT_ID!,
  clientSecret: process.env.AZURE_CLIENT_SECRET!,
};

const azureTagName = process.env.AZURE_KEY_VAULT_TAG ?? "";

let client: SecretClient | null = null;

function getAzureClient() {
  if (!client) {
    const credential = new ClientSecretCredential(keyVaultConfig.tenantId, keyVaultConfig.clientId, keyVaultConfig.clientSecret);
    client = new SecretClient(keyVaultConfig.vaultUrl, credential);
  }
  return client;
}

async function fetchSecretsFromAzureVault(secretName: string): Promise<string | undefined> {
  try {
    logger.debug(`Fetching secret: ${secretName}`);

    const tagSensitiveSecrets: KeyVaultSecretEnum[] = [
      KeyVaultSecretEnum.MongoConnectionString,
    ];

    // Only fetch if the secret is part of the enum
    if (Object.values(KeyVaultSecretEnum).includes(secretName as KeyVaultSecretEnum)) {
      const shouldUseTag = tagSensitiveSecrets.includes(secretName as KeyVaultSecretEnum);
      const finalSecretName = shouldUseTag && azureTagName ? `${secretName}-${azureTagName}` : secretName;

      const azureClient = getAzureClient();
      const fetchedSecret = await azureClient.getSecret(finalSecretName);
      logger.info(`Fetched secret from Azure Key Vault: ${finalSecretName}`);

      return fetchedSecret.value;
    }
  } catch (error) {
    logger.error(`Error retrieving secret ${secretName}`, { error });
  }
  return undefined;
}

async function loadAzureSecretsToEnv(): Promise<void> {
  const keysToLoad = [...ALL_SECRETS];
  const envVars: string[] = [];

  logger.info("🔐 Fetching Azure Key Vault secrets...");

  for (const secretKey of keysToLoad) {
    try {
      const secretValue = await fetchSecretsFromAzureVault(secretKey as string);
      if (secretValue) {
        // Map Key Vault name to environment variable name
        const envVarName = SECRET_NAME_MAPPING[secretKey as string] || secretKey as string;
        process.env[envVarName] = secretValue;
        envVars.push(`${envVarName}=${JSON.stringify(secretValue)}`);
        logger.debug(`✅ Loaded ${secretKey} → ${envVarName}`);
      } else {
        logger.warn(`⚠️ Secret ${secretKey} is empty or undefined`);
      }
    } catch (error) {
      logger.error(`❌ Failed to load secret: ${secretKey}`, { error });
      // Don't throw here to allow partial loading, but log the error
    }
  }

  logger.info(`🔐 Loaded ${envVars.length} secrets from Azure Key Vault`);
}

export class AzureKeyVaultProvider {
  static async loadSecrets(): Promise<void> {
    return loadAzureSecretsToEnv();
  }
}

export { loadAzureSecretsToEnv };
