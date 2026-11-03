import childProcess from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { syncBuiltinESMExports } from 'node:module';

const spawnSync = childProcess.spawnSync;
childProcess.spawnSync = (command, args, options) => {
  const invocation = process.platform === 'win32' ? args.at(-1) : `${command} ${args.join(' ')}`;
  if (invocation === 'func --version' || invocation === 'swa --version') {
    return { status: 0, stdout: invocation.startsWith('func') ? '4.16.0' : '2.0.10', stderr: '' };
  }
  const result = spawnSync(command, args, options);
  if (process.env.SQLAPPS_TEST_STARTUP_CLEANUP_FAILURE && command === 'taskkill.exe') return { ...result, status: 1 };
  return result;
};
const kill = process.kill;
process.kill = (pid, signal) => {
  const result = kill(pid, signal);
  if (process.env.SQLAPPS_TEST_STARTUP_CLEANUP_FAILURE && pid < 0 && signal === 'SIGTERM') {
    throw Object.assign(new Error('Injected cleanup failure after owned-group termination'), { code: 'EPERM' });
  }
  return result;
};
const spawn = childProcess.spawn;
childProcess.spawn = (command, args, options) => {
  const invocation = process.platform === 'win32' ? args.at(-1).split(' ') : [command, ...args];
  if (!['func', 'swa'].includes(invocation[0])) throw new Error('Only the host CLI boundary is replaced.');
  const starting = process.env.SQLAPPS_TEST_STARTUP_CLEANUP_FAILURE && invocation[0] === 'swa';
  const child = spawn(process.execPath, [
    fileURLToPath(new URL('./functions-process.mjs', import.meta.url)),
    invocation[invocation.indexOf('--port') + 1], starting ? 'not-ready' : 'serve',
  ], options);
  if (starting) child.once('spawn', () => process.send('starting-swa'));
  return child;
};
syncBuiltinESMExports();
await import('../../skills/sql-apps/templates/starter/tests/fixtures/local-process.mjs');
