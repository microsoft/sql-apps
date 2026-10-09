import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { checkPlugin, checkout, plugin, skillNames } from './check-plugin.mjs';
import { bindingPath, validateHome } from '../plugins/sql-apps/scripts/sql-apps.mjs';
import { inspectSource } from './workspace-check.mjs';

const execute = promisify(execFile);
async function copilot(args) {
  const { stdout, stderr } = await execute('copilot', args, { cwd: checkout, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  if (stderr.trim()) console.error(stderr.trim());
  return stdout;
}

async function install() {
  if (process.argv.length > 2) throw new Error('plugin:install takes no arguments; run it from the checkout you want to bind');
  await checkPlugin();
  const home = await validateHome(checkout);
  const source = await inspectSource(home);
  if (!source.ready) throw new Error(`Runtime source preflight failed: ${source.code}. ${source.nextAction}`);
  const registrations = JSON.parse(await copilot(['plugin', 'marketplace', 'list', '--json']));
  const existing = registrations.find(entry => entry.name === 'sql-apps-skills');
  if (existing && existing.source !== `Local: ${home}`) {
    throw new Error('sql-apps-skills is registered from another source; remove/review that registration explicitly before installing here');
  }
  const installed = JSON.parse(await copilot(['plugin', 'list', '--json']));
  if (installed.some(entry => entry.name === 'sql-apps' && entry.marketplace !== 'sql-apps-skills')) {
    throw new Error('Another sql-apps plugin is installed; review it explicitly before replacing it');
  }
  const path = bindingPath();
  const binding = { version: 1, home };
  const checkBinding = previous => {
    if (previous?.version !== 1 || previous.home !== home ||
        Object.keys(previous).some(key => !['version', 'home'].includes(key))) {
      throw new Error(`Existing runtime binding differs; review ${path} before replacing it`);
    }
  };
  try {
    checkBinding(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!existing) console.log((await copilot(['plugin', 'marketplace', 'add', home])).trim());
  if (!installed.some(entry => entry.name === 'sql-apps' && entry.marketplace === 'sql-apps-skills')) {
    console.log((await copilot(['plugin', 'install', 'sql-apps@sql-apps-skills'])).trim());
  }
  console.log((await copilot(['plugin', 'enable', 'sql-apps@sql-apps-skills'])).trim());
  const verified = JSON.parse(await copilot(['plugin', 'list', '--json']));
  if (!verified.some(entry => entry.name === 'sql-apps' && entry.marketplace === 'sql-apps-skills' && entry.enabled)) {
    throw new Error('Copilot did not report the local plugin enabled');
  }
  const discovered = JSON.parse(await copilot(['skill', 'list', '--json']));
  for (const name of skillNames) {
    if (!discovered.some(entry => entry.name === name && entry.source === 'plugin' && entry.enabled &&
        entry.path === join(plugin, 'skills', name))) throw new Error(`Copilot did not discover the enabled local skill ${name}`);
  }
  await mkdir(dirname(path), { recursive: true });
  try { await writeFile(path, `${JSON.stringify(binding, null, 2)}\n`, { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    checkBinding(JSON.parse(await readFile(path, 'utf8')));
  }
  console.log(`SQL Apps installed locally and bound to ${home}.`);
  console.log(`Runtime contract ${source.contract.version}; source fingerprint ${source.fingerprint}. Other worktrees require explicit home selection.`);
  console.log(`All ${skillNames.length} skills are discovered and enabled by the actual Copilot plugin loader.`);
  console.log('Restart the Copilot App or create a fresh session. No upstream plugins were changed and no cloud resources were deployed.');
}

install().catch(error => { console.error(error instanceof Error ? error.message : 'Plugin installation failed'); process.exitCode = 1; });
