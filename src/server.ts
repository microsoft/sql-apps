import { DefaultAzureCredential } from '@azure/identity';
import { entraVerifier } from './auth.js';
import { loadRuntimeConfig, portFromEnvironment } from './config.js';
import { createGateway } from './gateway.js';
import { blobStore } from './storage.js';

const config = loadRuntimeConfig(process.env);
const credential = new DefaultAzureCredential(
  process.env.AZURE_CLIENT_ID ? { managedIdentityClientId: process.env.AZURE_CLIENT_ID } : {},
);
const app = await createGateway(config, {
  verifyUser: entraVerifier(config.tenantId, config.apiClientId),
  files: blobStore(config.blobAccountUrl, config.blobContainer, credential),
  fetch,
  async functionToken() {
    const token = await credential.getToken(`api://${config.apiClientId}/.default`);
    if (!token) throw new Error('No managed identity token available for function invocation');
    return token.token;
  },
});
await app.listen({ port: portFromEnvironment(process.env.PORT), host: '0.0.0.0' });
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { void app.close(); });
}
