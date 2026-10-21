import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { checkPlugin, checkout, plugin, skillNames } from './check-plugin.mjs';
import { pluginCliCommand } from './plugin-cli.mjs';

const executeFile = promisify(execFile);
export const loaderVersions = Object.freeze({ claude: '2.1.296', copilot: '1.0.98' });

export async function checkPluginLoaders(host, options = {}) {
  assert.ok(Object.hasOwn(loaderVersions, host), 'Choose the claude or copilot loader');
  const cli = pluginCliCommand(host, options.entrypoint);
  await checkPlugin();
  const execute = options.execute ?? executeFile;
  const report = options.report ?? console.log;
  const root = await realpath(await mkdtemp(join(tmpdir(), 'sql apps loader ')));
  try {
    const home = join(root, 'home');
    const profile = join(root, 'profile');
    const cwd = join(root, 'unrelated session');
    const marketplace = join(root, 'marketplace');
    const copied = join(marketplace, 'plugins', 'sql-apps');
    for (const directory of [home, profile, cwd]) await mkdir(directory);
    const environment = Object.fromEntries(Object.entries(options.environment ?? process.env)
      .filter(([key]) => /^(PATH|PATHEXT|SystemRoot|WINDIR|ComSpec|TMP|TEMP|LANG|LC_ALL)$/i.test(key)));
    Object.assign(environment, {
      HOME: home, USERPROFILE: home,
      APPDATA: join(home, 'AppData', 'Roaming'), LOCALAPPDATA: join(home, 'AppData', 'Local'),
      XDG_CONFIG_HOME: join(home, '.config'),
      COPILOT_HOME: profile, CLAUDE_CONFIG_DIR: profile,
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', DO_NOT_TRACK: '1',
    });
    const run = async args => {
      try {
        const result = await execute(cli.file, [...cli.prefix, ...args], {
          cwd, env: environment, shell: false, windowsHide: true,
          timeout: 60_000, maxBuffer: 4 * 1024 * 1024,
        });
        if (result.stderr?.trim()) report(result.stderr.trim());
        return result.stdout;
      } catch (error) {
        throw new Error(`${host} ${args.join(' ')} failed: ${error.stderr?.trim() || error.message}`, { cause: error });
      }
    };
    const version = (await run(['--version'])).match(/\b\d+\.\d+\.\d+\b/)?.[0];
    assert.equal(version, loaderVersions[host],
      `${host} loader check requires ${loaderVersions[host]}; provision it explicitly (no automatic upgrade)`);
    await cp(plugin, copied, { recursive: true });
    for (const directory of ['.claude-plugin', '.github/plugin']) {
      const target = join(marketplace, directory, 'marketplace.json');
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, await readFile(join(checkout, directory, 'marketplace.json')));
    }
    const manifest = JSON.parse(await readFile(join(copied, 'plugin.json'), 'utf8'));
    if (host === 'claude') {
      for (const target of [plugin, checkout, copied, marketplace]) {
        await run(['plugin', 'validate', target, '--strict']);
      }
      const details = await run(['--plugin-dir', copied, 'plugin', 'details', manifest.name]);
      assert.ok(details.startsWith(`${manifest.name} ${manifest.version}`), 'Claude plugin version matches the package');
      assert.match(details, /Source:\s+sql-apps@inline\b/, 'Claude must report the inline source under test');
      const skills = details.match(/^\s*Skills \((\d+)\)\s+([^\r\n]+)/m);
      assert.equal(Number(skills?.[1]), skillNames.length, 'Claude skill inventory count');
      assert.deepEqual(skills[2].split(/,\s*/).sort(), [...skillNames].sort(), 'Claude skill inventory names');
      for (const component of details.matchAll(/^\s+([A-Za-z][A-Za-z ]*) \((\d+)\)/gm)) {
        if (component[1] !== 'Skills') assert.equal(Number(component[2]), 0, `Unexpected Claude ${component[1]}`);
      }
      for (const component of ['Agents', 'Hooks', 'MCP servers', 'LSP servers']) {
        assert.match(details, new RegExp(`^\\s*${component} \\(0\\)`, 'm'), `Missing ${component} inventory evidence`);
      }
      assert.match(details, /Always-on:\s+~[\d.]+k?\s+tok\b/, 'Missing Claude projected token cost');
      report(details.trim());
    } else {
      await run(['plugin', 'marketplace', 'add', marketplace]);
      await run(['plugin', 'install', 'sql-apps@sql-apps-skills']);
      await run(['plugin', 'enable', 'sql-apps@sql-apps-skills']);
      const installed = JSON.parse(await run(['plugin', 'list', '--json']));
      assert.ok(Array.isArray(installed), 'Copilot plugin inventory must be an array');
      const plugins = installed.filter(entry => entry.source !== 'builtin');
      assert.equal(plugins.length, 1, 'Only the fixture plugin may be installed');
      assert.equal(plugins[0].name, manifest.name);
      assert.equal(plugins[0].version, manifest.version);
      assert.equal(plugins[0].marketplace, 'sql-apps-skills');
      assert.equal(plugins[0].enabled, true, 'Copilot plugin must be enabled');
      const discovered = JSON.parse(await run(['skill', 'list', '--json']));
      assert.ok(Array.isArray(discovered), 'Copilot skill inventory must be an array');
      const skills = discovered.filter(entry => entry.source === 'plugin');
      assert.deepEqual(skills.map(entry => entry.name).sort(), [...skillNames].sort(), 'Copilot skill inventory');
      for (const skill of skills) {
        assert.equal(skill.enabled, true, `${skill.name} must be enabled`);
        assert.equal(skill.path, join(copied, 'skills', skill.name), `${skill.name} must come from the copied bundle`);
      }
      report(JSON.stringify({ host, version, plugins, skills }, null, 2));
    }
    report(`${host} ${version}: seven skills discovered from the isolated bundle; no model calls or user-profile changes.`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length < 3 || process.argv.length > 4) {
    console.error('Usage: node scripts/check-plugin-loaders.mjs claude|copilot [absolute-cli-entrypoint]');
    process.exitCode = 1;
  } else {
    checkPluginLoaders(process.argv[2], { entrypoint: process.argv[3] })
      .catch(error => { console.error(error.message); process.exitCode = 1; });
  }
}
