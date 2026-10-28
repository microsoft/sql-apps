import { app } from '@azure/functions';
import { createAuthenticator } from './auth.mjs';
import { createDatabase } from './database.mjs';
import { createHandlers } from './handlers.mjs';

let authenticate;
let database;
const handlers = createHandlers({
  env: process.env,
  authenticate: request => (authenticate ||= createAuthenticator(process.env))(request),
  database: () => (database ||= createDatabase(process.env)),
});

export function registerRoutes(registry, routes) {
  registry.http('Items', { route: 'Items', methods: ['GET'], authLevel: 'anonymous', handler: routes.items });
  registry.http('CreateItem', { route: 'CreateItem', methods: ['POST'], authLevel: 'anonymous', handler: routes.createItem });
  registry.http('config', { route: 'config', methods: ['GET'], authLevel: 'anonymous', handler: routes.config });
}

registerRoutes(app, handlers);
