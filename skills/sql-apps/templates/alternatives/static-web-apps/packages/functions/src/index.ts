import { app } from '@azure/functions';
import { createAuthenticator } from './auth.js';
import { createDatabase } from './database.js';
import { createHandlers } from './handlers.js';
import { accessProfile } from './profile.js';

let authenticate: ReturnType<typeof createAuthenticator> | undefined;
let database: ReturnType<typeof createDatabase> | undefined;
const handlers = createHandlers({
  env: process.env,
  access: accessProfile,
  authenticate: request => (authenticate ||= createAuthenticator(process.env))(request),
  database: () => (database ||= createDatabase(process.env)),
});

export function registerRoutes(registry: Pick<typeof app, 'http'>, routes: ReturnType<typeof createHandlers>, access = 'protected'): void {
  if (access === 'public-submissions') {
    registry.http('Submit', { route: 'Submit', methods: ['POST'], authLevel: 'anonymous', handler: routes.submit });
    registry.http('Submissions', { route: 'Submissions', methods: ['GET'], authLevel: 'anonymous', handler: routes.submissions });
  } else {
    registry.http('Items', { route: 'Items', methods: ['GET'], authLevel: 'anonymous', handler: routes.items });
    registry.http('CreateItem', { route: 'CreateItem', methods: ['POST'], authLevel: 'anonymous', handler: routes.createItem });
  }
  registry.http('config', { route: 'config', methods: ['GET'], authLevel: 'anonymous', handler: routes.config });
}

registerRoutes(app, handlers, accessProfile);
