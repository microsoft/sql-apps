import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';

if (!process.argv[2] || !process.argv[3]) {
  throw new Error('Usage: node scripts\\test-starter-browser.mjs <running fixture app root> <existing playwright module entry>');
}
const app = resolve(process.argv[2]);
const env = parseEnv(readFileSync(resolve(app, '.env'), 'utf8'));
assert.equal(env.AUTH_CLIENT_ID, 'starter-test-spa', 'This browser check is only for the synthetic maintainer fixture.');
const { chromium } = await import(pathToFileURL(resolve(process.argv[3])).href);
const browser = await chromium.launch({
  channel: 'msedge', headless: true,
  args: ['--host-resolver-rules=MAP host.docker.internal 127.0.0.1'],
});
const context = await browser.newContext({ ignoreHTTPSErrors: true });
try {
  const page = await context.newPage();
  const failures = [];
  page.on('requestfailed', request => failures.push(`${request.url().split('?')[0]} ${request.failure()?.errorText}`));
  await page.goto(env.APP_ORIGIN);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  try {
    await page.getByText('Loaded from SQL.', { exact: true }).waitFor();
  } catch (error) {
    await page.screenshot({ path: resolve(app, '.local/browser-signin-failure.png'), fullPage: true });
    const alert = await page.getByRole('alert').allTextContents();
    throw new Error(`Synthetic sign-in failed at ${page.url().split('?')[0]}: ${alert.join(' ') || await page.title()}; ${failures.join('; ')}`, { cause: error });
  }
  const label = `Browser proof ${Date.now()}`;
  await page.getByLabel('New item label').fill(label);
  await page.getByRole('button', { name: 'Save item', exact: true }).click();
  await page.getByText(label, { exact: true }).waitFor();
  await page.reload();
  await page.getByText(label, { exact: true }).waitFor();
  await page.getByLabel('New item label').fill(label);
  await page.getByRole('button', { name: 'Save item', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert.match(await page.getByRole('alert').innerText(), /already exists/);
  assert.equal(await page.getByLabel('New item label').inputValue(), label);
  await page.getByLabel('Appearance').selectOption('dark');
  await page.screenshot({ path: resolve(app, '.local/browser-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('Appearance').selectOption('light');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Narrow layout must not overflow.');
  await page.getByLabel('New item label').focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('button', { name: 'Save item', exact: true }).evaluate(element => element === document.activeElement), true);
  await page.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"unavailable"}' }));
  await page.getByRole('button', { name: 'Reload', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'unavailable or paused' }).waitFor();
  await page.screenshot({ path: resolve(app, '.local/browser-narrow-unavailable.png'), fullPage: true });
  console.log('BROWSER ACCEPTANCE PASSED: synthetic OIDC/PKCE, real DAB/SQL save and page reload, duplicate error/input retention, theme controls, narrow overflow and keyboard focus.');
  console.log('Unavailable UI handling used a browser-route simulation. Real-provider sign-in and cloud remain unverified.');
} finally {
  await context.close();
  await browser.close();
}
