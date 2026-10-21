import assert from 'node:assert/strict';
import { isAbsolute } from 'node:path';

export function pluginCliCommand(host, entrypoint) {
  if (entrypoint !== undefined) {
    assert.ok(typeof entrypoint === 'string' && isAbsolute(entrypoint) &&
      !/\.(?:cmd|bat|ps1)$/i.test(entrypoint), 'Use an absolute native or Node CLI entrypoint, not an npm shell shim');
  }
  const command = entrypoint ?? host;
  const prefix = /\.(?:c|m)?js$/i.test(command) ? [command] : [];
  return { file: prefix.length ? process.execPath : command, prefix };
}
