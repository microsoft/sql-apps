import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { isPublicConfig, type PublicConfig } from '@app/shared';

export async function loadPublicConfiguration(): Promise<unknown> {
  let response = await fetch('/config.json');
  if (response.status === 404) response = await fetch('/api/config');
  if (!response.ok) throw new Error('Public identity configuration is unavailable.');
  return response.json();
}

export async function loadIdentity(configuration?: PublicConfig) {
  const config: unknown = configuration ?? await loadPublicConfiguration();
  if (!isPublicConfig(config)) throw new Error('Public identity configuration has an unexpected shape.');
  return new UserManager({
    authority: config.authority,
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    post_logout_redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
    automaticSilentRenew: false,
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  });
}

export async function completeSignin(manager: UserManager) {
  const query = new URLSearchParams(location.search);
  if (query.has('state') && (query.has('code') || query.has('error'))) {
    try {
      await manager.signinRedirectCallback();
    } finally {
      history.replaceState(null, '', '/');
    }
  }
}
