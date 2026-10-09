import { createHash } from 'node:crypto';

export function analyzeFile(bytes: Buffer) {
  if (bytes.length > 4 * 1024 * 1024) throw new Error('File exceeds the 4 MiB processing limit');
  return {
    sha256: createHash('sha256').update(bytes).digest('hex'), byte_count: bytes.length,
    line_count: bytes.length === 0 ? 0 : bytes.toString('utf8').split(/\r\n|\r|\n/).length,
  };
}
