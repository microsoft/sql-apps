import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { runtimeFor } from './workspace.mjs';

export const localSettingsSchema = z.strictObject({
  processing: z.boolean().default(true),
  automaticProgress: z.boolean().default(true),
  jobRetry: z.boolean().default(true),
  tracing: z.boolean().default(true),
  progressIntervalMs: z.number().int().min(1000).max(30000).default(2000),
  staleJobMinutes: z.number().int().min(5).max(10080).default(60),
  retentionDays: z.number().int().min(0).max(365).default(0),
  traceRetentionDays: z.number().int().min(1).max(30).default(7),
});
export type LocalSettings = z.infer<typeof localSettingsSchema>;

export async function readLocalSettings(): Promise<LocalSettings> {
  if (process.env.NODE_ENV === 'production') throw new Error('Local settings are disabled in production');
  try {
    return localSettingsSchema.parse(JSON.parse(await readFile(runtimeFor().settingsPath, 'utf8')));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return localSettingsSchema.parse({});
    throw new Error(`Invalid local settings: check ${runtimeFor().settingsPath} against local-settings.example.json`, { cause: error });
  }
}
