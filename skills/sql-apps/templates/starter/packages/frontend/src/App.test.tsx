// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { User, UserManager } from 'oidc-client-ts';
import { App } from './main';
import { loadIdentity } from './auth';
import { requestItems } from './api';

vi.mock('./api', async importOriginal => ({
  ...await importOriginal<typeof import('./api')>(),
  requestItems: vi.fn(),
}));
let manager: UserManager;
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    authority: 'https://identity.example', clientId: 'test-client',
    scope: 'openid api', redirectUri: `${location.origin}/`,
  }))));
  vi.spyOn(UserManager.prototype, 'getUser').mockImplementation(async function (this: UserManager) {
    manager = this;
    return new User({
      access_token: 'test-token', token_type: 'Bearer',
      profile: { sub: 'test-user', iss: 'https://identity.example', aud: 'test-client', exp: 9999999999, iat: 1 },
      expires_at: 9999999999,
    });
  });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.resetAllMocks(); vi.unstubAllGlobals();
  vi.useRealTimers(); history.replaceState(null, '', '/');
});

test('loads, saves through the API client, and reads back the persisted item', async () => {
  vi.mocked(requestItems).mockResolvedValueOnce([]).mockResolvedValueOnce([])
    .mockResolvedValue([{ Id: 'saved-id', Label: 'Saved item', CreatedAt: '2026-10-27T00:00:00Z' }]);
  render(<App/>);
  await screen.findByText('Loaded from SQL.');
  fireEvent.change(screen.getByLabelText('New item label'), { target: { value: 'Saved item' } });
  fireEvent.click(screen.getByText('Save item'));
  await screen.findByText('Saved item', { selector: 'li' });
  expect(requestItems).toHaveBeenNthCalledWith(2, 'test-token', 'Saved item');
  expect(requestItems).toHaveBeenNthCalledWith(3, 'test-token');
});

test('preserves form input and reports a denied mutation instead of success', async () => {
  vi.mocked(requestItems).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('Permission denied.'));
  render(<App/>);
  await screen.findByText('Loaded from SQL.');
  fireEvent.change(screen.getByLabelText('New item label'), { target: { value: 'Keep my input' } });
  fireEvent.click(screen.getByText('Save item'));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Permission denied.'));
  expect((screen.getByLabelText('New item label') as HTMLInputElement).value).toBe('Keep my input');
});

test('retains the input when a successful mutation cannot be read back', async () => {
  vi.mocked(requestItems).mockResolvedValueOnce([]).mockResolvedValueOnce([])
    .mockRejectedValueOnce(new Error('Readback unavailable.'));
  render(<App/>);
  await screen.findByText('Loaded from SQL.');
  fireEvent.change(screen.getByLabelText('New item label'), { target: { value: 'Not confirmed yet' } });
  fireEvent.click(screen.getByText('Save item'));
  await screen.findByText('Readback unavailable.');
  expect((screen.getByLabelText('New item label') as HTMLInputElement).value).toBe('Not confirmed yet');
  expect(screen.queryByText('Saved and read back from SQL.')).toBeNull();
});

test('returns to sign-in when the access token expires', async () => {
  vi.mocked(requestItems).mockResolvedValue([]);
  render(<App/>);
  await screen.findByText('Loaded from SQL.');
  vi.useFakeTimers();
  const expired = await manager.getUser();
  expired!.expires_at = 1;
  await manager.events.load(expired!);
  await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
  expect(screen.queryByText('Reload')).toBeNull();
  expect(screen.getByText('Sign in').hasAttribute('disabled')).toBe(false);
  expect(screen.getByRole('alert').textContent).toMatch(/expired/i);
});

test.each(['initial load', 'reload', 'save'])('returns to sign-in after an API 401 during %s', async operation => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  const denied = () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 401 }));
    return actual.requestItems('test-token');
  };
  vi.mocked(requestItems).mockResolvedValue([]);
  if (operation === 'initial load') vi.mocked(requestItems).mockImplementationOnce(denied);
  render(<App/>);
  if (operation !== 'initial load') {
    await screen.findByText('Loaded from SQL.');
    vi.mocked(requestItems).mockImplementationOnce(denied);
    if (operation === 'save') {
      fireEvent.change(screen.getByLabelText('New item label'), { target: { value: 'Keep my input' } });
      fireEvent.click(screen.getByText('Save item'));
    } else fireEvent.click(screen.getByText('Reload'));
  }
  await screen.findByRole('alert');
  expect(screen.queryByText('Reload')).toBeNull();
  expect(screen.getByText('Sign in').hasAttribute('disabled')).toBe(false);
});

test('allows another sign-in after a denied provider callback', async () => {
  history.replaceState(null, '', '/?state=failed-login&error=access_denied');
  vi.spyOn(UserManager.prototype, 'signinRedirectCallback').mockRejectedValue(new Error('access_denied'));
  const signin = vi.spyOn(UserManager.prototype, 'signinRedirect').mockResolvedValue();
  render(<App/>);
  await screen.findByText('access_denied');
  expect(screen.getByText('Sign in').hasAttribute('disabled')).toBe(false);
  fireEvent.click(screen.getByText('Sign in'));
  expect(signin).toHaveBeenCalledOnce();
  expect(location.search).toBe('');
});

test('loads managed Functions public configuration when the static file is absent', async () => {
  const config = {
    authority: 'https://identity.example', clientId: 'functions-client',
    scope: 'openid api', redirectUri: `${location.origin}/`,
  };
  vi.mocked(fetch).mockReset()
    .mockResolvedValueOnce(new Response('', { status: 404 }))
    .mockResolvedValueOnce(Response.json(config));
  const manager = await loadIdentity();
  expect(manager.settings.client_id).toBe('functions-client');
  expect(fetch).toHaveBeenNthCalledWith(1, '/config.json');
  expect(fetch).toHaveBeenNthCalledWith(2, '/api/config');
});

test('does not hide configuration outages with a fallback', async () => {
  vi.mocked(fetch).mockReset().mockResolvedValueOnce(new Response('', { status: 503 }));
  await expect(loadIdentity()).rejects.toThrow('Public identity configuration is unavailable.');
  expect(fetch).toHaveBeenCalledTimes(1);
});
