import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';

const spawnSync = childProcess.spawnSync;
childProcess.spawnSync = (command, args, options) => {
  if (command === 'func' || command === 'swa' ||
      args.some(arg => /^(func|swa) --version$/.test(arg))) {
    return { status: 0, stdout: command === 'func' || args.includes('func --version') ? '4.16.0' : '2.0.10', stderr: '' };
  }
  if (command !== 'docker') return spawnSync(command, args, options);
  let stdout = '';
  if (args.includes('stop')) console.log('Owned containers stopped.');
  else if (args.includes('ps')) stdout = JSON.stringify([
    { Service: 'sql', State: 'running', Health: 'healthy' },
    { Service: 'dab', State: 'running', Health: '' },
  ]);
  else if (args.includes('port')) stdout = '127.0.0.1:14330';
  else if (args.includes('exec')) stdout = '5:appdb';
  else if (!args.includes('--version') && !args.includes('version') &&
           !args.includes('inspect') && !args.includes('config')) {
    throw new Error('Operational checks must not start or delete resources.');
  }
  return { status: 0, stdout, stderr: '' };
};
syncBuiltinESMExports();
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({ clientId: process.env.AUTH_CLIENT_ID, redirectUri: `${process.env.APP_ORIGIN}/` }),
});
