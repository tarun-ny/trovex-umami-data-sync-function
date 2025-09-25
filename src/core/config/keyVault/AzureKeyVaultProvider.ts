import { ClientSecretCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import fs from "fs";
import path from "path";
import logger from "../../utils/logger";
import { KeyVaultSecretEnum } from "../../types/secrets";
import { ALL_SECRETS } from "./secreteCategories";
import dotenv from "dotenv";


dotenv.config();

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
        // Use Key Vault name directly as environment variable name
        process.env[secretKey as string] = secretValue;
        envVars.push(`${secretKey}=${JSON.stringify(secretValue)}`);
        logger.debug(`✅ Loaded ${secretKey}`);
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
