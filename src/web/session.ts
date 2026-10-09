import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';
import type { BrowserConfig } from '../browser-config.js';

export interface BrowserSession {
  name: string;
  getAccessToken: () => Promise<string>;
}

const tokenKey = 'sql-apps.local-session';

export async function configureSession(
  config: BrowserConfig,
  elements: { login: HTMLElement; logout: HTMLElement; local: HTMLElement; users: HTMLSelectElement; select: HTMLButtonElement },
  report: (error: unknown) => void,
): Promise<BrowserSession | undefined> {
  if (config.mode === 'local') {
    elements.login.hidden = true;
    elements.local.hidden = false;
    elements.users.replaceChildren(...config.users.map(user => {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = user.name;
      return option;
    }));
    const token = sessionStorage.getItem(tokenKey);
    const logout = async () => {
      const response = await fetch('/local/session', { method: 'DELETE',
        headers: token ? { authorization: `Bearer ${token}` } : {} });
      if (!response.ok) throw new Error(`Local sign-out failed (${response.status})`);
      sessionStorage.removeItem(tokenKey);
      location.reload();
    };
    elements.logout.onclick = () => { void logout().catch(report); };
    elements.select.onclick = () => {
      elements.select.disabled = true;
      void (async () => {
        const response = await fetch('/local/session', {
          method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ user: elements.users.value }),
        });
        if (!response.ok) throw new Error(`Local session creation failed (${response.status})`);
        const body: unknown = await response.json();
        if (!body || typeof body !== 'object' || !('token' in body) || typeof body.token !== 'string') {
          throw new Error('Local session response is invalid');
        }
        sessionStorage.setItem(tokenKey, body.token);
        location.reload();
      })().catch(report).finally(() => { elements.select.disabled = false; });
    };
    if (!token) return undefined;
    const response = await fetch('/auth/me', { headers: { authorization: `Bearer ${token}` } });
    if (response.status === 401) {
      sessionStorage.removeItem(tokenKey);
      report(new Error('Local session expired. Choose a development user again.'));
      return undefined;
    }
    if (!response.ok) throw new Error(`Local identity lookup failed (${response.status})`);
    const identity: unknown = await response.json();
    const user = identity && typeof identity === 'object' && 'oid' in identity
      ? config.users.find(candidate => candidate.id === identity.oid) : undefined;
    if (!user) throw new Error('Local session has an unrecognized development identity');
    elements.users.value = user.id;
    return { name: user.name, getAccessToken: async () => token };
  }

  const msal = new PublicClientApplication({
    auth: { clientId: config.clientId, authority: `https://login.microsoftonline.com/${config.tenantId}`, redirectUri: location.origin },
    cache: { cacheLocation: 'sessionStorage' },
  });
  await msal.initialize();
  const redirect = await msal.handleRedirectPromise();
  const account = redirect?.account ?? msal.getAllAccounts()[0];
  if (account) msal.setActiveAccount(account);
  elements.login.onclick = () => { void msal.loginRedirect({ scopes: [config.scope] }).catch(report); };
  elements.logout.onclick = () => { void msal.logoutRedirect({ postLogoutRedirectUri: location.origin }).catch(report); };
  if (!account) return undefined;
  return {
    name: account.username,
    getAccessToken: async () => {
      try {
        return (await msal.acquireTokenSilent({ account, scopes: [config.scope] })).accessToken;
      } catch (error) {
        if (error instanceof InteractionRequiredAuthError) await msal.acquireTokenRedirect({ scopes: [config.scope] });
        throw error;
      }
    },
  };
}
