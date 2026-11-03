import { cp } from 'node:fs/promises';
import { basename } from 'node:path';

export async function copyStarter(directory) {
  await cp(new URL('../../skills/sql-apps/templates/starter/', import.meta.url), directory, {
    recursive: true,
    filter: source => {
      const name = basename(source);
      return !['node_modules', 'dist', '.local', '.deployment', '.npmrc'].includes(name) &&
        (!name.startsWith('.env') || name === '.env.example');
    },
  });
}
