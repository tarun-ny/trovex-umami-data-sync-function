import { loadAzureSecretsToEnv } from "./AzureKeyVaultProvider";
import { ISecretProvider } from "./ISecretProvider";

function getSecretProvider(): ISecretProvider {
  return {
    loadSecretsToEnv: loadAzureSecretsToEnv,
  };
}

export { getSecretProvider };

export const secretProviderFactory = {
  getSecretProvider,
};
