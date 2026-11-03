// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { User, UserManager } from 'oidc-client-ts';
import { PublicApp } from './PublicApp';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const configuration = { access: 'public-submissions', redirectUri: `${location.origin}/`, ownerAuth: null };
function setup(submission: Response) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url === '/config.json') return Response.json(configuration);
    if (url === '/api/Submit') return submission;
    throw new Error('No inbox request is allowed before owner authorization.');
  }));
}
test('anonymous submission shows generic success, never a customer list, and disabled owner sign-in without auth config', async () => {
  setup(Response.json({ accepted: true }, { status: 202 }));
  render(<PublicApp/>);
  expect(screen.getByRole('heading', { name: 'Send a submission.' })).toBeTruthy();
  expect(document.title).toBe('Send a submission | SQL Apps');
  expect(screen.queryByText(/DDoS|cloud publication requires/i)).toBeNull();
  await waitFor(() => expect(screen.getByText('Owner sign in').hasAttribute('disabled')).toBe(true));
  fireEvent.change(screen.getByLabelText('Submission label'), { target: { value: 'Private content' } });
  fireEvent.click(screen.getByText('Submit'));
  await screen.findByText('Submission accepted.');
  expect(fetch).toHaveBeenCalledWith('/api/Submit', expect.objectContaining({ body: '{"Label":"Private content"}' }));
  expect(screen.queryByRole('list')).toBeNull();
  expect(screen.queryByText('Private content')).toBeNull();
});
test('failed submission preserves input and reports failure without optimistic success', async () => {
  setup(Response.json({ error: 'Budget reached' }, { status: 429 }));
  render(<PublicApp/>);
  fireEvent.change(screen.getByLabelText('Submission label'), { target: { value: 'Keep input' } });
  fireEvent.click(screen.getByText('Submit'));
  await screen.findByRole('alert');
  expect((screen.getByLabelText('Submission label') as HTMLInputElement).value).toBe('Keep input');
  expect(screen.queryByText('Submission accepted.')).toBeNull();
});
test('real identity configuration enables actual OIDC login but does not request or invent inbox rows', async () => {
  const login = vi.spyOn(UserManager.prototype, 'signinRedirect').mockResolvedValue();
  vi.spyOn(UserManager.prototype, 'getUser').mockResolvedValue(null);
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({
    ...configuration, ownerAuth: { authority: 'https://identity.example', clientId: 'owner-spa',
      scope: 'openid api', redirectUri: `${location.origin}/` },
  })));
  render(<PublicApp/>);
  await waitFor(() => expect(screen.getByText('Owner sign in').hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByText('Owner sign in'));
  expect(login).toHaveBeenCalledOnce();
  expect(screen.queryByRole('list')).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});
test.each([200, 403])('owner inbox renders only an allowed API response (%s)', async status => {
  vi.spyOn(UserManager.prototype, 'getUser').mockResolvedValue(new User({
    access_token: 'real-session-token', token_type: 'Bearer', expires_at: 9999999999,
    profile: { sub: 'owner', iss: 'https://identity.example', aud: 'owner-spa', exp: 9999999999, iat: 1 },
  }));
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url === '/config.json') return Response.json({
      ...configuration, ownerAuth: { authority: 'https://identity.example', clientId: 'owner-spa',
        scope: 'openid api', redirectUri: `${location.origin}/` },
    });
    if (url === '/api/Submissions') return Response.json(status === 200 ?
      { value: [{ Id: 'saved-id', Label: 'SQL-only content', CreatedAt: '2026-01-01' }] } : { error: 'Denied' }, { status });
    throw new Error('Unexpected request.');
  }));
  render(<PublicApp/>);
  expect(screen.queryByRole('list')).toBeNull();
  if (status === 200) await screen.findByText('SQL-only content', { selector: 'li' });
  else {
    await screen.findByText(/operator must enroll/);
    expect(screen.queryByRole('list')).toBeNull();
  }
  expect(fetch).toHaveBeenCalledWith('/api/Submissions', { headers: { Authorization: 'Bearer real-session-token' } });
});
