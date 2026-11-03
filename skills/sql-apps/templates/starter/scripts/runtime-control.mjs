import { createHash, timingSafeEqual } from 'node:crypto';
import { createServer, createConnection } from 'node:net';
import { mkdirSync, chmodSync, lstatSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { root } from './config.ts';

function control(env) {
  const project = env.COMPOSE_PROJECT_NAME;
  if (!/^sqlapps-[a-f0-9]{12}$/.test(project || '')) throw new Error('An isolated Compose project is required.');
  return {
    address: process.platform === 'win32' ? `\\\\.\\pipe\\${project}-stop` : resolve(root, '.local', `${project}.sock`),
    token: createHash('sha256').update(`stop:${project}:${env.APP_SQL_PASSWORD || ''}`).digest('hex'),
  };
}

export async function listenForStop(env, requestStop) {
  const { address, token } = control(env);
  if (process.platform !== 'win32') mkdirSync(resolve(root, '.local'), { recursive: true, mode: 0o700 });
  const clients = new Set();
  const sockets = new Set();
  const server = createServer({ allowHalfOpen: true }, socket => {
    sockets.add(socket);
    let received = '';
    let handled = false;
    socket.setTimeout(5000, () => socket.destroy());
    socket.on('error', () => { clients.delete(socket); });
    socket.on('close', () => { clients.delete(socket); sockets.delete(socket); });
    socket.on('data', data => {
      if (handled) { socket.destroy(); return; }
      received += data;
      if (received.length > 65) { socket.destroy(); return; }
      if (!received.includes('\n')) return;
      handled = true;
      const candidate = received.slice(0, -1);
      if (!received.endsWith('\n') || !/^[a-f0-9]{64}$/.test(candidate) ||
          !timingSafeEqual(Buffer.from(candidate), Buffer.from(token))) {
        socket.end('rejected');
        return;
      }
      socket.setTimeout(0);
      clients.add(socket);
      requestStop();
    });
    socket.on('end', () => { if (!handled) socket.end('rejected'); });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(address, resolve);
  });
  if (process.platform !== 'win32') chmodSync(address, 0o600);
  return async (success = true) => {
    for (const socket of sockets) if (!clients.has(socket)) socket.destroy();
    for (const socket of clients) socket.end(success ? 'stopped' : 'failed');
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  };
}

export function requestLocalStop(env) {
  const { address, token } = control(env);
  return new Promise((resolve, reject) => {
    const socket = createConnection(address);
    let reply = '';
    socket.setTimeout(120_000, () => socket.destroy(new Error('Local stop timed out; inspect the foreground terminal.')));
    socket.on('connect', () => socket.write(`${token}\n`));
    socket.on('data', chunk => { reply += chunk; });
    socket.on('end', () => {
      if (reply === 'stopped') { resolve(true); return; }
      reject(new Error(reply === 'rejected' ? 'Local supervisor rejected the Stop credentials.' :
        reply === 'failed' ? 'Local supervisor reported shutdown failure.' :
          'Local supervisor disconnected before confirming Stop.'));
    });
    socket.on('error', error => {
      if (!['ENOENT', 'ECONNREFUSED'].includes(error.code)) { reject(error); return; }
      if (process.platform !== 'win32' && error.code === 'ECONNREFUSED' && lstatSync(address).isSocket()) unlinkSync(address);
      resolve(false);
    });
  });
}
