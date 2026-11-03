import { useEffect, useState, type FormEvent } from 'react';
import type { UserManager } from 'oidc-client-ts';
import { isPublicSubmissionConfig, type Item } from '@app/shared';
import { completeSignin, loadIdentity, loadPublicConfiguration } from './auth';
import { AuthenticationRequiredError } from './api';
import { loadSubmissions, submitLabel } from './submissions';

export function PublicApp() {
  useEffect(() => { document.title = 'Send a submission | SQL Apps'; }, []);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [ownerStatus, setOwnerStatus] = useState('Owner access is not configured. Submissions remain private.');
  const [identity, setIdentity] = useState<UserManager>();
  const [token, setToken] = useState('');
  const [items, setItems] = useState<Item[] | null>(null);
  const report = (error: unknown) => {
    setItems(null);
    if (error instanceof AuthenticationRequiredError) setToken('');
    setError(error instanceof Error ? error.message : 'The service is unavailable.');
  };
  useEffect(() => {
    void (async () => {
      try {
        const config = await loadPublicConfiguration();
        if (!isPublicSubmissionConfig(config)) throw new Error('Public submission configuration is unavailable.');
        if (!config.ownerAuth) return;
        const manager = await loadIdentity(config.ownerAuth);
        setIdentity(manager);
        setOwnerStatus('Owner sign-in requires operator enrollment before inbox access.');
        await completeSignin(manager);
        const user = await manager.getUser();
        if (user && !user.expired) {
          setToken(user.access_token);
          setItems(await loadSubmissions(user.access_token));
          setOwnerStatus('Private inbox loaded from SQL.');
        }
      } catch (error) { report(error); }
    })();
  }, []);
  useEffect(() => {
    if (!identity) return;
    return identity.events.addAccessTokenExpired(() => {
      setToken(''); setItems(null); setError('Owner session expired. Sign in again.');
    });
  }, [identity]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(''); setStatus('');
    try {
      await submitLabel(label.trim());
      setLabel(''); setStatus('Submission accepted.');
    } catch (error) { report(error); }
    finally { setBusy(false); }
  }
  async function reload() {
    setItems(null); setBusy(true); setError('');
    try { setItems(await loadSubmissions(token)); }
    catch (error) { report(error); }
    finally { setBusy(false); }
  }
  return <main>
    <header><p className="eyebrow">SQL APPS / PUBLIC SUBMISSIONS</p>
      <h1>Send a submission.</h1><p>Send one label to this application's private inbox. No account is needed to submit.</p>
    </header>
    {error && <p role="alert" className="error">{error}</p>}
    <p role="status">{busy ? 'Working...' : status}</p>
    <form onSubmit={event => void submit(event)}>
      <label htmlFor="submission-label">Submission label</label>
      <div className="entry"><input id="submission-label" required maxLength={120} value={label}
        onChange={event => setLabel(event.target.value)} />
      <button disabled={busy || !label.trim()}>Submit</button></div>
      <p className="hint">Do not include sensitive information. You cannot retrieve or edit a submission after sending it.</p>
    </form>
    <section aria-label="Owner access"><h2>Private owner inbox</h2><p>{ownerStatus}</p>
      {!token ? <button disabled={!identity || busy} onClick={() => {
        setError(''); void identity?.signinRedirect().catch(report);
      }}>Owner sign in</button> : <div className="toolbar">
        <button disabled={busy} onClick={() => void reload()}>Reload inbox</button>
        <button onClick={() => {
          setItems(null); setToken(''); setError('');
          void identity?.signoutRedirect().catch(report);
        }}>Owner sign out</button>
      </div>}
      {items !== null && <section aria-label="Private submissions">
        <h3>Latest submissions</h3>
        {items.length ? <ul>{items.map(item => <li key={item.Id}>{item.Label}</li>)}</ul> : <p>No submissions returned.</p>}
        <p className="hint">Latest 100 submissions from the single application inbox.</p>
      </section>}
    </section>
  </main>;
}
