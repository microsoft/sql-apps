import { app } from '@azure/functions';
import { serviceVerifier } from './authorization.js';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required setting: ${name}`);
  return value;
}
const verify = serviceVerifier(required('AZURE_TENANT_ID'), required('API_CLIENT_ID'), required('GATEWAY_PRINCIPAL_ID'));
app.http('echo', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const token = /^Bearer ([^\s]+)$/i.exec(request.headers.get('authorization') ?? '')?.[1];
    if (!token) return { status: 401, jsonBody: { error: 'Gateway application identity required' } };
    try {
      await verify(token);
    } catch (error) {
      context.warn('Function access rejected', error instanceof Error ? error.name : 'UnknownError');
      return { status: 401, jsonBody: { error: 'Gateway application identity required' } };
    }
    let body: unknown;
    try { body = await request.json(); }
    catch { return { status: 400, jsonBody: { error: 'JSON body required' } }; }
    return { status: 200, jsonBody: { result: body } };
  },
});
