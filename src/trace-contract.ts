import { z } from 'zod';

export const traceRecordSchema = z.object({
  traceId: z.string().regex(/^[a-f0-9]{32}$/),
  spanId: z.string().regex(/^[a-f0-9]{16}$/),
  parentSpanId: z.string().regex(/^[a-f0-9]{16}$/).optional(),
  name: z.string(),
  startedAt: z.string(),
  durationMs: z.number().nonnegative(),
  status: z.enum(['ok', 'error']),
  jobId: z.string().uuid().optional(),
});
export type TraceRecord = z.infer<typeof traceRecordSchema>;
export interface TraceParent { traceId: string; spanId: string }
