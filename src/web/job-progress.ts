export function watchJobProgress(options: {
  refresh: (signal: AbortSignal) => Promise<void>;
  available: () => boolean;
  report: (error?: unknown) => void;
  intervalMs: number;
}) {
  const controller = new AbortController();
  let delay = options.intervalMs;
  let timer: ReturnType<typeof setTimeout> | undefined;
  async function tick() {
    if (controller.signal.aborted) return;
    if (options.available()) {
      try {
        await options.refresh(controller.signal);
        if (!controller.signal.aborted) options.report();
        delay = options.intervalMs;
      } catch (error) {
        if (!controller.signal.aborted) options.report(error);
        delay = Math.min(30000, delay * 2);
      }
    }
    if (!controller.signal.aborted) timer = setTimeout(() => { void tick(); }, delay);
  }
  timer = setTimeout(() => { void tick(); }, delay);
  return () => { controller.abort(); if (timer) clearTimeout(timer); };
}
