import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const { listenForStop } = await import(pathToFileURL(resolve(process.argv[2], 'scripts/runtime-control.mjs')));
const close = await listenForStop(process.env, async () => {
  await close(process.argv[3] !== 'fail');
  process.disconnect();
});
process.send('ready');
