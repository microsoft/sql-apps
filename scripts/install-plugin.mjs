import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { checkPlugin, checkout, plugin, skillNames } from './check-plugin.mjs';
import { validateHome } from '../plugins/sql-apps/scripts/sql-apps.mjs';
import { inspectSource } from './workspace-check.mjs';
import { pluginCliCommand } from './plugin-cli.mjs';

const execute = promisify(execFile);

async function install() {
  if (process.argv.length > 3) throw new Error('Usage: npm run plugin:install -- [absolute-cli-entrypoint]; run it from the contributor checkout');
  const cli = pluginCliCommand('copilot', process.argv[2]);
  const copilot = async args => {
    const { stdout, stderr } = await execute(cli.file, [...cli.prefix, ...args], {
      cwd: checkout, shell: false, windowsHide: true, maxBuffer: 4 * 1024 * 1024,
    });
    if (stderr.trim()) console.error(stderr.trim());
    return stdout;
  };
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
  console.log(`SQL Apps guidance installed locally from ${home}; no runtime binding was written.`);
  console.log('Open the intended application directory or set SQL_APPS_HOME explicitly. Each app owns its exact installed tooling.');
  console.log(`All ${skillNames.length} skills are discovered and enabled by the actual Copilot plugin loader.`);
  console.log('Restart the Copilot App or create a fresh session. No upstream plugins were changed and no cloud resources were deployed.');
}

install().catch(error => { console.error(error instanceof Error ? error.message : 'Plugin installation failed'); process.exitCode = 1; });
