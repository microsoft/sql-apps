import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { isPublicConfig } from '@app/shared';

export async function loadIdentity() {
  const response = await fetch('/config.json');
  if (!response.ok) throw new Error('Public identity configuration is unavailable.');
  const config: unknown = await response.json();
  if (!isPublicConfig(config)) throw new Error('Public identity configuration has an unexpected shape.');
  const manager = new UserManager({
    authority: config.authority,
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    post_logout_redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
    automaticSilentRenew: false,
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  });
  const query = new URLSearchParams(location.search);
  if (query.has('state') && (query.has('code') || query.has('error'))) {
    try {
      await manager.signinRedirectCallback();
    } finally {
      history.replaceState(null, '', '/');
    }
  }
  return manager;
}
