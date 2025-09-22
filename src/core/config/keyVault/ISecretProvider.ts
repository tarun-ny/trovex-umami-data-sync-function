export interface ISecretProvider {
  loadSecretsToEnv(): Promise<void>;
}
