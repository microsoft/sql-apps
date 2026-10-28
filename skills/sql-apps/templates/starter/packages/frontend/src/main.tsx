import { useEffect, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus, RefreshCw } from 'lucide-react';
import type { UserManager } from 'oidc-client-ts';
import type { Item } from '@app/shared';
import { completeSignin, loadIdentity } from './auth';
import { AuthenticationRequiredError, requestItems } from './api';
import './global.css';

export function App() {
  const [identity, setIdentity] = useState<UserManager>();
  const [token, setToken] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Connecting to your identity provider...');
  const [theme, setTheme] = useState('system');
  const report = (error: unknown) => {
    if (error instanceof AuthenticationRequiredError) {
      setToken(''); setItems([]);
      setStatus('Sign in to save and reload your own items.');
    }
    setError(error instanceof Error ? error.message : 'An unexpected error occurred.');
  };

  useEffect(() => {
    if (!identity) return;
    return identity.events.addAccessTokenExpired(() => {
      setToken(''); setItems([]);
      setStatus('Sign in to save and reload your own items.');
      setError('Your session expired. Sign in again.');
    });
  }, [identity]);

  useEffect(() => {
    void (async () => {
      try {
        const manager = await loadIdentity();
        setIdentity(manager);
        await completeSignin(manager);
        const user = await manager.getUser();
        if (user && !user.expired) {
          setToken(user.access_token);
          setItems(await requestItems(user.access_token));
          setStatus('Loaded from SQL.');
        } else {
          setStatus('Sign in to save and reload your own items.');
        }
      } catch (error) { report(error); }
      finally { setBusy(false); }
    })();
  }, []);

  async function reload() {
    setBusy(true); setError('');
    try {
      setItems(await requestItems(token));
      setStatus('Reloaded from SQL.');
    } catch (error) { report(error); }
    finally { setBusy(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      await requestItems(token, label.trim());
      setItems(await requestItems(token));
      setLabel('');
      setStatus('Saved and read back from SQL.');
    } catch (error) { report(error); }
    finally { setBusy(false); }
  }

  return <main data-theme={theme}>
    <header>
      <p className="eyebrow">SQL APPS / FIRST VERTICAL SLICE</p>
      <h1>Your work, persisted.</h1>
      <p>A small foundation: external sign-in, a protected API, and SQL-enforced rules.</p>
      <label>Appearance <select value={theme} onChange={event => setTheme(event.target.value)}>
        <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
      </select></label>
    </header>
    {error && <p role="alert" className="error">{error}</p>}
    <p role="status">{busy ? 'Working...' : status}</p>
    {!token ? <button disabled={busy || !identity} onClick={() => {
      setError('');
      void identity?.signinRedirect().catch(report);
    }}>Sign in</button> : <>
      <div className="toolbar">
        <button disabled={busy} onClick={() => void reload()}><RefreshCw aria-hidden size={16}/> Reload</button>
        <button onClick={() => {
          setError('');
          void identity?.signoutRedirect().catch(report);
        }}>Sign out</button>
      </div>
      <form onSubmit={event => void save(event)}>
        <label htmlFor="label">New item label</label>
        <div className="entry">
          <input id="label" required maxLength={120} value={label} onChange={event => setLabel(event.target.value)} />
          <button disabled={busy || !label.trim()}><Plus aria-hidden size={16}/> Save item</button>
        </div>
        <p className="hint">Labels must be unique for your identity. Other users cannot see your items.</p>
      </form>
      <section aria-label="Your saved items" aria-busy={busy}>
        <h2>My items</h2>
        {items.length ? <ul>{items.map(item => <li key={item.Id}>{item.Label}</li>)}</ul> :
          <p>No items loaded. Save your first item, then reload to verify persistence.</p>}
        <p className="hint">Showing the latest 100 items. This starter is not a full collection browser.</p>
      </section>
    </>}
    <footer>Starter workflow only. Local acceptance and deployed acceptance are separate milestones.</footer>
  </main>;
}

const rootElement = document.getElementById('root');
if (rootElement) createRoot(rootElement).render(<App/>);
