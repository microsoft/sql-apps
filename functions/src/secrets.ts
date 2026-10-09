import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

export function functionSecrets(vaultUrl: string, clientId: string) {
  const client = new SecretClient(vaultUrl, new DefaultAzureCredential({ managedIdentityClientId: clientId }));
  return {
    async get(name: string): Promise<string> {
      if (!/^[a-zA-Z0-9-]{1,127}$/.test(name)) throw new Error('Invalid secret name');
      const secret = await client.getSecret(name);
      if (secret.value === undefined) throw new Error(`Secret has no value: ${name}`);
      return secret.value;
    },
  };
}
