import { readFile } from 'node:fs/promises';
import { Ajv } from 'ajv';
import addFormats from 'ajv-formats';

const url = 'https://raw.githubusercontent.com/Azure/data-api-builder/v2.0.12/schemas/dab.draft.schema.json';
const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`Pinned DAB schema download failed (${response.status})`);
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats.default(ajv);
const validate = ajv.compile(await response.json());
const files = process.argv.slice(2);
for (const path of files.length ? files : ['dab/dab-config.json']) {
  if (!validate(JSON.parse(await readFile(path, 'utf8')))) {
    console.error(`${path}: ${ajv.errorsText(validate.errors)}`);
    process.exitCode = 1;
  } else console.log(`${path}: DAB 2.0.12 JSON schema validation passed (database connectivity not tested).`);
}
