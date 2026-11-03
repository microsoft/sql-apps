import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const app = process.argv[2];
const command = process.argv[3] || 'start';
const checksum = createHash('sha256').update(
  readFileSync(resolve(app, 'packages/data/migrations/001-initial.sql'), 'utf8').replace(/\r\n/g, '\n'),
).digest('hex');
const spawnSync = childProcess.spawnSync;
childProcess.spawnSync = (command, args, options) => {
  if (command !== 'docker') return spawnSync(command, args, options);
  if (args[0] !== 'compose') throw new Error('Only Compose is stubbed.');
  let stdout = '';
  if (args.includes('stop')) process.send('containers-stopped');
  else if (args.includes('exec')) {
    if (args.includes('-Q')) {
      const query = args[args.indexOf('-Q') + 1];
      if (query.includes('EngineEdition')) stdout = '5';
      else if (query.includes('DATABASEPROPERTYEX')) stdout = 'SQL_Latin1_General_CP1_CI_AS';
      else if (query.includes('CONCAT(Version')) stdout = `1:${checksum}`;
      else if (!query.includes('CREATE DATABASE')) throw new Error(`Unexpected SQL query: ${query}`);
    } else if (!args.includes('-i') && !args.includes('-T')) throw new Error('Unexpected SQL invocation.');
  } else if (!args.includes('up') && !args.includes('config')) throw new Error('Unexpected Compose command.');
  return { status: 0, stdout, stderr: '' };
};
const fork = childProcess.fork;
let web;
childProcess.fork = (...args) => {
  web = fork(...args);
  return web;
};
syncBuiltinESMExports();
const request = globalThis.fetch;
globalThis.fetch = (url, options) => url === `${process.env.DAB_URL}/` ?
  Promise.resolve({ ok: true }) : request(url, options);
if (command === 'start') {
  process.on('message', message => {
    if (message === 'kill-web') web.kill('SIGKILL');
    if (message === 'external-stop') {
      const stop = fork(fileURLToPath(import.meta.url), [app, 'stop'], { env: process.env, silent: true });
      stop.on('message', value => process.send(value));
      stop.stdout.resume();
      stop.stderr.pipe(process.stderr);
    }
  });
  process.on('disconnect', () => { if (web?.connected) web.send('stop'); });
}
process.argv[2] = command;
await import(pathToFileURL(resolve(app, 'scripts/local.mjs')).href);
