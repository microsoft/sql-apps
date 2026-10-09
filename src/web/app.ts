import { ApiError, SqlAppsClient } from '../client.js';
import { parseBrowserConfig } from '../browser-config.js';
import { configureSession } from './session.js';
import { watchJobProgress } from './job-progress.js';

const element = <T extends HTMLElement>(id: string) => {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing element: ${id}`);
  return value as T;
};
const status = element('status');
function report(error: unknown) {
  status.textContent = error instanceof ApiError && error.status === 401
    ? 'Session expired. Sign in or choose a development user again.'
    : error instanceof ApiError && error.status >= 500
      ? `Backend service is unavailable (${error.status}). Check the local services or try again.`
      : error instanceof Error ? error.message : 'Operation failed';
}

async function main() {
  const response = await fetch('/auth/config');
  if (!response.ok) throw new Error('Authentication configuration unavailable');
  const config = parseBrowserConfig(await response.json());
  const session = await configureSession(config, {
    login: element('login'), logout: element('logout'), local: element('local-identity'),
    users: element<HTMLSelectElement>('development-user'), select: element<HTMLButtonElement>('select-user'),
  }, report);
  if (!session) return;
  element('workspace').hidden = false;
  element('login').hidden = true;
  element('logout').hidden = false;
  const signedIn = `Signed in as ${session.name}`;
  status.textContent = signedIn;
  element('file-form').hidden = !config.capabilities.files;
  element('echo').hidden = !config.capabilities.functions;
  element('service-notice').hidden = config.capabilities.files && config.capabilities.functions;
  element('file-workspace').hidden = !config.capabilities.files;
  element('job-workspace').hidden = !config.capabilities.processing;
  element('trace-workspace').hidden = !config.capabilities.tracing;
  element('job-progress').textContent = config.capabilities.automaticProgress ? 'Job progress updates automatically.' : 'Use Refresh jobs to update progress.';

  const client = new SqlAppsClient({ baseUrl: location.origin, getAccessToken: session.getAccessToken });
  let busy = false;
  async function operation(message: string, action: () => Promise<void>) {
    if (busy) return;
    busy = true;
    const controls = document.querySelectorAll<HTMLButtonElement | HTMLInputElement>('#workspace button, #workspace input');
    controls.forEach(control => { control.disabled = true; });
    element<HTMLButtonElement>('select-user').disabled = true;
    status.textContent = message;
    try { await action(); status.textContent = signedIn; }
    catch (error) { report(error); }
    finally {
      busy = false;
      document.querySelectorAll<HTMLButtonElement | HTMLInputElement>('#workspace button, #workspace input')
        .forEach(control => { control.disabled = false; });
      element<HTMLButtonElement>('select-user').disabled = false;
    }
  }
  async function refreshFiles() {
    if (!config.capabilities.files) return;
    const files = await client.listFiles();
    element('no-files').hidden = files.length !== 0;
    element('files').replaceChildren();
    for (const file of files) {
      const item = document.createElement('li');
      item.append(`${file.name} (${file.size} bytes) `);
      const download = document.createElement('button');
      download.textContent = 'Download';
      download.onclick = () => { void operation('Downloading file...', async () => {
        const bytes = await client.download(file.name);
        const url = URL.createObjectURL(new Blob([bytes]));
        const anchor = document.createElement('a');
        anchor.href = url; anchor.download = file.name;
        document.body.append(anchor); anchor.click(); anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
      }); };
      const remove = document.createElement('button');
      remove.textContent = 'Delete file';
      remove.onclick = () => { void operation('Deleting file...', async () => { await client.deleteFile(file.name); await refreshFiles(); }); };
      item.append(download, remove);
      if (config.capabilities.processing && config.capabilities.jobSubmission !== false) {
        const process = document.createElement('button');
        process.textContent = 'Process file';
        process.onclick = () => { void operation('Submitting processing job...', async () => {
          await client.processFile(file.name); await refreshJobs();
        }); };
        item.append(process);
      }
      item.querySelectorAll('button').forEach(button => { button.disabled = busy; });
      element('files').append(item);
    }
  }
  let lastJobs = '';
  let jobRefresh = 0;
  async function refreshJobs(signal?: AbortSignal) {
    if (!config.capabilities.processing) return;
    const generation = ++jobRefresh;
    const jobs = await client.listJobs(signal);
    if (signal?.aborted || generation !== jobRefresh) return;
    const serialized = JSON.stringify(jobs);
    if (serialized === lastJobs) return;
    lastJobs = serialized;
    element('no-jobs').hidden = jobs.length !== 0;
    element('jobs').replaceChildren();
    for (const job of jobs) {
      const item = document.createElement('li');
      item.textContent = `${job.filename}: ${job.status}`;
      item.append(` | Job ${job.id}`);
      if (job.created_at) item.append(` | Created ${job.created_at} UTC`);
      if (job.parent_job_id) item.append(` | Retry of ${job.parent_job_id}`);
      if (job.status === 'completed') item.append(` | ${job.byte_count} bytes | ${job.line_count} text lines | SHA-256 ${job.sha256}`);
      if (job.error) item.append(` | ${job.error}`);
      if (job.status === 'completed' || job.status === 'failed') {
        if (job.status === 'failed' && config.capabilities.jobRetry) {
          const retry = document.createElement('button');
          retry.textContent = 'Retry snapshot';
          retry.onclick = () => { void operation('Retrying saved snapshot...', async () => {
            await client.retryJob(job.id); await refreshJobs();
          }); };
          item.append(retry);
        }
        const remove = document.createElement('button');
        remove.textContent = 'Delete job';
        remove.onclick = () => { void operation('Deleting job...', async () => { await client.deleteJob(job.id); await refreshJobs(); }); };
        item.append(remove);
      }
      item.querySelectorAll('button').forEach(button => { button.disabled = busy; });
      element('jobs').append(item);
    }
  }
  async function refreshTraces() {
    if (!config.capabilities.tracing) return;
    const traces = await client.listTraces();
    element('traces').replaceChildren();
    for (const trace of traces) {
      const item = document.createElement('li');
      item.textContent = `${trace.name} | ${trace.status} | ${trace.durationMs.toFixed(1)} ms | ${trace.startedAt} | Trace ${trace.traceId} | Span ${trace.spanId}`;
      if (trace.parentSpanId) item.append(` | Parent ${trace.parentSpanId}`);
      if (trace.jobId) item.append(` | Job ${trace.jobId}`);
      element('traces').append(item);
    }
    if (!traces.length) element('traces').textContent = 'No traces yet. Upload or process a file to record activity.';
  }
  element('refresh-traces').onclick = () => { void operation('Loading traces...', refreshTraces); };
  element('refresh-files').onclick = () => { void operation('Loading files...', refreshFiles); };
  element('refresh-jobs').onclick = () => { void operation('Loading jobs...', refreshJobs); };
  element<HTMLFormElement>('file-form').onsubmit = event => {
    event.preventDefault();
    const file = element<HTMLInputElement>('file').files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { report(new Error('Files must be at most 4 MiB')); return; }
    void operation('Uploading file...', async () => {
      await client.upload(file.name, file); element<HTMLFormElement>('file-form').reset(); await refreshFiles();
    });
  };
  element('echo').onclick = () => {
    void operation('Invoking Azure Function...', async () => {
      const result = await client.echo({ message: 'Hello Azure' });
      element('function-result').textContent = JSON.stringify(result);
    });
  };
  await operation('Loading workspace...', async () => { await refreshFiles(); await refreshJobs(); });
  if (config.capabilities.processing && config.capabilities.automaticProgress) {
    const stop = watchJobProgress({
      intervalMs: config.capabilities.progressIntervalMs ?? 2000,
      available: () => !busy && document.visibilityState === 'visible',
      refresh: refreshJobs,
      report: error => {
        element('job-progress').textContent = error
          ? error instanceof ApiError && error.status === 401 ? 'Session expired; choose a user again.'
            : 'Automatic progress is unavailable; retrying with backoff. Check local services.'
          : 'Job progress updates automatically.';
      },
    });
    window.addEventListener('pagehide', stop, { once: true });
  }
}
void main().catch(report);
